# ai_service/src/core/config.py

# Purpose: Centralized environment configuration loader with strict Pydantic v2 validation.
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06
# Dependencies: pydantic_settings

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

class Settings(BaseSettings):
    """
    Validates and holds all environment variables for the AI Service.
    Uses strict typing to prevent misconfiguration.
    """
    postgres_user: str = "vaultadmin"
    postgres_password: str = "localdevpassword"
    postgres_db: str = "vaultsim"
    postgres_host: str = "localhost"
    postgres_port: str = "5432"
    
    ai_service_port: int = 50051
    openai_api_key: SecretStr
    llm_model_persona: str = "gpt-4o-mini"
    llm_model_judge: str = "gpt-4o-mini"

    # Enforce loading from the root .env file if it exists
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    @property
    def database_url(self) -> str:
        """Constructs the SQLAlchemy connection string."""
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

# Global singleton for settings
settings = Settings()