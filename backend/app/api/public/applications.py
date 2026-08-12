"""Application endpoints for candidates."""

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from io import BytesIO

from app.api.deps import DBSession, CandidateUser
from app.schemas.application import (
    ApplicationResponse,
    ApplicationListResponse,
    ApplicationDetailResponse,
    ApplicationStatusCounts,
)
from app.services.application import ApplicationService
from app.services.storage import get_storage_service

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/applied-job-ids", response_model=list[int])
async def get_applied_job_ids(
    db: DBSession,
    user: CandidateUser,
):
    """Return list of job IDs the current user has applied to."""
    service = ApplicationService(db)
    return await service.get_applied_job_ids(user.id)


@router.get("", response_model=ApplicationListResponse)
async def list_my_applications(
    db: DBSession,
    user: CandidateUser,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
):
    """List current user's applications."""
    service = ApplicationService(db)
    applications, total, raw_counts = await service.list_by_user(user.id, page, size)

    items = [
        ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            job_title=app.job.title_vi,
            job_slug=app.job.slug,
            job_department=app.job.department,
            job_location=app.job.location,
            resume_id=app.resume_id,
            resume_filename=app.resume.original_filename,
            cover_letter=app.cover_letter,
            public_status=app.public_status,
            submitted_at=app.submitted_at,
            resume_download_url=f"/pub/applications/{app.id}/resume",
        )
        for app in applications
    ]

    return ApplicationListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        status_counts=ApplicationStatusCounts(
            in_review=raw_counts.get("in_review", 0),
            shortlisted=raw_counts.get("shortlisted", 0),
            not_selected=raw_counts.get("not_selected", 0),
            selected=raw_counts.get("selected", 0),
        ),
    )


@router.get("/{id}", response_model=ApplicationDetailResponse)
async def get_application(
    id: int,
    db: DBSession,
    user: CandidateUser,
):
    """Get application details with resume download URL."""
    service = ApplicationService(db)
    application = await service.get(id, user.id)

    return ApplicationDetailResponse(
        id=application.id,
        job_id=application.job_id,
        job_title=application.job.title_vi,
        job_slug=application.job.slug,
        job_department=application.job.department,
        job_location=application.job.location,
        resume_id=application.resume_id,
        resume_filename=application.resume.original_filename,
        cover_letter=application.cover_letter,
        public_status=application.public_status,
        submitted_at=application.submitted_at,
        resume_download_url=f"/pub/applications/{application.id}/resume",
    )


@router.get("/{id}/resume")
async def download_application_resume(
    id: int,
    db: DBSession,
    user: CandidateUser,
):
    """Download the resume attached to an application.

    Proxies the file from MinIO so the browser never needs direct
    MinIO access (avoids hostname, signature, and CORS issues).
    """
    service = ApplicationService(db)
    application = await service.get(id, user.id)

    storage = get_storage_service()
    file_bytes = storage.download(application.resume.minio_path)

    return StreamingResponse(
        BytesIO(file_bytes),
        media_type=application.resume.content_type,
        headers={
            "Content-Disposition": f'inline; filename="{application.resume.original_filename}"',
        },
    )
