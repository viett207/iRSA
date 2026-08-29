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
    """Recruitment metrics shown on the company profile."""

    total_jobs: int
    active_jobs: int
    total_applications: int
    in_progress_applications: int
    hr_members: int


class CompanyJobSummary(BaseModel):
    """A concise job representation for the company profile."""

    id: int
    title_vi: str
    department: str | None = None
    location: str | None = None
    employment_type: str | None = None
    status: str
    applications_count: int
    created_at: datetime
    application_deadline: date | None = None


class CompanyOverview(BaseModel):
    """Company information, recruitment metrics and its newest jobs."""

    company: CompanyResponse
    stats: CompanyOverviewStats
    jobs: list[CompanyJobSummary]
