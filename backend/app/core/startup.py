"""Startup validation for required environment variables."""
import sys
from app.config import get_settings

REQUIRED_PROD_VARS = [
    ("JWT_SECRET", 32, "JWT signing key"),
    ("MINIO_ACCESS_KEY", 1, "MinIO access key"),
    ("MINIO_SECRET_KEY", 8, "MinIO secret key"),
]

INSECURE_DEFAULTS = {
    "JWT_SECRET": "dev-secret-key-minimum-32-characters-long",
    "MINIO_ACCESS_KEY": "minioadmin",
    "MINIO_SECRET_KEY": "minioadmin",
}


def validate_environment() -> list[str]:
    """Validate required env vars. Returns list of errors."""
    settings = get_settings()
    errors = []

    # Skip validation in development with explicit DEBUG=True
    if settings.DEBUG and settings.ENVIRONMENT == "development":
        return errors

    for var_name, min_len, description in REQUIRED_PROD_VARS:
        value = getattr(settings, var_name, "")

        # Check if using insecure default
        if value == INSECURE_DEFAULTS.get(var_name):
            errors.append(f"{var_name}: Using insecure default value")

        # Check minimum length
        if len(value) < min_len:
            errors.append(f"{var_name}: Must be at least {min_len} characters")

    return errors


def ensure_secure_startup():
    """Fail startup if environment is insecure."""
    errors = validate_environment()
    if errors:
        print("\n=== SECURITY ERROR: Environment validation failed ===")
        for error in errors:
            print(f"  - {error}")
        print("\nSet required variables in .env or set DEBUG=true for development")
        print("===================================================\n")
        sys.exit(1)
