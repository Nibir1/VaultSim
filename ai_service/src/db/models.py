# ai_service/src/db/models.py

# Purpose: SQLAlchemy 2.0 ORM models for Scenarios, Users, and Conversation History.
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06
# Dependencies: sqlalchemy

from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

class Scenario(Base):
    """Defines the training scenario parameters and the hidden secret."""
    __tablename__ = 'scenarios'
    
    id = Column(String(50), primary_key=True)
    title = Column(String(100), nullable=False)
    persona_role = Column(String(100), nullable=False)
    system_prompt = Column(Text, nullable=False)
    hidden_secret = Column(Text, nullable=False)

class ChatHistory(Base):
    """Audit log of all interactions for evaluating the Judge agent and tracking user progress."""
    __tablename__ = 'chat_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), index=True, nullable=False)
    user_id = Column(String(100), index=True, nullable=False)
    sender = Column(String(20), nullable=False) # 'user' or 'persona'
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))