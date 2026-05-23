import os
from pathlib import Path
from pydantic_settings import BaseSettings

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
    AI_PROVIDER: str = "online"
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
