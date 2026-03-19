# ai_service/src/api/grpc_server.py

# Purpose: Python gRPC Servicer with Self-Healing Session Logic
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-19

import sys
from pathlib import Path

# [WORKAROUND] Add current directory to sys.path to fix the Python gRPC compiler absolute import bug
sys.path.insert(0, str(Path(__file__).parent))

import grpc
import logging
from uuid import uuid4

import src.api.game_pb2 as game_pb2
import src.api.game_pb2_grpc as game_pb2_grpc
from src.agents.persona import PersonaAgent
from src.agents.judge import JudgeAgent
from src.db.session import SessionLocal
from src.db.models import ChatHistory, Scenario, GameSession, GameStatusEnum

logger = logging.getLogger(__name__)

class DualAgentService(game_pb2_grpc.DualAgentEngineServicer):
    """Handles incoming gRPC streams from the Go Gateway and orchestrates the game loop."""
    
    def __init__(self):
        self.persona = PersonaAgent()
        self.judge = JudgeAgent()

    def ValidateSession(self, request, context):
        """Validates the scenario exists and initializes the GameSession in the DB."""
        db = SessionLocal()
        try:
            scenario = db.query(Scenario).filter(Scenario.id == request.scenario_id).first()
            if not scenario:
                return game_pb2.SessionResponse(is_valid=False, error_message="Scenario not found", persona_role="")

            # Ensure the GameSession exists in Postgres
            session = db.query(GameSession).filter(GameSession.session_id == request.session_id).first()
            if not session:
                session = GameSession(
                    session_id=request.session_id, 
                    user_id=request.user_id, 
                    scenario_id=request.scenario_id
                )
                db.add(session)
                db.commit()

            return game_pb2.SessionResponse(
                is_valid=True,
                error_message="",
                persona_role=scenario.persona_role
            )
        except Exception as e:
            logger.error(f"Error in ValidateSession: {e}")
            return game_pb2.SessionResponse(is_valid=False, error_message="Internal Server Error", persona_role="")
        finally:
            db.close()

    def ProcessChatEvent(self, request, context):
        """
        The core game loop. Invokes the Persona, yields the text, then evaluates clues.
        Includes self-healing logic to handle missing sessions.
        """
        db = SessionLocal()
        try:
            # 1. Fetch Scenario and Session
            scenario = db.query(Scenario).filter(Scenario.id == request.scenario_id).first()
            if not scenario:
                context.abort(grpc.StatusCode.NOT_FOUND, f"Scenario {request.scenario_id} not found.")

            session = db.query(GameSession).filter(GameSession.session_id == request.session_id).first()
            
            # --- SELF-HEALING START ---
            # If session doesn't exist (due to race condition), create it immediately
            if not session:
                logger.info(f"Race condition detected: Session {request.session_id} not found. Creating on-the-fly.")
                session = GameSession(
                    session_id=request.session_id, 
                    user_id=request.user_id, 
                    scenario_id=request.scenario_id,
                    turn_count=request.turn_count
                )
                db.add(session)
                db.commit()
                db.refresh(session)
            # --- SELF-HEALING END ---

            # Update Postgres with the authoritative turn count from Redis (via Go Gateway)
            session.turn_count = request.turn_count

            # 2. Log User Message
            user_msg = ChatHistory(
                session_id=request.session_id,
                user_id=request.user_id,
                sender="user",
                message=request.message,
                turn_count_at_time=request.turn_count
            )
            db.add(user_msg)
            
            # 3. Invoke Persona
            try:
                reply_text = self.persona.generate_response(
                    role=scenario.persona_role,
                    system_instruction=scenario.system_prompt,
                    hidden_story=scenario.hidden_story,
                    user_message=request.message,
                    turn_count=request.turn_count
                )
            except Exception as e:
                logger.error(f"Persona Agent failed: {e}")
                context.abort(grpc.StatusCode.INTERNAL, "AI Engine Failure")

            # Log Persona Reply
            persona_msg = ChatHistory(
                session_id=request.session_id,
                user_id=request.user_id,
                sender="persona",
                message=reply_text,
                turn_count_at_time=request.turn_count
            )
            db.add(persona_msg)
            db.commit()

            pb_status = game_pb2.GameStatus.IN_PROGRESS
            if session.status == GameStatusEnum.VICTORY:
                pb_status = game_pb2.GameStatus.VICTORY

            # 4. Stream Persona Reply immediately
            event_id = str(uuid4())
            yield game_pb2.ChatResponse(
                event_id=event_id,
                persona_reply=reply_text,
                game_status=pb_status,
                clues_uncovered=session.clues_uncovered,
                judge_explanation="",
                turn_count=request.turn_count
            )

            # 5. Invoke Judge
            try:
                evaluation = self.judge.evaluate(
                    user_message=request.message,
                    persona_reply=reply_text,
                    required_clues=scenario.required_clues,
                    already_uncovered_clues=session.clues_uncovered,
                    turn_count=request.turn_count
                )
                
                new_clues = evaluation["newly_uncovered_clues"]
                if new_clues:
                    session.clues_uncovered = list(set(session.clues_uncovered + new_clues))
                
                if evaluation["game_status"] == "VICTORY":
                    session.status = GameStatusEnum.VICTORY
                    pb_status = game_pb2.GameStatus.VICTORY

                judge_msg = ChatHistory(
                    session_id=request.session_id,
                    user_id=request.user_id,
                    sender="judge",
                    message=evaluation["explanation"],
                    turn_count_at_time=request.turn_count
                )
                db.add(judge_msg)
                db.commit()

                yield game_pb2.ChatResponse(
                    event_id=event_id,
                    persona_reply="", 
                    game_status=pb_status,
                    clues_uncovered=session.clues_uncovered,
                    judge_explanation=evaluation["explanation"],
                    turn_count=request.turn_count
                )
            except Exception as e:
                logger.error(f"Judge Agent failed: {e}")
                pass

        except Exception as e:
            db.rollback()
            logger.error(f"Database error in ProcessChatEvent: {e}")
            context.abort(grpc.StatusCode.INTERNAL, "Database error")
        finally:
            db.close()