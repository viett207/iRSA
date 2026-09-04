from datetime import date, datetime
from pydantic import BaseModel, Field


class CompanyBase(BaseModel):
    """Base company schema."""

    company_code: str = Field(..., min_length=2, max_length=50)
    company_name: str = Field(..., min_length=2, max_length=255)
    location: str | None = Field(None, max_length=255)
    industry: str | None = Field(None, max_length=255)
    description: str | None = Field(None, max_length=2000)


class CompanyCreate(CompanyBase):
    """Schema for creating a company."""

    pass


class CompanyUpdate(BaseModel):
    """Schema for updating a company."""

    company_name: str | None = Field(None, min_length=2, max_length=255)
    location: str | None = Field(None, max_length=255)
    industry: str | None = Field(None, max_length=255)
    description: str | None = Field(None, max_length=2000)


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


class CompanyOverviewStats(BaseModel):
    """Statistics for company overview."""

    total_jobs: int = 0
    active_jobs: int = 0
    total_applications: int = 0
    in_progress_applications: int = 0
    hr_members: int = 0


class CompanyJobSummary(BaseModel):
    """Summary of a job posting for company overview."""

    id: int
    slug: str | None = None
    title_vi: str
    department: str | None = None
    location: str | None = None
    employment_type: str | None = None
    status: str
    applications_count: int = 0
    created_at: datetime
    application_deadline: datetime | date | None = None
    salary_min: int | None = None
    salary_max: int | None = None

    class Config:
        from_attributes = True


class CompanyOverviewResponse(BaseModel):
    """Full overview of a company."""

    company: CompanyResponse
    stats: CompanyOverviewStats
    jobs: list[CompanyJobSummary]
    # Top-level helper fields for backward compatibility
    company_code: str | None = None
    company_name: str | None = None
    location: str | None = None
    industry: str | None = None
    description: str | None = None
    total_jobs: int = 0

    class Config:
        from_attributes = True


# Alias for compatibility
CompanyOverview = CompanyOverviewResponse


class PublicCompanyItem(BaseModel):
    """Public company listing item."""

    id: int
    company_code: str
    company_name: str
    location: str | None = None
    industry: str | None = None
    description: str | None = None
    active_jobs_count: int = 0
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class PublicCompanyListResponse(BaseModel):
    """Paginated public company list."""

    items: list[PublicCompanyItem]
    total: int
    page: int
    page_size: int
    pages: int
