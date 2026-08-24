from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "iRSA AI Evaluation Agent"
    app_env: Literal["development", "production", "test"] = "development"
    app_port: int = Field(default=8000, ge=1, le=65535)
    app_host: str = "0.0.0.0"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    cors_origins: str = "http://localhost:4200,http://localhost:4300"

    # LLM & Agent
    openai_api_key: str = ""
    gemini_api_key: str = ""
    gemini_api_keys: str = ""
    deepseek_api_key: str = ""
    model_name: str = "gemini-3.6-flash"
    llm_temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"

    @property
    def parsed_gemini_api_keys(self) -> list[str]:
        import os
        raw_keys = (
            self.gemini_api_keys
            or self.gemini_api_key
            or os.environ.get("GEMINI_API_KEYS", "")
            or os.environ.get("GEMINI_API_KEY", "")
        )
        if not raw_keys:
            return []
        keys = [
            k.strip()
            for k in raw_keys.replace("\n", ",").split(",")
            if k.strip() and k.strip().lower() not in {"your-api-key", "your_api_key", "your_gemini_api_key_here", "your-api-key-here"}
        ]
        return keys

    # Database & Vector Store
    database_url: str = "postgresql+asyncpg://irsa:272003@localhost:5432/irsa"
    chroma_persist_dir: str = "./data/chroma"

    # Cache
    cache_backend: Literal["memory", "redis"] = "memory"
    redis_url: str = "redis://localhost:6379/0"

    # Frontends
    frontend_admin_url: str = "http://localhost:4200"
    frontend_portal_url: str = "http://localhost:4300"

    # Email SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from_name: str = "P-164 Recruitment"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
