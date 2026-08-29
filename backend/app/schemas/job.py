"""Job schemas for API request/response validation."""

from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator


def _validate_string_list(v: list, max_items: int = 50, max_item_len: int = 100) -> list[str]:
    """Validate list of strings with size limits."""
    if not isinstance(v, list):
        raise ValueError("Must be a list")
    if len(v) > max_items:
        raise ValueError(f"Max {max_items} items allowed")
    return [str(item)[:max_item_len].strip() for item in v if item]


class JobCriteriaBase(BaseModel):
    """Base schema for job requirements criteria."""

    must_have_skills: list[str] = []
    nice_to_have_skills: list[str] = []
    min_experience_years: int = Field(default=0, ge=0, le=50)
    max_experience_years: int | None = Field(None, ge=0, le=50)
    min_education: str | None = Field(
        None, pattern="^(high_school|bachelor|master|phd)$"
    )

    # Scoring weights (must sum to 100)
    weight_skills: int = Field(default=60, ge=0, le=100)
    weight_experience: int = Field(default=30, ge=0, le=100)
    weight_education: int = Field(default=10, ge=0, le=100)

    @field_validator("must_have_skills", "nice_to_have_skills")
    @classmethod
    def validate_skill_lists(cls, v: list) -> list[str]:
        return _validate_string_list(v, max_items=50, max_item_len=100)

    @field_validator("weight_education")
    @classmethod
    def validate_weights_sum(cls, v: int, info) -> int:
        skills = info.data.get("weight_skills", 60)
        experience = info.data.get("weight_experience", 30)
        if skills + experience + v != 100:
            raise ValueError("Weights must sum to 100")
        return v


class JobCriteriaResponse(JobCriteriaBase):
    """Response schema for job criteria."""

    id: int

    class Config:
        from_attributes = True


class JobCreate(BaseModel):
    """Schema for creating a job."""

    # Vietnamese (required)
    title_vi: str = Field(..., min_length=1, max_length=255)
    description_vi: str | None = Field(None, max_length=50000)
    requirements_vi: str | None = Field(None, max_length=50000)

    # Common fields
    company_code: str | None = Field(None, min_length=2, max_length=50)
    department: str | None = Field(None, max_length=255)
    location: str | None = Field(None, max_length=255)
    employment_type: str | None = Field(
        None, pattern="^(full_time|part_time|contract|internship)$"
    )
    salary_min: int | None = Field(None, ge=0, le=999, description="Min salary in millions VND")
    salary_max: int | None = Field(None, ge=0, le=999, description="Max salary in millions VND")
    application_deadline: date | None = None

    # Criteria
    criteria: JobCriteriaBase | None = None


class JobUpdate(BaseModel):
    """Schema for updating a job."""

    # Vietnamese
    title_vi: str | None = Field(None, min_length=1, max_length=255)
    description_vi: str | None = Field(None, max_length=50000)
    requirements_vi: str | None = Field(None, max_length=50000)

    # Common fields
    company_code: str | None = Field(None, min_length=2, max_length=50)
    department: str | None = Field(None, max_length=255)
    location: str | None = Field(None, max_length=255)
    employment_type: str | None = Field(
        None, pattern="^(full_time|part_time|contract|internship)$"
    )
    salary_min: int | None = Field(None, ge=0, le=999, description="Min salary in millions VND")
    salary_max: int | None = Field(None, ge=0, le=999, description="Max salary in millions VND")
    application_deadline: date | None = None

    # Criteria
    criteria: JobCriteriaBase | None = None


class JobResponse(BaseModel):
    """Response schema for a single job."""

    id: int

    # Vietnamese
    title_vi: str
    description_vi: str | None = None
    requirements_vi: str | None = None

    # Common fields
    slug: str
    company_code: str | None = None
    company_name: str | None = None
    department: str | None = None
    location: str | None = None
    employment_type: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None

    # Status
    status: str
    is_published: bool
    published_at: datetime | None = None
    application_deadline: date | None = None

    # Creator/Approver info
    created_by: int
    creator_name: str
    approved_by: int | None = None
    approver_name: str | None = None
    approved_at: datetime | None = None

    # Related
    criteria: JobCriteriaResponse | None = None
    applications_count: int = 0

    # Timestamps
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    """Paginated job list response."""

    items: list[JobResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ApprovalRequest(BaseModel):
    """Schema for approving a job."""

    comment: str | None = Field(None, max_length=1000)


class RejectionRequest(BaseModel):
    """Schema for rejecting a job."""

    reason: str = Field(..., min_length=1, max_length=1000)


# Public job schemas (for job portal)
class PublicJobResponse(BaseModel):
    """Public job response for candidates (no sensitive HR info)."""

    id: int
    slug: str

    # Vietnamese
    title_vi: str
    description_vi: str | None = None
    requirements_vi: str | None = None

    # Common fields
    department: str | None = None
    location: str | None = None
    employment_type: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    application_deadline: date | None = None
    published_at: datetime | None = None

    # Hiring company — exposed so candidates can view the company profile
    company_name: str | None = None
    company_code: str | None = None

    # Simplified criteria
    must_have_skills: list[str] = []
    nice_to_have_skills: list[str] = []
    min_experience_years: int = 0
    max_experience_years: int | None = None
    min_education: str | None = None

    class Config:
        from_attributes = True


class PublicJobListItem(BaseModel):
    """Simplified job item for listing."""

    id: int
    slug: str
    title_vi: str
    department: str | None = None
    location: str | None = None
    employment_type: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    published_at: datetime | None = None
    application_deadline: date | None = None
    applications_count: int = 0
    must_have_skills: list[str] = []
    min_experience_years: int | None = None
    max_experience_years: int | None = None
    company_name: str | None = None
    company_code: str | None = None
    description_vi: str | None = None

    class Config:
        from_attributes = True


class PublicJobListResponse(BaseModel):
    """Paginated public job list."""

    items: list[PublicJobListItem]
    total: int
    page: int
    size: int
