# ai_service/src/db/session.py

# Purpose: SQLAlchemy engine and session management.
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06
# Dependencies: sqlalchemy, ai_service/src/core/config.py, ai_service/src/db/models.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from src.core.config import settings
from src.db.models import Base
import logging

logger = logging.getLogger(__name__)

# Initialize synchronous engine
try:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,  # Verifies connections before using them
        pool_size=10,
        max_overflow=20
    )
    # Automatically create tables for local development. 
    # In production, we would use Alembic migrations.
    Base.metadata.create_all(bind=engine)
    logger.info("Database connected and tables verified.")
except OperationalError as e:
    logger.error(f"Failed to connect to the database. Ensure Postgres is running: {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Yields a database session and ensures it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()