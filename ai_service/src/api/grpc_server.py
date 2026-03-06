# ai_service/src/api/grpc_server.py

# Purpose: Python gRPC Servicer implementing the DualAgentEngine contract.
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06
# Dependencies: grpc, src.api.game_pb2, src.api.game_pb2_grpc

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
from src.db.models import ChatHistory, Scenario

logger = logging.getLogger(__name__)

class DualAgentService(game_pb2_grpc.DualAgentEngineServicer):
    """Handles incoming gRPC streams from the Go Gateway."""
    
    def __init__(self):
        self.persona = PersonaAgent()
        self.judge = JudgeAgent()

    def ValidateSession(self, request, context):
        """Mocks session validation. In production, fetches Scenario from DB."""
        return game_pb2.SessionResponse(
            is_valid=True,
            error_message="",
            persona_role="Finance Intern"
        )

    def ProcessChatEvent(self, request, context):
        """
        Streams responses back to Go. First yields the Persona's text, 
        then evaluates and yields the Judge's score.
        """
        db = SessionLocal()
        try:
            # 1. Log User Message
            user_msg = ChatHistory(
                session_id=request.session_id,
                user_id=request.user_id,
                sender="user",
                message=request.message
            )
            db.add(user_msg)
            
            # TODO in Production: Fetch actual Scenario from DB. Hardcoded for test.
            role = "Finance Intern"
            instruction = "You are nervous but loyal. You know the password is 'Password123'."
            secret = "The admin password is 'Password123'"

            # 2. Invoke Persona
            try:
                reply_text = self.persona.generate_response(role, instruction, secret, request.message)
            except Exception as e:
                logger.error(f"Persona Agent failed: {e}")
                context.abort(grpc.StatusCode.INTERNAL, "AI Engine Failure")

            # Log Persona Reply
            persona_msg = ChatHistory(
                session_id=request.session_id,
                user_id=request.user_id,
                sender="persona",
                message=reply_text
            )
            db.add(persona_msg)
            db.commit()

            # 3. Stream Persona Reply immediately
            event_id = str(uuid4())
            yield game_pb2.ChatResponse(
                event_id=event_id,
                persona_reply=reply_text,
                secret_revealed=False,
                score_delta=0,
                judge_explanation=""
            )

            # 4. Invoke Judge Asynchronously (Simulated in stream)
            try:
                evaluation = self.judge.evaluate(secret, request.message, reply_text)
                
                # Stream Judge Evaluation update
                yield game_pb2.ChatResponse(
                    event_id=event_id,
                    persona_reply="", # Empty because we already sent it
                    secret_revealed=evaluation.secret_revealed,
                    score_delta=evaluation.score_delta,
                    judge_explanation=evaluation.explanation
                )
            except Exception as e:
                logger.error(f"Judge Agent failed: {e}")
                # We don't abort here because the user already got the persona's reply.
                pass

        except Exception as e:
            db.rollback()
            logger.error(f"Database error in ProcessChatEvent: {e}")
            context.abort(grpc.StatusCode.INTERNAL, "Database error")
        finally:
            db.close()