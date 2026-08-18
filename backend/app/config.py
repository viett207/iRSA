from pydantic import field_validator
from pydantic_settings import BaseSettings,SettingsConfigDict
from functools import lru_cache
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # # Khai báo để Pydantic nhận diện
    # POSTGRES_USER: str
    # POSTGRES_PASSWORD: str
    # POSTGRES_DB: str

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://irsa:irsa@localhost:5432/irsa"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # JWT
    JWT_SECRET: str = "dev-secret-key-minimum-32-characters-long"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "resumes"
    MINIO_REGION: str = "ap-south-1"
    MINIO_SECURE: bool = False
    MINIO_PUBLIC_URL: str = "http://localhost:9000"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@irsa.local"
    EMAIL_FROM_NAME: str = "iRSA"

    # Frontend URLs
    FRONTEND_ADMIN_URL: str = "http://localhost:4200"
    FRONTEND_PORTAL_URL: str = "http://localhost:4300"

    # AI / Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEYS: str = ""

    @property
    def parsed_gemini_api_keys(self) -> list[str]:
        import os
        raw_keys = (
            self.GEMINI_API_KEYS
            or self.GEMINI_API_KEY
            or os.environ.get("GEMINI_API_KEYS", "")
            or os.environ.get("GEMINI_API_KEY", "")
        )
        if not raw_keys:
            return []
        keys = [k.strip() for k in raw_keys.replace("\n", ",").split(",") if k.strip()]
        return keys

    # Model name for embedding scoring (multilingual model supports Vietnamese)
    EMBEDDING_MODEL: str = "paraphrase-multilingual-MiniLM-L12-v2"

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False  # Set True only for development

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_mode(cls, value):
        """Tolerate common environment-mode values injected by process managers."""
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"development", "dev", "debug"}:
                return True
        return value

    # Cookie settings for JWT (HttpOnly cookies)
    COOKIE_SECURE: bool = False  # Set True in production (HTTPS only)
    COOKIE_SAMESITE: str = "lax"  # CSRF protection
    COOKIE_HTTPONLY: bool = True  # XSS protection
    COOKIE_DOMAIN: str = ""  # Empty = current domain

    # class Config:
    #     env_file = ".env"
    #     case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
