from datetime import datetime
from pydantic import BaseModel, Field


class CompanyBase(BaseModel):
    """Base company schema."""

    company_code: str = Field(..., min_length=2, max_length=50)
    company_name: str = Field(..., min_length=2, max_length=255)
    location: str | None = Field(None, max_length=255)
    industry: str | None = Field(None, max_length=255)


class CompanyCreate(CompanyBase):
    """Schema for creating a company."""

    pass


class CompanyUpdate(BaseModel):
    """Schema for updating a company."""

    company_name: str | None = Field(None, min_length=2, max_length=255)
    location: str | None = Field(None, max_length=255)
    industry: str | None = Field(None, max_length=255)


class CompanyResponse(CompanyBase):
    """Company response schema."""

    id: int
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class CompanyList(BaseModel):
    """Paginated company list response."""

    items: list[CompanyResponse]
    total: int
    page: int
    page_size: int
    pages: int
