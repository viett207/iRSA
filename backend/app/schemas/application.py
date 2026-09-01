"""Application schemas for API requests/responses."""

from datetime import datetime
from pydantic import BaseModel


class ApplicationResponse(BaseModel):
    """Application response schema."""

    id: int
    job_id: int
    job_title: str
    job_slug: str
    job_department: str | None = None
    job_location: str | None = None
    resume_id: int
    resume_filename: str
    cover_letter: str | None = None
    public_status: str
    submitted_at: datetime
    resume_download_url: str | None = None

    class Config:
        from_attributes = True


class ApplicationStatusCounts(BaseModel):
    """Aggregate status counts across all applications."""

    in_review: int = 0
    shortlisted: int = 0
    not_selected: int = 0
    selected: int = 0


class ApplicationListResponse(BaseModel):
    """Application list response schema."""

    items: list[ApplicationResponse]
    total: int
    page: int
    size: int
    status_counts: ApplicationStatusCounts = ApplicationStatusCounts()


class ApplicationDetailResponse(ApplicationResponse):
    """Detailed application response (inherits resume_download_url from base)."""

    pass


class CandidateInterviewActionRequest(BaseModel):
    """Candidate response to interview invitation."""

    response: str  # accepted | declined | reschedule_requested
    note: str | None = None
    proposed_date: datetime | None = None


class InterviewInvitationResponse(BaseModel):
    """Interview invitation response schema for candidate portal."""

    id: int
    application_id: int
    job_id: int
    job_title: str
    job_slug: str
    job_department: str | None = None
    scheduler_name: str | None = None
    company_name: str | None = None
    interview_date: datetime
    interview_type: str
    location: str | None = None
    notes: str | None = None
    status: str
    candidate_response: str
    candidate_response_note: str | None = None
    candidate_proposed_date: datetime | None = None
    candidate_responded_at: datetime | None = None

    class Config:
        from_attributes = True


class InterviewInvitationListResponse(BaseModel):
    """List of interview invitations for candidate portal."""

    items: list[InterviewInvitationResponse]
    total: int
    page: int
    size: int

