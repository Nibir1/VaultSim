# ai_service/src/api/grpc_server.py

import sys
from pathlib import Path

# [WORKAROUND] Add current directory to sys.path to fix the Python gRPC compiler absolute import bug
sys.path.insert(0, str(Path(__file__).parent))

import grpc
import logging
from uuid import uuid4
from datetime import datetime, timezone, timedelta # <--- Added timedelta

import src.api.game_pb2 as game_pb2
import src.api.game_pb2_grpc as game_pb2_grpc
from src.agents.persona import PersonaAgent
from src.agents.judge import JudgeAgent
from src.db.session import SessionLocal
from src.db.models import ChatHistory, Scenario, GameSession, GameStatusEnum

logger = logging.getLogger(__name__)

class DualAgentService(game_pb2_grpc.DualAgentEngineServicer):
    
    def __init__(self):
        self.persona = PersonaAgent()
        self.judge = JudgeAgent()

    def ValidateSession(self, request, context):
        db = SessionLocal()
        try:
            scenario = db.query(Scenario).filter(Scenario.id == request.scenario_id).first()
            if not scenario:
                return game_pb2.SessionResponse(is_valid=False, error_message="Scenario not found", persona_role="")

            session = db.query(GameSession).filter(GameSession.session_id == request.session_id).first()
            if not session:
                session = GameSession(
                    session_id=request.session_id, 
                    user_id=request.user_id, 
                    scenario_id=request.scenario_id,
                    player_name=request.player_name or "Anonymous",
                    # FIX 1: Explicitly set the start time so it's never NULL
                    start_time=datetime.now(timezone.utc).replace(tzinfo=None) 
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
        db = SessionLocal()
        try:
            scenario = db.query(Scenario).filter(Scenario.id == request.scenario_id).first()
            if not scenario:
                context.abort(grpc.StatusCode.NOT_FOUND, f"Scenario {request.scenario_id} not found.")

            session = db.query(GameSession).filter(GameSession.session_id == request.session_id).first()
            
            if not session:
                session = GameSession(
                    session_id=request.session_id, 
                    user_id=request.user_id, 
                    scenario_id=request.scenario_id,
                    turn_count=0, 
                    player_name=request.player_name or "Anonymous",
                    # FIX 2: Explicitly set start time in the self-healing block too
                    start_time=datetime.now(timezone.utc).replace(tzinfo=None)
                )
                db.add(session)
                db.commit()
                db.refresh(session)

            session.turn_count += 1
            active_turn = session.turn_count

            user_msg = ChatHistory(
                session_id=request.session_id, user_id=request.user_id,
                sender="user", message=request.message, turn_count_at_time=active_turn
            )
            db.add(user_msg)
            
            try:
                reply_text = self.persona.generate_response(
                    role=scenario.persona_role, system_instruction=scenario.system_prompt,
                    hidden_story=scenario.hidden_story, user_message=request.message,
                    turn_count=active_turn
                )
            except Exception as e:
                logger.error(f"Persona Agent failed: {e}")
                context.abort(grpc.StatusCode.INTERNAL, "AI Engine Failure")

            persona_msg = ChatHistory(
                session_id=request.session_id, user_id=request.user_id,
                sender="persona", message=reply_text, turn_count_at_time=active_turn
            )
            db.add(persona_msg)
            db.commit() 

            pb_status = game_pb2.GameStatus.IN_PROGRESS
            if session.status == GameStatusEnum.VICTORY:
                pb_status = game_pb2.GameStatus.VICTORY

            event_id = str(uuid4())
            yield game_pb2.ChatResponse(
                event_id=event_id, persona_reply=reply_text, game_status=pb_status,
                clues_uncovered=session.clues_uncovered, judge_explanation="", turn_count=active_turn
            )

            try:
                evaluation = self.judge.evaluate(
                    user_message=request.message, persona_reply=reply_text,
                    required_clues=scenario.required_clues, already_uncovered_clues=session.clues_uncovered,
                    turn_count=active_turn
                )
                
                new_clues = evaluation["newly_uncovered_clues"]
                if new_clues:
                    session.clues_uncovered = list(set(session.clues_uncovered + new_clues))
                
                if evaluation["game_status"] == "VICTORY" and session.status != GameStatusEnum.VICTORY:
                    pb_status = game_pb2.GameStatus.VICTORY
                    
                    final_session = db.query(GameSession).filter(GameSession.session_id == request.session_id).first()
                    if final_session:
                        final_session.status = GameStatusEnum.VICTORY
                        safe_end = datetime.now(timezone.utc).replace(tzinfo=None)
                        
                        # FIX 3: Bulletproof defensive fallback
                        if final_session.start_time:
                            safe_start = final_session.start_time.replace(tzinfo=None)
                        else:
                            # If start_time is somehow still null, fallback to prevent crash
                            safe_start = safe_end - timedelta(seconds=120) 
                            
                        final_session.end_time = safe_end
                        final_session.duration_seconds = int((safe_end - safe_start).total_seconds())
                        
                        db.commit() # <--- Guaranteed to save now!

                judge_msg = ChatHistory(
                    session_id=request.session_id, user_id=request.user_id,
                    sender="judge", message=evaluation["explanation"], turn_count_at_time=active_turn
                )
                db.add(judge_msg)
                db.commit() 

                yield game_pb2.ChatResponse(
                    event_id=event_id, persona_reply="", game_status=pb_status,
                    clues_uncovered=session.clues_uncovered, judge_explanation=evaluation["explanation"], turn_count=active_turn
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

    def GetLeaderboard(self, request, context):
        db = SessionLocal()
        try:
            limit = request.limit if request.limit > 0 else 10
            
            fastest_sessions = (
                db.query(GameSession)
                .filter(
                    GameSession.scenario_id == request.scenario_id,
                    GameSession.duration_seconds.isnot(None) 
                )
                .order_by(GameSession.duration_seconds.asc())
                .limit(limit)
                .all()
            )
            
            entries = []
            for s in fastest_sessions:
                end_timestamp = int(s.end_time.timestamp()) if s.end_time else 0
                entries.append(game_pb2.LeaderboardEntry(
                    player_name=s.player_name or "Anonymous",
                    duration_seconds=s.duration_seconds,
                    turn_count=s.turn_count,
                    session_id=s.session_id,
                    end_time=end_timestamp
                ))
            
            return game_pb2.LeaderboardResponse(entries=entries)
            
        except Exception as e:
            logger.error(f"Database error in GetLeaderboard: {e}")
            context.abort(grpc.StatusCode.INTERNAL, "Failed to retrieve leaderboard")
        finally:
            db.close()