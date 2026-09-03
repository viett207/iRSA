"""Admin API for viewing job applications."""

from datetime import date, datetime, time, timedelta
from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
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
    detected_experience_years: float | None = None
    education_score: float | None = None
    ai_score: float | None = None
    ai_evaluated_at: datetime | None = None
    has_ai_evaluation: bool = False
    ai_recommendation: str | None = None

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
    sort_by: str = Query("date", pattern="^(date|score|ai_score)$"),
    submitted_date: date | None = Query(None),
):
    """List applications for a job.

    Supports sorting by date, score, or ai_score.
    Requires HR staff role (admin, leader, recruiter).
    """
    filters = [Application.job_id == job_id]
    if submitted_date is not None:
        day_start = datetime.combine(submitted_date, time.min)
        next_day = day_start + timedelta(days=1)
        filters.extend([
            Application.submitted_at >= day_start,
            Application.submitted_at < next_day,
        ])

    # Build query
    query = (
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.resume).defer(Resume.raw_text),
            selectinload(Application.scoring_result),
        )
        .where(*filters)
    )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Sorting
    if sort_by == "ai_score":
        query = query.outerjoin(ScoringResult).order_by(
            ScoringResult.ai_score.desc().nulls_last(),
            Application.submitted_at.desc(),
        )
    elif sort_by == "score":
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

    items = []
    for app in applications:
        sr = app.scoring_result
        ai_eval = sr.ai_evaluation if sr else None
        has_eval = bool(ai_eval) if ai_eval else False
        rec = ai_eval.get("recommendation") if (has_eval and isinstance(ai_eval, dict)) else None
        experience_details = (
            sr.match_details.get("experience", {})
            if sr and isinstance(sr.match_details, dict)
            else {}
        )

        items.append(
            ApplicantResponse(
                id=app.id,
                candidate_name=app.candidate.full_name if app.candidate else "N/A",
                candidate_email=app.candidate.email if app.candidate else "N/A",
                resume_filename=app.resume.original_filename if app.resume else "N/A",
                status=app.status,
                public_status=app.public_status,
                submitted_at=app.submitted_at,
                updated_at=app.updated_at,
                total_score=sr.total_score if sr else None,
                skill_match_score=sr.skill_match_score if sr else None,
                experience_score=sr.experience_score if sr else None,
                detected_experience_years=experience_details.get("detected_years"),
                education_score=sr.education_score if sr else None,
                ai_score=sr.ai_score if sr else None,
                ai_evaluated_at=sr.ai_evaluated_at if sr else None,
                has_ai_evaluation=has_eval,
                ai_recommendation=rec,
            )
        )

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


# All valid application statuses
VALID_APPLICATION_STATUSES: set[str] = {
    "submitted",
    "reviewing",
    "shortlisted",
    "interviewing",
    "offered",
    "hired",
    "rejected",
}

# Internal → public status mapping
_PUBLIC_STATUS_MAP: dict[str, str] = {
    "submitted": "in_review",
    "reviewing": "in_review",
    "shortlisted": "shortlisted",
    "interviewing": "shortlisted",
    "offered": "shortlisted",
    "hired": "selected",
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


async def _run_ai_eval_background(application_id: int):
    """Execute AI evaluation agent directly in background without requiring Celery daemon or holding DB session."""
    import logging
    try:
        from src.services.agent_service import run_evaluation_agent
        await run_evaluation_agent(None, application_id)
    except Exception as e:
        logging.getLogger(__name__).exception(f"Background AI evaluation failed for app {application_id}: {e}")


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
    background_tasks: BackgroundTasks,
):
    """Update application status (shortlist, reject, schedule interview, etc.)."""
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

    # Job creator, HR, Admin or Recruiter can change application status
    allowed_roles = {"admin", "hr", "manager", "recruiter", "leader"}
    if app.job and app.job.created_by != current_user.id and current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Chỉ người tạo tin tuyển dụng hoặc HR mới có quyền thao tác")

    if body.status not in VALID_APPLICATION_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Trạng thái '{body.status}' không hợp lệ. Các trạng thái hợp lệ: {sorted(list(VALID_APPLICATION_STATUSES))}",
        )

    app.status = body.status
    app.public_status = _PUBLIC_STATUS_MAP.get(body.status, app.public_status)
    app.updated_at = sa_func.now()
    await db.commit()
    await db.refresh(app)

    # Auto-trigger AI evaluation when shortlisted
    if body.status == "shortlisted":
        background_tasks.add_task(_run_ai_eval_background, app.id)
        try:
            from app.tasks.ai_evaluation_tasks import ai_evaluate_application_task
            ai_evaluate_application_task.delay(app.id)
        except Exception:
            pass

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
    """Shortlisted applicant with job context, AI evaluation status, and scheduled interview."""

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
    interview_date: datetime | None = None
    interview_type: str | None = None
    interview_status: str | None = None
    question_status: str = "unreviewed"
    question_count: int = 0
    question_edited_count: int = 0

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
    job_id: int | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    sort_by: str = Query("date", pattern="^(date|score|ai_score)$"),
):
    """List all shortlisted & scheduled applications across all jobs or for a specific job."""
    target_statuses = [status] if status else ["shortlisted", "interviewing"]

    base_query = (
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job),
            selectinload(Application.resume).defer(Resume.raw_text),
            selectinload(Application.scoring_result),
            selectinload(Application.interviews),
        )
        .where(Application.status.in_(target_statuses))
    )

    if job_id:
        base_query = base_query.where(Application.job_id == job_id)

    # Count
    count_sub = select(Application.id).where(Application.status.in_(target_statuses))
    if job_id:
        count_sub = count_sub.where(Application.job_id == job_id)
    count_q = select(func.count()).select_from(count_sub.subquery())
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

    items = []
    for a in apps:
        latest_iv = max(a.interviews, key=lambda interview: interview.id) if a.interviews else None
        interview_questions = latest_iv.questions if latest_iv and isinstance(latest_iv.questions, list) else []
        reviewed_questions = [
            question for question in interview_questions
            if isinstance(question, dict) and question.get("hr_reviewed") is True
        ]
        edited_questions = [
            question for question in interview_questions
            if isinstance(question, dict) and question.get("hr_edited") is True
        ]
        items.append(
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
                interview_date=latest_iv.interview_date if latest_iv else None,
                interview_type=latest_iv.interview_type if latest_iv else None,
                interview_status=latest_iv.status if latest_iv else None,
                question_status="ready" if reviewed_questions else "unreviewed",
                question_count=len(interview_questions),
                question_edited_count=len(edited_questions),
            )
        )

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
    background_tasks: BackgroundTasks,
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

    # Run in background via FastAPI background tasks
    background_tasks.add_task(_run_ai_eval_background, app_id)
    try:
        from app.tasks.ai_evaluation_tasks import ai_evaluate_application_task
        ai_evaluate_application_task.delay(app_id)
    except Exception:
        pass

    return {
        "message": "Đang tiến hành chấm AI cho ứng viên",
        "application_id": app_id,
    }


@router.post(
    "/jobs/{job_id}/ai-evaluate-all",
    response_model=dict,
)
async def trigger_ai_evaluate_all(
    job_id: int,
    current_user: HRUser,
    db: DBSession,
    background_tasks: BackgroundTasks,
):
    """Trigger AI evaluation for all applicants of a job in background."""
    result = await db.execute(
        select(Application.id).where(Application.job_id == job_id)
    )
    app_ids = list(result.scalars().all())
    if not app_ids:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên nào cho việc làm này")

    async def _run_all_eval():
        for aid in app_ids:
            await _run_ai_eval_background(aid)

    background_tasks.add_task(_run_all_eval)
    return {
        "message": f"Đang tiến hành chấm AI cho {len(app_ids)} ứng viên.",
        "count": len(app_ids),
    }


class CvJdCompareResponse(BaseModel):
    application_id: int
    candidate_name: str
    candidate_email: str
    resume_filename: str
    cv_text: str
    job_id: int
    job_title: str
    job_department: str | None = None
    job_location: str | None = None
    job_description: str | None = None
    job_requirements: str | None = None
    must_have_skills: list[str] = []
    nice_to_have_skills: list[str] = []
    min_experience_years: int = 0
    max_experience_years: int | None = None
    min_education: str | None = None
    matched_skills: list[str] = []
    missing_skills: list[str] = []
    matched_keywords: list[str] = []
    total_score: float | None = None
    skill_match_score: float | None = None
    experience_score: float | None = None
    education_score: float | None = None


@router.get(
    "/jobs/{job_id}/applications/{app_id}/cv-jd-compare",
    response_model=CvJdCompareResponse,
)
async def get_cv_jd_compare(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Retrieve CV/JD content and the existing non-AI matching score."""
    import re
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.resume),
            selectinload(Application.job).selectinload(Job.criteria),
            selectinload(Application.scoring_result),
        )
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    cv_text = app.resume.raw_text if (app.resume and app.resume.raw_text) else ""
    job = app.job
    criteria = job.criteria if job else None
    score = app.scoring_result

    must_have = criteria.must_have_skills if (criteria and criteria.must_have_skills) else []
    nice_to_have = criteria.nice_to_have_skills if (criteria and criteria.nice_to_have_skills) else []
    all_skills = list(dict.fromkeys(must_have + nice_to_have))

    matched_skills = []
    missing_skills = []
    cv_lower = cv_text.lower() if cv_text else ""

    for skill in all_skills:
        s_clean = skill.strip()
        if not s_clean:
            continue
        escaped = re.escape(s_clean.lower())
        pattern = rf"(?<![a-zA-Z0-9_#+]){escaped}(?![a-zA-Z0-9_#+])"
        if re.search(pattern, cv_lower):
            matched_skills.append(s_clean)
        else:
            missing_skills.append(s_clean)

    matched_keywords = list(dict.fromkeys(matched_skills))

    return CvJdCompareResponse(
        application_id=app.id,
        candidate_name=app.candidate.full_name if app.candidate else "N/A",
        candidate_email=app.candidate.email if app.candidate else "N/A",
        resume_filename=app.resume.original_filename if app.resume else "N/A",
        cv_text=cv_text,
        job_id=job.id if job else job_id,
        job_title=job.title_vi if job else "N/A",
        job_department=job.department if job else None,
        job_location=job.location if job else None,
        job_description=job.description_vi if job else None,
        job_requirements=job.requirements_vi if job else None,
        must_have_skills=must_have,
        nice_to_have_skills=nice_to_have,
        min_experience_years=criteria.min_experience_years if criteria else 0,
        max_experience_years=criteria.max_experience_years if criteria else None,
        min_education=criteria.min_education if criteria else None,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        matched_keywords=matched_keywords,
        total_score=score.total_score if score else None,
        skill_match_score=score.skill_match_score if score else None,
        experience_score=score.experience_score if score else None,
        education_score=score.education_score if score else None,
    )


class CandidateChatRequest(BaseModel):
    message: str
    history: list[dict] | None = None


class CandidateChatResponse(BaseModel):
    reply: str
    suggested_followups: list[str] = []
    candidate_name: str | None = None


@router.post(
    "/jobs/{job_id}/applications/{app_id}/chat",
    response_model=CandidateChatResponse,
)
async def chat_with_candidate_agent(
    job_id: int,
    app_id: int,
    body: CandidateChatRequest,
    current_user: HRUser,
    db: DBSession,
):
    """Interactive Chatbot with AI Recruiter Copilot regarding candidate's CV and qualifications."""
    result = await db.execute(
        select(Application).where(
            Application.id == app_id, Application.job_id == job_id
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    from app.core.database import get_sync_session
    from src.services.agent_service import run_candidate_chat

    with get_sync_session() as sync_session:
        res = await run_candidate_chat(sync_session, app_id, body.message, body.history)

    return CandidateChatResponse(
        reply=res.get("reply", "Không thể tạo câu trả lời."),
        suggested_followups=res.get("suggested_followups", []),
        candidate_name=res.get("candidate_name"),
    )


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
    has_completed_interview: bool = False
    interview_date: datetime | None = None
    interview_type: str | None = None
    interview_status: str | None = None
    question_status: str = "unreviewed"
    question_count: int = 0
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
            selectinload(Application.interviews),
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

    items = []
    for a in apps:
        latest_iv = max(a.interviews, key=lambda interview: interview.id) if a.interviews else None
        questions = latest_iv.questions if latest_iv and isinstance(latest_iv.questions, list) else []
        questions_ready = any(
            isinstance(question, dict) and question.get("hr_reviewed") is True
            for question in questions
        )
        items.append(InterviewingApplicantResponse(
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
            has_completed_interview=any(iv.status == "completed" for iv in a.interviews),
            interview_date=latest_iv.interview_date if latest_iv else None,
            interview_type=latest_iv.interview_type if latest_iv else None,
            interview_status=latest_iv.status if latest_iv else None,
            question_status="ready" if questions_ready else "unreviewed",
            question_count=len(questions),
            updated_at=a.updated_at,
        ))

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
    interview_score: float | None = None
    interview_recommendation: str | None = None
    interview_feedback: str | None = None
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
            selectinload(Application.interviews),
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

    items = []
    for a in apps:
        completed_interviews = [iv for iv in a.interviews if iv.status == "completed"]
        latest_completed = max(completed_interviews, key=lambda interview: interview.id) if completed_interviews else None
        items.append(InterviewPassedResponse(
            id=a.id,
            job_id=a.job_id,
            job_title=a.job.title_vi if a.job else "N/A",
            candidate_name=a.candidate.full_name if a.candidate else "N/A",
            candidate_email=a.candidate.email if a.candidate else "N/A",
            status=a.status,
            total_score=a.scoring_result.total_score if a.scoring_result else None,
            ai_score=a.scoring_result.ai_score if a.scoring_result else None,
            interview_score=latest_completed.overall_score if latest_completed else None,
            interview_recommendation=latest_completed.recommendation if latest_completed else None,
            interview_feedback=latest_completed.overall_feedback if latest_completed else None,
            updated_at=a.updated_at,
        ))

    return InterviewPassedListResponse(items=items, total=total, page=page, size=size)
