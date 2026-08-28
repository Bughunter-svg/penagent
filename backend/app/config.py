from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"
REPORTS_DIR = DATA_DIR / "reports"
DB_FILE = DATA_DIR / "penagent.db"
DEFAULT_DATABASE_URL = f"sqlite+aiosqlite:///{DB_FILE}"

for directory in (DATA_DIR, UPLOADS_DIR, REPORTS_DIR):
    directory.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    DATABASE_URL: str = DEFAULT_DATABASE_URL
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    LOG_LEVEL: str = "INFO"
    UPLOAD_DIR: str = str(UPLOADS_DIR)
    MAX_CONCURRENT_JOBS: int = 3
    DEFAULT_RATE_LIMIT: int = 50
    DEFAULT_TIMEOUT: int = 300

    model_config = {"env_file": str(ROOT_DIR / ".env"), "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def resolve_database_url(cls, value: str | None) -> str:
        if value and value.startswith("sqlite") and ":///" in value:
            db_path = value.split(":///", 1)[1]
            if db_path.startswith("/"):
                Path(db_path).parent.mkdir(parents=True, exist_ok=True)
                return value
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        return DEFAULT_DATABASE_URL


@lru_cache()
def get_settings() -> Settings:
    return Settings()
