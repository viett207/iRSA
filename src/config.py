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
    llm_provider: str = ""  # "groq", "gemini", "openai", or "" (auto-detect)
    openai_api_key: str = ""
    gemini_api_key: str = ""
    gemini_api_keys: str = ""
    groq_api_key: str = ""
    groq_api_keys: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
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
        keys = []
        for k in raw_keys.replace("\n", ",").split(","):
            k_clean = k.strip()
            if not k_clean or k_clean.lower() in {
                "your-api-key",
                "your_api_key",
                "your_gemini_api_key_here",
                "your-api-key-here",
            }:
                continue
            keys.append(k_clean)
        return keys

    @property
    def parsed_groq_api_keys(self) -> list[str]:
        import os
        raw_keys = (
            self.groq_api_keys
            or self.groq_api_key
            or os.environ.get("GROQ_API_KEYS", "")
            or os.environ.get("GROQ_API_KEY", "")
        )
        if not raw_keys:
            return []
        keys = []
        for k in raw_keys.replace("\n", ",").split(","):
            k_clean = k.strip()
            if not k_clean or k_clean.lower() in {
                "your-api-key",
                "your_api_key",
                "your_groq_api_key_here",
                "your-api-key-here",
                "gsk_your_key_here",
            }:
                continue
            keys.append(k_clean)
        return keys

    # Database & Vector Store (Supabase PostgreSQL Cloud)
    database_url: str = ""
    chroma_persist_dir: str = "./data/chroma"

    # Cache (Upstash Redis Cloud)
    cache_backend: Literal["memory", "redis"] = "memory"
    redis_url: str = ""

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
