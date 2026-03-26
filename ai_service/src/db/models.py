# ai_service/src/db/models.py

# Purpose: SQLAlchemy 2.0 ORM models for Gamified Scenarios, Sessions, and History.
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-25
# Dependencies: sqlalchemy

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone
import enum

Base = declarative_base()

class GameStatusEnum(enum.Enum):
    """Tracks the current state of a user's scenario playthrough."""
    IN_PROGRESS = "IN_PROGRESS"
    VICTORY = "VICTORY"
    DEFEAT = "DEFEAT"

class Scenario(Base):
    """Defines the educational scenario parameters, hidden story, and required clues."""
    __tablename__ = 'scenarios'
    
    id = Column(String(50), primary_key=True) # e.g., "wandering_usb"
    title = Column(String(100), nullable=False)
    persona_role = Column(String(100), nullable=False)
    system_prompt = Column(Text, nullable=False)
    
    # Replaced 'hidden_secret' with 'hidden_story' for the narrative approach
    hidden_story = Column(Text, nullable=False)
    
    # JSON array of strings: The specific questions/facts the user must uncover
    required_clues = Column(JSON, nullable=False, default=list)

    # Relationships
    sessions = relationship("GameSession", back_populates="scenario")

class GameSession(Base):
    """The 'Save File' for a user's playthrough. Tracks clues, turns, win states, and Leaderboard timing."""
    __tablename__ = 'game_sessions'

    session_id = Column(String(100), primary_key=True)
    user_id = Column(String(100), index=True, nullable=False)
    scenario_id = Column(String(50), ForeignKey('scenarios.id'), nullable=False)
    
    # Leaderboard & Identity Tracking
    player_name = Column(String(100), nullable=True, default="Anonymous")
    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, index=True, nullable=True) # Indexed for fast O(1) leaderboard sorting
    
    # State Tracking (Synced via gRPC)
    turn_count = Column(Integer, default=0, nullable=False)
    clues_uncovered = Column(JSON, default=list, nullable=False) 
    status = Column(Enum(GameStatusEnum), default=GameStatusEnum.IN_PROGRESS, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    scenario = relationship("Scenario", back_populates="sessions")
    chat_history = relationship("ChatHistory", back_populates="session", cascade="all, delete-orphan")

class ChatHistory(Base):
    """Audit log of all interactions for evaluating the Judge agent and tracking user progress."""
    __tablename__ = 'chat_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), ForeignKey('game_sessions.session_id'), index=True, nullable=False)
    user_id = Column(String(100), index=True, nullable=False)
    sender = Column(String(20), nullable=False) # 'user', 'persona', or 'judge'
    message = Column(Text, nullable=False)
    
    # Track the turn count at the moment this message was sent
    turn_count_at_time = Column(Integer, default=0)
    
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    session = relationship("GameSession", back_populates="chat_history")