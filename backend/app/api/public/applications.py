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
    CandidateInterviewActionRequest,
    InterviewInvitationResponse,
    InterviewInvitationListResponse,
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


@router.get("/interview-invitations", response_model=InterviewInvitationListResponse)
async def list_my_interview_invitations(
    db: DBSession,
    user: CandidateUser,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
):
    """List interview invitations for the candidate."""
    from sqlalchemy import select, func
    from sqlalchemy.orm import selectinload, joinedload
    from app.models.interview import Interview
    from app.models.application import Application
    from app.models.job import Job
    from app.schemas.application import InterviewInvitationResponse, InterviewInvitationListResponse

    # Query interviews belonging to candidate's applications
    base_query = (
        select(Interview)
        .join(Application, Interview.application_id == Application.id)
        .where(Application.candidate_id == user.id)
    )

    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar_one()

    query = (
        base_query
        .options(
            selectinload(Interview.scheduler),
            selectinload(Interview.application).selectinload(Application.job),
        )
        .order_by(Interview.interview_date.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await db.execute(query)
    interviews = result.scalars().all()

    items = []
    for iv in interviews:
        app = iv.application
        job = app.job if app else None
        scheduler_name = iv.scheduler.full_name if iv.scheduler else None

        items.append(
            InterviewInvitationResponse(
                id=iv.id,
                application_id=iv.application_id,
                job_id=job.id if job else 0,
                job_title=job.title_vi if job else "N/A",
                job_slug=job.slug if job else "",
                job_department=job.department if job else None,
                scheduler_name=scheduler_name,
                company_name=scheduler_name or "Nhà tuyển dụng",
                interview_date=iv.interview_date,
                interview_type=iv.interview_type,
                location=iv.location,
                notes=iv.notes,
                status=iv.status,
                candidate_response=iv.candidate_response or "pending",
                candidate_response_note=iv.candidate_response_note,
                candidate_proposed_date=iv.candidate_proposed_date,
                candidate_responded_at=iv.candidate_responded_at,
            )
        )

    return InterviewInvitationListResponse(items=items, total=total, page=page, size=size)


@router.patch("/interview-invitations/{interview_id}/response", response_model=InterviewInvitationResponse)
async def respond_to_interview_invitation(
    interview_id: int,
    body: CandidateInterviewActionRequest,
    db: DBSession,
    user: CandidateUser,
):
    """Candidate responds to an interview invitation (accepted, declined, reschedule_requested)."""
    from datetime import datetime, timezone
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.interview import Interview
    from app.models.application import Application
    from app.models.job import Job
    from app.core.exceptions import NotFoundException, BadRequestException
    from app.schemas.application import InterviewInvitationResponse
    from app.services.notification_service import notify_hr_interview_response

    if body.response not in ("accepted", "declined", "reschedule_requested"):
        raise BadRequestException("Phản hồi không hợp lệ. Phải là accepted, declined, hoặc reschedule_requested.")

    query = (
        select(Interview)
        .options(
            selectinload(Interview.scheduler),
            selectinload(Interview.application).selectinload(Application.job),
        )
        .join(Application, Interview.application_id == Application.id)
        .where(Interview.id == interview_id, Application.candidate_id == user.id)
    )
    result = await db.execute(query)
    interview = result.scalar_one_or_none()
    if not interview:
        raise NotFoundException("Không tìm thấy lịch phỏng vấn này.")

    now = datetime.now(timezone.utc)
    interview.candidate_response = body.response
    interview.candidate_response_note = body.note.strip() if body.note else None
    interview.candidate_proposed_date = body.proposed_date if body.response == "reschedule_requested" else None
    interview.candidate_responded_at = now

    if body.response == "declined":
        # Keep status as scheduled or mark cancelled
        interview.status = "cancelled"

    await db.commit()
    await db.refresh(interview)

    # Trigger real-time notification to HR/scheduler
    try:
        app = interview.application
        job = app.job if app else None
        job_title = job.title_vi if job else "N/A"
        candidate_name = user.full_name or user.email
        hr_id = interview.scheduled_by or (job.created_by if job else None)

        if hr_id:
            interview_date_str = interview.interview_date.strftime("%d/%m/%Y %H:%M")
            proposed_date_str = (
                interview.candidate_proposed_date.strftime("%d/%m/%Y %H:%M")
                if interview.candidate_proposed_date
                else None
            )
            await notify_hr_interview_response(
                db,
                hr_user_id=hr_id,
                candidate_name=candidate_name,
                job_title=job_title,
                response_type=body.response,
                interview_date_str=interview_date_str,
                proposed_date_str=proposed_date_str,
                note=interview.candidate_response_note,
                job_id=job.id if job else None,
                application_id=app.id if app else None,
                interview_id=interview.id,
            )
            await db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to push interview response notification: {e}")

    app = interview.application
    job = app.job if app else None
    scheduler_name = interview.scheduler.full_name if interview.scheduler else None

    return InterviewInvitationResponse(
        id=interview.id,
        application_id=interview.application_id,
        job_id=job.id if job else 0,
        job_title=job.title_vi if job else "N/A",
        job_slug=job.slug if job else "",
        job_department=job.department if job else None,
        scheduler_name=scheduler_name,
        company_name=scheduler_name or "Nhà tuyển dụng",
        interview_date=interview.interview_date,
        interview_type=interview.interview_type,
        location=interview.location,
        notes=interview.notes,
        status=interview.status,
        candidate_response=interview.candidate_response,
        candidate_response_note=interview.candidate_response_note,
        candidate_proposed_date=interview.candidate_proposed_date,
        candidate_responded_at=interview.candidate_responded_at,
    )

