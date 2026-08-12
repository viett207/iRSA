"""Interview scheduling API endpoints."""

import asyncio
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DBSession, HRUser
from app.models import Application, User
from app.models.interview import Interview

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Schemas ---

class InterviewCreateRequest(BaseModel):
    interview_date: datetime
    interview_type: str = "online"  # online|offline
    location: str | None = None
    notes: str | None = None


class InterviewUpdateRequest(BaseModel):
    interview_date: datetime | None = None
    interview_type: str | None = None
    location: str | None = None
    notes: str | None = None
    status: str | None = None  # scheduled|completed|cancelled


class InterviewResponse(BaseModel):
    id: int
    application_id: int
    scheduled_by: int
    scheduler_name: str | None = None
    interview_date: datetime
    interview_type: str
    location: str | None
    notes: str | None
    status: str
    created_at: datetime | None
    updated_at: datetime | None

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.post(
    "/jobs/{job_id}/applications/{app_id}/interviews",
    response_model=InterviewResponse,
)
async def schedule_interview(
    job_id: int,
    app_id: int,
    body: InterviewCreateRequest,
    current_user: HRUser,
    db: DBSession,
):
    """Schedule a new interview for an application."""
    # Verify application exists and belongs to job, load candidate + job info
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job),
        )
        .where(
            Application.id == app_id,
            Application.job_id == job_id,
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Validate: only shortlisted or interviewing can be scheduled
    if app.status not in ("shortlisted", "interviewing"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot schedule interview for application with status '{app.status}'"
        )

    # Create interview
    interview = Interview(
        application_id=app_id,
        scheduled_by=current_user.id,
        interview_date=body.interview_date,
        interview_type=body.interview_type,
        location=body.location,
        notes=body.notes,
        status="scheduled",
    )
    db.add(interview)

    # Auto-transition to interviewing if currently shortlisted
    if app.status == "shortlisted":
        app.status = "interviewing"
        app.public_status = "shortlisted"  # Candidate still sees "shortlisted"

    await db.commit()
    await db.refresh(interview)

    # Send email notification to candidate (non-blocking)
    try:
        from app.services.email import send_interview_notification_email
        asyncio.create_task(
            send_interview_notification_email(
                candidate_email=app.candidate.email,
                candidate_name=app.candidate.full_name,
                job_title=app.job.title_vi,
                interview_date=interview.interview_date.isoformat(),
                interview_type=interview.interview_type,
                location=interview.location,
                notes=interview.notes,
            )
        )
    except Exception as e:
        logger.warning(f"Failed to send interview email: {e}")

    # Real-time notification to candidate
    try:
        from app.services.notification_service import notify_interview_scheduled
        await notify_interview_scheduled(
            db, app.candidate.id,
            job_title=app.job.title_vi or "N/A",
            interview_date=interview.interview_date.strftime("%d/%m/%Y %H:%M"),
            interview_type=interview.interview_type,
            job_id=job_id, application_id=app_id,
        )
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to push interview notification: {e}")

    return InterviewResponse(
        id=interview.id,
        application_id=interview.application_id,
        scheduled_by=interview.scheduled_by,
        scheduler_name=current_user.full_name,
        interview_date=interview.interview_date,
        interview_type=interview.interview_type,
        location=interview.location,
        notes=interview.notes,
        status=interview.status,
        created_at=interview.created_at,
        updated_at=interview.updated_at,
    )


@router.get(
    "/jobs/{job_id}/applications/{app_id}/interviews",
    response_model=list[InterviewResponse],
)
async def list_interviews(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """List all interviews for an application."""
    # Verify application belongs to job
    app_check = await db.execute(
        select(Application.id).where(
            Application.id == app_id,
            Application.job_id == job_id,
        )
    )
    if not app_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Application not found")

    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.scheduler))
        .where(Interview.application_id == app_id)
        .order_by(Interview.interview_date.desc())
    )
    interviews = result.scalars().all()

    return [
        InterviewResponse(
            id=iv.id,
            application_id=iv.application_id,
            scheduled_by=iv.scheduled_by,
            scheduler_name=iv.scheduler.full_name if iv.scheduler else None,
            interview_date=iv.interview_date,
            interview_type=iv.interview_type,
            location=iv.location,
            notes=iv.notes,
            status=iv.status,
            created_at=iv.created_at,
            updated_at=iv.updated_at,
        )
        for iv in interviews
    ]


@router.patch(
    "/jobs/{job_id}/applications/{app_id}/interviews/{interview_id}",
    response_model=InterviewResponse,
)
async def update_interview(
    job_id: int,
    app_id: int,
    interview_id: int,
    body: InterviewUpdateRequest,
    current_user: HRUser,
    db: DBSession,
):
    """Update an existing interview (reschedule, change location, mark completed)."""
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.scheduler))
        .where(
            Interview.id == interview_id,
            Interview.application_id == app_id,
        )
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Update only provided fields
    if body.interview_date is not None:
        interview.interview_date = body.interview_date
    if body.interview_type is not None:
        interview.interview_type = body.interview_type
    if body.location is not None:
        interview.location = body.location
    if body.notes is not None:
        interview.notes = body.notes
    if body.status is not None:
        if body.status not in ("scheduled", "completed", "cancelled"):
            raise HTTPException(status_code=400, detail="Invalid status")
        interview.status = body.status

    await db.commit()
    await db.refresh(interview)

    return InterviewResponse(
        id=interview.id,
        application_id=interview.application_id,
        scheduled_by=interview.scheduled_by,
        scheduler_name=interview.scheduler.full_name if interview.scheduler else None,
        interview_date=interview.interview_date,
        interview_type=interview.interview_type,
        location=interview.location,
        notes=interview.notes,
        status=interview.status,
        created_at=interview.created_at,
        updated_at=interview.updated_at,
    )


@router.delete(
    "/jobs/{job_id}/applications/{app_id}/interviews/{interview_id}",
)
async def cancel_interview(
    job_id: int,
    app_id: int,
    interview_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Cancel an interview."""
    result = await db.execute(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.application_id == app_id,
        )
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview.status = "cancelled"
    await db.commit()

    return {"message": "Interview cancelled"}
