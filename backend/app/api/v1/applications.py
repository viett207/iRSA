"""Admin API for viewing job applications."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from io import BytesIO
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload, defer
from sqlalchemy.sql import func as sa_func

from app.api.deps import DBSession, HRUser
from app.models import Application, Job, Resume
from app.models.scoring_result import ScoringResult
from app.services.storage import get_storage_service

router = APIRouter()


# --- Response schemas ---

class ApplicantResponse(BaseModel):
    """Single applicant for recruiter view."""

    id: int
    candidate_name: str
    candidate_email: str
    resume_filename: str
    status: str
    public_status: str
    submitted_at: datetime | None = None
    updated_at: datetime | None = None
    total_score: float | None = None
    skill_match_score: float | None = None
    experience_score: float | None = None
    education_score: float | None = None

    class Config:
        from_attributes = True


class ApplicantListResponse(BaseModel):
    """Paginated list of applicants for a job."""

    items: list[ApplicantResponse]
    total: int
    page: int
    size: int


# --- Endpoint ---

@router.get("/jobs/{job_id}/applications", response_model=ApplicantListResponse)
async def list_job_applications(
    job_id: int,
    current_user: HRUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("date", pattern="^(date|score)$"),
):
    """List applications for a job.

    Supports sorting by date.
    Requires HR staff role (admin, leader, recruiter).
    """
    base_where = Application.job_id == job_id

    # Build query
    query = (
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.resume).defer(Resume.raw_text),
            selectinload(Application.scoring_result),
        )
        .where(base_where)
    )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Sorting
    if sort_by == "score":
        query = query.outerjoin(ScoringResult).order_by(
            ScoringResult.total_score.desc().nulls_last(),
            Application.submitted_at.desc(),
        )
    else:
        query = query.order_by(Application.submitted_at.desc())

    offset = (page - 1) * size
    query = query.offset(offset).limit(size)

    result = await db.execute(query)
    applications = result.scalars().all()

    items = [
        ApplicantResponse(
            id=app.id,
            candidate_name=app.candidate.full_name if app.candidate else "N/A",
            candidate_email=app.candidate.email if app.candidate else "N/A",
            resume_filename=app.resume.original_filename if app.resume else "N/A",
            status=app.status,
            public_status=app.public_status,
            submitted_at=app.submitted_at,
            updated_at=app.updated_at,
            total_score=app.scoring_result.total_score if app.scoring_result else None,
            skill_match_score=app.scoring_result.skill_match_score if app.scoring_result else None,
            experience_score=app.scoring_result.experience_score if app.scoring_result else None,
            education_score=app.scoring_result.education_score if app.scoring_result else None,
        )
        for app in applications
    ]

    return ApplicantListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


# --- Detail & Action schemas ---

class ApplicantDetailResponse(ApplicantResponse):
    """Full applicant detail including resume text."""

    resume_raw_text: str | None = None
    cover_letter: str | None = None


class StatusUpdateRequest(BaseModel):
    """Request to update application internal/public status."""

    status: str  # submitted|shortlisted|interviewing|rejected
    reason: str | None = None


# Valid internal status transitions
_STATUS_TRANSITIONS: dict[str, list[str]] = {
    "submitted": ["shortlisted", "rejected"],
    "shortlisted": ["interviewing", "rejected"],
    "interviewing": ["rejected"],
    "rejected": [],
}

# Internal → public status mapping
_PUBLIC_STATUS_MAP: dict[str, str] = {
    "submitted": "in_review",
    "shortlisted": "shortlisted",
    "interviewing": "shortlisted",
    "rejected": "not_selected",
}


@router.get(
    "/jobs/{job_id}/applications/{app_id}",
    response_model=ApplicantDetailResponse,
)
async def get_application_detail(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Get full application detail with resume text."""
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.resume),
        )
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    return ApplicantDetailResponse(
        id=app.id,
        candidate_name=app.candidate.full_name if app.candidate else "N/A",
        candidate_email=app.candidate.email if app.candidate else "N/A",
        resume_filename=app.resume.original_filename if app.resume else "N/A",
        status=app.status,
        public_status=app.public_status,
        submitted_at=app.submitted_at,
        resume_raw_text=app.resume.raw_text if app.resume else None,
        cover_letter=app.cover_letter,
    )


@router.patch(
    "/jobs/{job_id}/applications/{app_id}/status",
    response_model=ApplicantResponse,
)
async def update_application_status(
    job_id: int,
    app_id: int,
    body: StatusUpdateRequest,
    current_user: HRUser,
    db: DBSession,
):
    """Update application status (shortlist, reject, schedule interview)."""
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job),
            selectinload(Application.resume).defer(Resume.raw_text),
        )
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Only the HR who created the job can change application status
    if app.job and app.job.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ người tạo tin tuyển dụng mới được thao tác")

    old_status = app.status
    allowed = _STATUS_TRANSITIONS.get(old_status, [])
    if body.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{old_status}' to '{body.status}'. "
                   f"Allowed: {allowed}",
        )

    app.status = body.status
    app.public_status = _PUBLIC_STATUS_MAP.get(body.status, app.public_status)
    app.updated_at = sa_func.now()
    await db.commit()
    await db.refresh(app)

    # Auto-trigger Gemini AI evaluation when shortlisted
    if body.status == "shortlisted":
        from app.tasks.ai_evaluation_tasks import ai_evaluate_application_task
        ai_evaluate_application_task.delay(app.id)

    # Real-time + email notification to candidate on status change
    candidate = app.candidate
    job_title = app.job.title_vi if app.job else "N/A"
    if candidate:
        # Email for rejection
        if body.status == "rejected":
            from app.tasks.notification_tasks import send_status_change_notification
            send_status_change_notification.delay(
                candidate.email, candidate.full_name, job_title, body.status
            )
        # Real-time notification for all status changes
        from app.services.notification_service import notify_candidate_status_change
        await notify_candidate_status_change(
            db, candidate.id, job_title, body.status,
            job_id=job_id, application_id=app.id,
        )
        await db.commit()

    return ApplicantResponse(
        id=app.id,
        candidate_name=app.candidate.full_name if app.candidate else "N/A",
        candidate_email=app.candidate.email if app.candidate else "N/A",
        resume_filename=app.resume.original_filename if app.resume else "N/A",
        status=app.status,
        public_status=app.public_status,
        submitted_at=app.submitted_at,
    )


class ResumeUrlResponse(BaseModel):
    url: str
    filename: str
    content_type: str


@router.get(
    "/jobs/{job_id}/applications/{app_id}/resume-url",
    response_model=ResumeUrlResponse,
)
async def get_resume_download_url(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Get presigned URL for viewing/downloading a candidate's resume PDF."""
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.resume).defer(Resume.raw_text))
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if not app.resume:
        raise HTTPException(status_code=404, detail="No resume attached")

    storage = get_storage_service()
    url = storage.get_presigned_url(app.resume.minio_path, expires_hours=1)

    return ResumeUrlResponse(
        url=url,
        filename=app.resume.original_filename,
        content_type=app.resume.content_type,
    )


@router.get(
    "/jobs/{job_id}/applications/{app_id}/resume-download",
)
async def download_resume(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Download a candidate's resume file directly."""
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.resume).defer(Resume.raw_text))
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if not app.resume:
        raise HTTPException(status_code=404, detail="No resume attached")

    storage = get_storage_service()
    file_bytes = storage.download(app.resume.minio_path)
    filename = app.resume.original_filename

    return StreamingResponse(
        BytesIO(file_bytes),
        media_type=app.resume.content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get(
    "/jobs/{job_id}/applications/{app_id}/resume-view",
)
async def view_resume_inline(
    job_id: int,
    app_id: int,
    db: DBSession,
    token: str = Query(...),
):
    """View a candidate's resume inline (for iframe/PDF viewer).
    Auth via ?token=JWT since iframes can't send Authorization header.
    """
    from app.core.security import decode_token
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(
        select(Application)
        .options(selectinload(Application.resume).defer(Resume.raw_text))
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if not app.resume:
        raise HTTPException(status_code=404, detail="No resume attached")

    storage = get_storage_service()
    file_bytes = storage.download(app.resume.minio_path)

    return StreamingResponse(
        BytesIO(file_bytes),
        media_type=app.resume.content_type,
        headers={
            "Content-Disposition": f'inline; filename="{app.resume.original_filename}"',
        },
    )


# --- Shortlisted (First Round Qualifiers) ---

class ShortlistedApplicantResponse(BaseModel):
    """Shortlisted applicant with job context and AI evaluation status."""

    id: int
    job_id: int
    job_title: str
    job_created_by: int | None = None
    candidate_name: str
    candidate_email: str
    resume_filename: str
    status: str
    submitted_at: datetime | None = None
    total_score: float | None = None
    ai_score: float | None = None
    ai_evaluated_at: datetime | None = None
    has_ai_evaluation: bool = False

    class Config:
        from_attributes = True


class ShortlistedListResponse(BaseModel):
    items: list[ShortlistedApplicantResponse]
    total: int
    page: int
    size: int


@router.get("/shortlisted", response_model=ShortlistedListResponse)
async def list_shortlisted_applications(
    current_user: HRUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("date", pattern="^(date|score|ai_score)$"),
):
    """List all shortlisted applications across all jobs."""
    base_query = (
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job),
            selectinload(Application.resume).defer(Resume.raw_text),
            selectinload(Application.scoring_result),
        )
        .where(Application.status == "shortlisted")
    )

    # Count
    count_q = select(func.count()).select_from(
        select(Application.id).where(Application.status == "shortlisted").subquery()
    )
    total = (await db.execute(count_q)).scalar() or 0

    # Sorting
    if sort_by == "score":
        base_query = base_query.outerjoin(ScoringResult).order_by(
            ScoringResult.total_score.desc().nulls_last()
        )
    elif sort_by == "ai_score":
        base_query = base_query.outerjoin(ScoringResult).order_by(
            ScoringResult.ai_score.desc().nulls_last()
        )
    else:
        base_query = base_query.order_by(Application.updated_at.desc())

    offset = (page - 1) * size
    result = await db.execute(base_query.offset(offset).limit(size))
    apps = result.scalars().all()

    items = [
        ShortlistedApplicantResponse(
            id=a.id,
            job_id=a.job_id,
            job_title=a.job.title_vi if a.job else "N/A",
            job_created_by=a.job.created_by if a.job else None,
            candidate_name=a.candidate.full_name if a.candidate else "N/A",
            candidate_email=a.candidate.email if a.candidate else "N/A",
            resume_filename=a.resume.original_filename if a.resume else "N/A",
            status=a.status,
            submitted_at=a.submitted_at,
            total_score=a.scoring_result.total_score if a.scoring_result else None,
            ai_score=a.scoring_result.ai_score if a.scoring_result else None,
            ai_evaluated_at=a.scoring_result.ai_evaluated_at if a.scoring_result else None,
            has_ai_evaluation=bool(
                a.scoring_result and a.scoring_result.ai_evaluation
            ),
        )
        for a in apps
    ]

    return ShortlistedListResponse(items=items, total=total, page=page, size=size)


@router.post(
    "/jobs/{job_id}/applications/{app_id}/ai-evaluate",
    response_model=dict,
)
async def trigger_ai_evaluation(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Manually trigger AI evaluation for a specific application."""
    result = await db.execute(
        select(Application).where(
            Application.id == app_id, Application.job_id == job_id
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    from app.tasks.ai_evaluation_tasks import ai_evaluate_application_task
    ai_evaluate_application_task.delay(app_id)

    return {"message": "AI evaluation triggered", "application_id": app_id}


# --- Interviewing Dashboard ---

class InterviewingApplicantResponse(BaseModel):
    id: int
    job_id: int
    job_title: str
    job_created_by: int | None = None
    candidate_name: str
    candidate_email: str
    status: str
    total_score: float | None = None
    ai_score: float | None = None
    has_ai_evaluation: bool = False
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class InterviewingListResponse(BaseModel):
    items: list[InterviewingApplicantResponse]
    total: int
    page: int
    size: int


@router.get("/interviewing", response_model=InterviewingListResponse)
async def list_interviewing_applications(
    current_user: HRUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("date", pattern="^(date|score|ai_score)$"),
):
    """List all candidates currently in interview stage."""
    base_query = (
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job),
            selectinload(Application.scoring_result),
        )
        .where(Application.status == "interviewing")
    )

    count_q = select(func.count()).select_from(
        select(Application.id).where(Application.status == "interviewing").subquery()
    )
    total = (await db.execute(count_q)).scalar() or 0

    if sort_by == "score":
        base_query = base_query.outerjoin(ScoringResult).order_by(
            ScoringResult.total_score.desc().nulls_last()
        )
    elif sort_by == "ai_score":
        base_query = base_query.outerjoin(ScoringResult).order_by(
            ScoringResult.ai_score.desc().nulls_last()
        )
    else:
        base_query = base_query.order_by(Application.updated_at.desc())

    offset = (page - 1) * size
    result = await db.execute(base_query.offset(offset).limit(size))
    apps = result.scalars().all()

    items = [
        InterviewingApplicantResponse(
            id=a.id,
            job_id=a.job_id,
            job_title=a.job.title_vi if a.job else "N/A",
            job_created_by=a.job.created_by if a.job else None,
            candidate_name=a.candidate.full_name if a.candidate else "N/A",
            candidate_email=a.candidate.email if a.candidate else "N/A",
            status=a.status,
            total_score=a.scoring_result.total_score if a.scoring_result else None,
            ai_score=a.scoring_result.ai_score if a.scoring_result else None,
            has_ai_evaluation=bool(a.scoring_result and a.scoring_result.ai_evaluation),
            updated_at=a.updated_at,
        )
        for a in apps
    ]

    return InterviewingListResponse(items=items, total=total, page=page, size=size)


# --- Interview Passed Dashboard ---

class InterviewPassedResponse(BaseModel):
    """Candidate who passed interview (offered/hired)."""

    id: int
    job_id: int
    job_title: str
    candidate_name: str
    candidate_email: str
    status: str
    total_score: float | None = None
    ai_score: float | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class InterviewPassedListResponse(BaseModel):
    items: list[InterviewPassedResponse]
    total: int
    page: int
    size: int


@router.get("/interview-passed", response_model=InterviewPassedListResponse)
async def list_interview_passed(
    current_user: HRUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status_filter: str = Query("all", pattern="^(all|offered|hired)$"),
):
    """List candidates who passed interviews (offered or hired)."""
    statuses = ["offered", "hired"] if status_filter == "all" else [status_filter]

    base_query = (
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job),
            selectinload(Application.scoring_result),
        )
        .where(Application.status.in_(statuses))
    )

    count_q = select(func.count()).select_from(
        select(Application.id).where(Application.status.in_(statuses)).subquery()
    )
    total = (await db.execute(count_q)).scalar() or 0

    base_query = base_query.order_by(Application.updated_at.desc())
    offset = (page - 1) * size
    result = await db.execute(base_query.offset(offset).limit(size))
    apps = result.scalars().all()

    items = [
        InterviewPassedResponse(
            id=a.id,
            job_id=a.job_id,
            job_title=a.job.title_vi if a.job else "N/A",
            candidate_name=a.candidate.full_name if a.candidate else "N/A",
            candidate_email=a.candidate.email if a.candidate else "N/A",
            status=a.status,
            total_score=a.scoring_result.total_score if a.scoring_result else None,
            ai_score=a.scoring_result.ai_score if a.scoring_result else None,
            updated_at=a.updated_at,
        )
        for a in apps
    ]

    return InterviewPassedListResponse(items=items, total=total, page=page, size=size)
