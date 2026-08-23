"""Job API endpoints for CRUD and workflow operations."""

from fastapi import APIRouter, Query

from app.api.deps import DBSession, CurrentUser, HRUser, require_roles
from app.schemas.job import (
    JobCreate,
    JobUpdate,
    JobResponse,
    JobListResponse,
    ApprovalRequest,
    RejectionRequest,
)
from app.services.job import JobService

router = APIRouter()


@router.get("", response_model=JobListResponse)
async def list_jobs(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(
        None,
        pattern="^(draft|pending_approval|approved|rejected|active|closed)$",
    ),
    department: str | None = Query(None),
    location: str | None = Query(None),
    employment_type: str | None = Query(None),
    salary_min: int | None = Query(None),
    salary_max: int | None = Query(None),
    min_experience: int | None = Query(None),
    max_experience: int | None = Query(None),
    has_applications: bool | None = Query(None),
    search: str | None = Query(None),
    created_by: int | None = Query(None),
    order_by: str = Query("newest", pattern="^(newest|oldest|applicants_desc|salary_desc|salary_asc)$"),
):
    """List jobs with comprehensive search and filtering."""
    # HR users see jobs from same company, admin sees all
    company_code = None
    if current_user.role in ("recruiter", "leader") and current_user.company_code:
        company_code = current_user.company_code

    service = JobService(db)
    return await service.list_jobs(
        page=page,
        page_size=page_size,
        status=status,
        created_by=created_by,
        department=department,
        location=location,
        employment_type=employment_type,
        salary_min=salary_min,
        salary_max=salary_max,
        min_experience=min_experience,
        max_experience=max_experience,
        has_applications=has_applications,
        company_code=company_code,
        search=search,
        order_by=order_by,
    )


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(data: JobCreate, db: DBSession, current_user: HRUser):
    """Create a new job (recruiter/admin only)."""
    service = JobService(db)
    return await service.create_job(data, current_user.id)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: DBSession, current_user: CurrentUser):
    """Get job by ID."""
    service = JobService(db)
    return await service.get_job_response(job_id)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    data: JobUpdate,
    db: DBSession,
    current_user: HRUser,
):
    """Update job (only draft/rejected status)."""
    service = JobService(db)
    return await service.update_job(job_id, data, current_user)


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: int, db: DBSession, current_user: HRUser):
    """Delete job (only draft status)."""
    service = JobService(db)
    await service.delete_job(job_id, current_user)


@router.post("/{job_id}/submit", response_model=JobResponse)
async def submit_job(job_id: int, db: DBSession, current_user: HRUser):
    """Submit job for approval."""
    service = JobService(db)
    return await service.submit_job(job_id, current_user)


@router.post("/{job_id}/approve", response_model=JobResponse)
async def approve_job(
    job_id: int,
    data: ApprovalRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """Approve job (leader/admin only)."""
    service = JobService(db)
    return await service.approve_job(job_id, current_user, data.comment)


@router.post("/{job_id}/reject", response_model=JobResponse)
async def reject_job(
    job_id: int,
    data: RejectionRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """Reject job with reason (leader/admin only)."""
    service = JobService(db)
    return await service.reject_job(job_id, current_user, data.reason)


@router.post("/{job_id}/publish", response_model=JobResponse)
async def publish_job(job_id: int, db: DBSession, current_user: HRUser):
    """Publish approved job to portal."""
    service = JobService(db)
    return await service.publish_job(job_id, current_user)


@router.post("/{job_id}/unpublish", response_model=JobResponse)
async def unpublish_job(job_id: int, db: DBSession, current_user: HRUser):
    """Unpublish active job (back to approved)."""
    service = JobService(db)
    return await service.unpublish_job(job_id, current_user)


@router.post("/{job_id}/close", response_model=JobResponse)
async def close_job(job_id: int, db: DBSession, current_user: HRUser):
    """Close active job (no more applications)."""
    service = JobService(db)
    return await service.close_job(job_id, current_user)
