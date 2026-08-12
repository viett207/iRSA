"""Resume schemas for API requests/responses."""

from datetime import datetime
from pydantic import BaseModel


class ResumeResponse(BaseModel):
    """Resume response schema."""

    id: int
    original_filename: str
    file_size: int
    content_type: str
    is_default: bool
    uploaded_at: datetime
    download_url: str | None = None

    class Config:
        from_attributes = True


class ResumeListResponse(BaseModel):
    """Resume list response schema."""

    items: list[ResumeResponse]
    total: int
