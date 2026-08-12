import os
from typing import Annotated

from email_validator import validate_email, EmailNotValidError
from pydantic import AfterValidator, BaseModel, Field


def validate_email_allow_local(v: str) -> str:
    """Validate email, allowing .local domains in development."""
    is_dev = os.getenv("ENVIRONMENT", "development") == "development"

    if is_dev and v.endswith((".local", ".test", ".example", ".localhost")):
        import re
        if re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            return v.lower().strip()
        raise ValueError("Invalid email format")

    try:
        result = validate_email(v, check_deliverability=not is_dev)
        return result.normalized
    except EmailNotValidError as e:
        raise ValueError(str(e)) from e


# Use relaxed validation in dev, strict in production
DevEmail = Annotated[str, AfterValidator(validate_email_allow_local)]


class LoginRequest(BaseModel):
    """Login request schema."""

    email: DevEmail
    password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    """Token response schema."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    """Register request schema for candidates."""

    email: DevEmail
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str | None = Field(None, max_length=50)


class HRRegisterRequest(BaseModel):
    """Register request schema for HR staff (requires admin approval)."""

    email: DevEmail
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str | None = Field(None, max_length=50)
    company_code: str = Field(..., min_length=2, max_length=50)


class RefreshRequest(BaseModel):
    """Refresh token request schema."""

    refresh_token: str | None = None  # Optional - can use cookie instead


class VerifyEmailRequest(BaseModel):
    """Email verification request schema."""

    token: str


class ResendVerificationRequest(BaseModel):
    """Resend verification email request schema."""

    email: DevEmail


class ForgotPasswordRequest(BaseModel):
    """Request to send password reset email."""

    email: DevEmail


class ResetPasswordRequest(BaseModel):
    """Request to reset password with token."""

    token: str
    new_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    """Standard response for simple message endpoints."""

    message: str
