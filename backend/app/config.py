from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:////home/harshu/penagent/backend/data/penagent.db"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    LOG_LEVEL: str = "INFO"
    UPLOAD_DIR: str = "./uploads"
    MAX_CONCURRENT_JOBS: int = 3
    DEFAULT_RATE_LIMIT: int = 50
    DEFAULT_TIMEOUT: int = 300

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
