from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.auth import DevEmail


class UserBase(BaseModel):
    """Base user schema."""

    email: DevEmail
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str | None = Field(None, max_length=50)


class UserCreate(UserBase):
    """Schema for creating a user (admin only)."""

    password: str = Field(..., min_length=8)
    role: str = Field(..., pattern="^(candidate|recruiter|leader|admin)$")
    company_code: str | None = Field(None, max_length=50)


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    full_name: str | None = Field(None, min_length=2, max_length=255)
    phone: str | None = Field(None, max_length=50)
    avatar_url: str | None = Field(None, max_length=500)
    is_active: bool | None = None
    role: str | None = Field(None, pattern="^(candidate|recruiter|leader|admin)$")
    password: str | None = Field(None, min_length=8)
    company_code: str | None = Field(None, max_length=50)


class UserResponse(UserBase):
    """User response schema."""

    id: int
    role: str
    avatar_url: str | None = None
    is_active: bool
    email_verified: bool = False
    company_code: str | None = None
    approval_status: str = "none"
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class UserList(BaseModel):
    """Paginated user list response."""

    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    pages: int
