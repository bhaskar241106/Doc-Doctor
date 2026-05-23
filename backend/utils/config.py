import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import BaseModel
from typing import Literal, Optional

class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_LLM_MODEL: str = "qwen2.5-coder:7b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    CHROMADB_DIR: str = "./data/chromadb"
    METADATA_DB_PATH: str = "./data/metadata.db"
    CLONE_DIR: str = "./data/repos"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Switchable Hybrid configs
    AI_PROVIDER: str = "local"
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_LLM_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBED_MODEL: str = "text-embedding-3-small"
    OFFLINE_MODE: bool = False

    class Config:
        env_file = Path(__file__).parent.parent / ".env"
        env_file_encoding = "utf-8"

# Load settings singleton
settings = Settings()

# Ensure directories exist
os.makedirs(os.path.dirname(settings.METADATA_DB_PATH), exist_ok=True)
os.makedirs(settings.CHROMADB_DIR, exist_ok=True)
os.makedirs(settings.CLONE_DIR, exist_ok=True)

# ----------------- SINGLE SOURCE OF TRUTH FOR RUNTIME SETTINGS -----------------
class AISettings(BaseModel):
    provider: Literal["local", "openai"]
    offline_mode: bool
    openai_api_key: Optional[str] = None
    ollama_base_url: str

def get_ai_settings() -> AISettings:
    """
    Centralized getter for current runtime settings.
    Dynamically loads state from the SQLite system_settings table with .env fallbacks.
    Avoids circular imports by importing the database module inside the function.
    """
    try:
        from backend.services.db_service import db
        provider_str = db.get_setting("ai_provider", settings.AI_PROVIDER)
        openai_api_key = db.get_setting("openai_api_key", settings.OPENAI_API_KEY)
        offline_mode_str = db.get_setting("offline_mode", str(settings.OFFLINE_MODE)).lower()
    except (ImportError, Exception):
        # Fallback for testing/standalone script runs where db service isn't loaded
        provider_str = settings.AI_PROVIDER
        openai_api_key = settings.OPENAI_API_KEY
        offline_mode_str = str(settings.OFFLINE_MODE).lower()

    # Standardize provider to Literal["local", "openai"]
    if provider_str == "online":
        provider_str = "openai"
    elif provider_str not in ("local", "openai"):
        provider_str = "local"

    offline_mode = offline_mode_str in ("1", "true", "yes", "on")

    return AISettings(
        provider=provider_str,
        offline_mode=offline_mode,
        openai_api_key=openai_api_key if openai_api_key else None,
        ollama_base_url=settings.OLLAMA_BASE_URL
    )

def update_ai_settings(
    provider: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    offline_mode: Optional[bool] = None
) -> AISettings:
    """
    Centralized setter for current runtime settings.
    Updates the system_settings table in the SQLite database and returns the new settings object.
    """
    from backend.services.db_service import db

    if provider is not None:
        # Normalize online to openai for internal state consistency
        if provider == "online":
            provider = "openai"
        db.set_setting("ai_provider", provider)

    if openai_api_key is not None:
        db.set_setting("openai_api_key", openai_api_key)

    if offline_mode is not None:
        db.set_setting("offline_mode", str(offline_mode).lower())

    return get_ai_settings()
