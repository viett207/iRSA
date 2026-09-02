"""Dashboard statistics API for HR Admin.

HR users only see dashboard data for their own company (filtered by company_code).
Admin users without company_code see all data.
"""

import time
from datetime import datetime, timedelta, timezone
from typing import Tuple
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.api.deps import CurrentUser
from app.models import Job, Application, Interview
from app.models.user import User


# --- Response schemas ---

class DashboardStats(BaseModel):
    active_jobs: int
    total_applications: int
    total_candidates: int
    pending_applications: int
    avg_time_to_fill: float | None
    jobs_trend: float | None
    apps_trend: float | None
    time_trend: float | None


class RecentApplication(BaseModel):
    id: int
    job_id: int
    candidate_name: str
    job_title: str
    department: str | None = None
    employment_type: str | None = None
    submitted_at: datetime | None
    status: str
    ai_score: float | None = None
    ai_evaluated_at: datetime | None = None


class PendingApproval(BaseModel):
    id: int
    title: str
    creator: str
    created_at: datetime | None


class RecentAIInterview(BaseModel):
    interview_id: int
    application_id: int
    job_id: int
    candidate_name: str
    job_title: str
    interview_date: datetime
    overall_score: float | None
    recommendation: str | None
    has_minutes: bool


class DashboardResponse(BaseModel):
    stats: DashboardStats
    application_status_counts: dict[str, int]
    job_status_counts: dict[str, int]
    recent_applications: list[RecentApplication]
    recent_ai_interviews: list[RecentAIInterview]
    pending_approvals: list[PendingApproval]


# --- In-memory Short TTL Cache ---
_DASHBOARD_CACHE: dict[Tuple[int, str | None], Tuple[float, DashboardResponse]] = {}
CACHE_TTL_SECONDS = 15.0


# --- Endpoint ---

router = APIRouter()


def _percentage_change(current: int, previous: int) -> float:
    """Return an honest period-over-period percentage without fabricating a baseline."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def _average(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 1) if values else None


def _elapsed_days(start: datetime, end: datetime) -> float | None:
    """Calculate elapsed days safely for both timezone-aware and legacy naive rows."""
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    elapsed = (end - start).total_seconds() / 86400
    return elapsed if elapsed >= 0 else None


@router.get("/stats", response_model=DashboardResponse)
async def get_dashboard_stats(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Aggregate dashboard statistics scoped to user's company (cached for 15s)."""
    cache_key = (current_user.id, current_user.company_code)
    now = time.time()
    if cache_key in _DASHBOARD_CACHE:
        cached_time, cached_data = _DASHBOARD_CACHE[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_data

    cc = current_user.company_code  # None for admin without company

    # Base subquery: job IDs visible to this user's company
    company_jobs_sq = select(Job.id).join(User, Job.created_by == User.id)
    if cc:
        company_jobs_sq = company_jobs_sq.where(User.company_code == cc)
    company_jobs_sq = company_jobs_sq.scalar_subquery()

    # Stats
    active_jobs = await db.scalar(
        select(func.count(Job.id)).where(
            Job.is_published == True,
            Job.id.in_(company_jobs_sq),
        )
    ) or 0

    total_applications = await db.scalar(
        select(func.count(Application.id)).where(
            Application.job_id.in_(company_jobs_sq)
        )
    ) or 0

    # Candidates: count users with role=candidate AND same company_code
    candidate_q = select(func.count(User.id)).where(User.role == "candidate")
    if cc:
        candidate_q = candidate_q.where(User.company_code == cc)
    total_candidates = await db.scalar(candidate_q) or 0

    # Application counts by status (company-scoped)
    status_rows = (
        await db.execute(
            select(Application.status, func.count(Application.id))
            .where(Application.job_id.in_(company_jobs_sq))
            .group_by(Application.status)
        )
    ).all()
    status_counts = {row[0]: row[1] for row in status_rows}
    pending_applications = status_counts.get("submitted", 0) + status_counts.get("reviewing", 0)

    period_end = datetime.now(timezone.utc)
    current_week_start = period_end - timedelta(days=7)
    previous_week_start = current_week_start - timedelta(days=7)

    # Convert to naive UTC datetimes for columns defined as TIMESTAMP WITHOUT TIME ZONE (e.g. applications.submitted_at)
    current_week_start_naive = current_week_start.replace(tzinfo=None)
    previous_week_start_naive = previous_week_start.replace(tzinfo=None)

    current_jobs = await db.scalar(
        select(func.count(Job.id)).where(
            Job.is_published == True,
            Job.id.in_(company_jobs_sq),
            Job.published_at >= current_week_start,
        )
    ) or 0
    previous_jobs = await db.scalar(
        select(func.count(Job.id)).where(
            Job.is_published == True,
            Job.id.in_(company_jobs_sq),
            Job.published_at >= previous_week_start,
            Job.published_at < current_week_start,
        )
    ) or 0

    current_apps = await db.scalar(
        select(func.count(Application.id)).where(
            Application.job_id.in_(company_jobs_sq),
            Application.submitted_at >= current_week_start_naive,
        )
    ) or 0
    previous_apps = await db.scalar(
        select(func.count(Application.id)).where(
            Application.job_id.in_(company_jobs_sq),
            Application.submitted_at >= previous_week_start_naive,
            Application.submitted_at < current_week_start_naive,
        )
    ) or 0

    # Time-to-fill is measured from job creation to the persisted timestamp at
    # which an application reached `hired`. Rows without an update timestamp are
    # excluded because their completion time cannot be established reliably.
    hired_rows = (
        await db.execute(
            select(Job.created_at, Application.updated_at)
            .join(Application, Application.job_id == Job.id)
            .where(
                Job.id.in_(company_jobs_sq),
                Application.status == "hired",
                Application.updated_at.is_not(None),
            )
        )
    ).all()

    all_fill_days: list[float] = []
    current_fill_days: list[float] = []
    previous_fill_days: list[float] = []
    current_month_start = period_end - timedelta(days=30)
    previous_month_start = current_month_start - timedelta(days=30)

    for created_at, hired_at in hired_rows:
        if not created_at or not hired_at:
            continue
        elapsed = _elapsed_days(created_at, hired_at)
        if elapsed is None:
            continue
        all_fill_days.append(elapsed)
        normalized_hired_at = hired_at if hired_at.tzinfo else hired_at.replace(tzinfo=timezone.utc)
        if normalized_hired_at >= current_month_start:
            current_fill_days.append(elapsed)
        elif normalized_hired_at >= previous_month_start:
            previous_fill_days.append(elapsed)

    avg_time_to_fill = _average(all_fill_days)
    current_time_avg = _average(current_fill_days)
    previous_time_avg = _average(previous_fill_days)
    time_trend = (
        round(current_time_avg - previous_time_avg, 1)
        if current_time_avg is not None and previous_time_avg is not None
        else None
    )

    # Recent applications (last 10, company-scoped) - use joinedload for 1 roundtrip
    recent_result = await db.execute(
        select(Application)
        .options(
            joinedload(Application.candidate),
            joinedload(Application.job),
            joinedload(Application.scoring_result),
        )
        .where(Application.job_id.in_(company_jobs_sq))
        .order_by(Application.submitted_at.desc())
        .limit(10)
    )
    recent_apps = recent_result.scalars().unique().all()

    recent_items = [
        RecentApplication(
            id=app.id,
            job_id=app.job_id,
            candidate_name=app.candidate.full_name if app.candidate else "N/A",
            job_title=(app.job.title_vi or "Chưa đặt tên vị trí") if app.job else "Vị trí không xác định",
            department=app.job.department if app.job else None,
            employment_type=app.job.employment_type if app.job else None,
            submitted_at=app.submitted_at,
            status=app.status,
            ai_score=app.scoring_result.ai_score if app.scoring_result else None,
            ai_evaluated_at=app.scoring_result.ai_evaluated_at if app.scoring_result else None,
        )
        for app in recent_apps
    ]

    # Latest completed AI interviews. A minutes/report flag is only exposed
    # when persisted evaluation content exists; the UI must not infer one.
    interview_result = await db.execute(
        select(Interview)
        .options(
            joinedload(Interview.application).joinedload(Application.candidate),
            joinedload(Interview.application).joinedload(Application.job),
        )
        .join(Application, Interview.application_id == Application.id)
        .where(
            Application.job_id.in_(company_jobs_sq),
            Interview.status == "completed",
        )
        .order_by(Interview.interview_date.desc())
        .limit(10)
    )
    recent_interviews = interview_result.scalars().unique().all()
    recent_interview_items = [
        RecentAIInterview(
            interview_id=interview.id,
            application_id=interview.application_id,
            job_id=interview.application.job_id,
            candidate_name=(
                interview.application.candidate.full_name
                if interview.application.candidate else "N/A"
            ),
            job_title=(
                interview.application.job.title_vi
                if interview.application.job and interview.application.job.title_vi else "N/A"
            ),
            interview_date=interview.interview_date,
            overall_score=interview.overall_score,
            recommendation=interview.recommendation,
            has_minutes=bool(
                interview.answers
                or interview.overall_feedback
                or interview.overall_score is not None
            ),
        )
        for interview in recent_interviews
    ]

    # Pending approval jobs (company-scoped) - use joinedload for 1 roundtrip
    pending_result = await db.execute(
        select(Job)
        .options(joinedload(Job.creator))
        .where(
            Job.status == "pending_approval",
            Job.id.in_(company_jobs_sq),
        )
        .order_by(Job.updated_at.desc())
        .limit(10)
    )
    pending_jobs = pending_result.scalars().unique().all()

    pending_items = [
        PendingApproval(
            id=job.id,
            title=job.title_vi or "N/A",
            creator=job.creator.full_name if job.creator else "N/A",
            created_at=job.created_at,
        )
        for job in pending_jobs
    ]

    # Jobs by status (company-scoped)
    job_status_rows = (
        await db.execute(
            select(Job.status, func.count(Job.id))
            .where(Job.id.in_(company_jobs_sq))
            .group_by(Job.status)
        )
    ).all()
    job_status_counts = {row[0]: row[1] for row in job_status_rows}

    response = DashboardResponse(
        stats=DashboardStats(
            active_jobs=active_jobs,
            total_applications=total_applications,
            total_candidates=total_candidates,
            pending_applications=pending_applications,
            avg_time_to_fill=avg_time_to_fill,
            jobs_trend=_percentage_change(current_jobs, previous_jobs),
            apps_trend=_percentage_change(current_apps, previous_apps),
            time_trend=time_trend,
        ),
        application_status_counts=status_counts,
        job_status_counts=job_status_counts,
        recent_applications=recent_items,
        recent_ai_interviews=recent_interview_items,
        pending_approvals=pending_items,
    )

    # Save to short-term cache
    _DASHBOARD_CACHE[cache_key] = (now, response)
    if len(_DASHBOARD_CACHE) > 100:
        _DASHBOARD_CACHE.clear()

    return response
