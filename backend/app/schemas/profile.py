"""Profile schemas for API requests/responses."""

from pydantic import BaseModel


class ProfileUpdate(BaseModel):
    """Profile update schema."""

    full_name: str | None = None
    phone: str | None = None
    headline: str | None = None
    summary: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    portfolio_url: str | None = None


class ProfileResponse(BaseModel):
    """Profile response schema."""

    id: int
    email: str
    full_name: str
    phone: str | None = None
    avatar_url: str | None = None
    headline: str | None = None
    summary: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    portfolio_url: str | None = None

    class Config:
        from_attributes = True
