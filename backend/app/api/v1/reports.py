"""Reports API for HR Admin analytics and insights.

HR users only see reports for their own company (filtered by company_code).
Admin users without company_code see all data.
"""

from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func, case, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import HRUser
from app.models import Job, Application, Interview, ScoringResult
from app.models.user import User


# --- Response schemas ---

class DailyCount(BaseModel):
    date: str
    count: int


class JobRanking(BaseModel):
    job_id: int
    title: str
    department: str | None
    application_count: int
    avg_score: float | None


class DepartmentStat(BaseModel):
    department: str
    job_count: int
    application_count: int
    avg_score: float | None


class ScoreBucket(BaseModel):
    range: str
    count: int


class StatusCount(BaseModel):
    status: str
    count: int


class ReportsOverview(BaseModel):
    # Summary KPIs
    total_jobs: int
    active_jobs: int
    total_applications: int
    scored_applications: int
    avg_score: float | None
    hired_count: int
    completed_interviews: int
    passed_interviews: int
    interview_pass_rate: float | None
    # Requires product telemetry comparing actual HR review time with AI review time.
    # Keep null until that telemetry exists; never fabricate a time-saving estimate.
    ai_screening_time_saved_hours: float | None = None

    # Trends
    application_trend: list[DailyCount]

    # Distributions
    score_distribution: list[ScoreBucket]
    application_by_status: list[StatusCount]
    job_by_status: list[StatusCount]

    # Rankings
    top_jobs: list[JobRanking]
    department_stats: list[DepartmentStat]


# --- Helpers ---

def _company_job_filter(query, company_code: str | None):
    """Filter jobs by company_code of the job creator. No filter if company_code is None (admin)."""
    if company_code is None:
        return query
    # Join Job → creator User, filter by company_code
    return query.where(
        Job.created_by == User.id,
        User.company_code == company_code,
    )


# --- Endpoint ---

router = APIRouter()


@router.get("/overview", response_model=ReportsOverview)
async def get_reports_overview(
    current_user: HRUser,
    db: AsyncSession = Depends(get_db),
    days: int = Query(default=30, ge=7, le=365),
):
    """Aggregated recruitment reports scoped to user's company."""

    since = datetime.utcnow() - timedelta(days=days)
    cc = current_user.company_code  # None for admin without company

    # Base subquery: job IDs visible to this user's company
    company_jobs_sq = select(Job.id).join(User, Job.created_by == User.id)
    if cc:
        company_jobs_sq = company_jobs_sq.where(User.company_code == cc)
    company_jobs_sq = company_jobs_sq.scalar_subquery()

    # --- Summary KPIs ---
    total_jobs = await db.scalar(
        select(func.count(Job.id)).where(Job.id.in_(
            select(Job.id).join(User, Job.created_by == User.id).where(
                User.company_code == cc
            ) if cc else select(Job.id)
        ))
    ) or 0

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

    scored_applications = await db.scalar(
        select(func.count(ScoringResult.id)).where(
            ScoringResult.application_id.in_(
                select(Application.id).where(Application.job_id.in_(company_jobs_sq))
            )
        )
    ) or 0

    company_scoring_q = (
        select(func.avg(ScoringResult.total_score)).where(
            ScoringResult.application_id.in_(
                select(Application.id).where(Application.job_id.in_(company_jobs_sq))
            )
        )
    )
    avg_score = await db.scalar(company_scoring_q)
    avg_score = round(avg_score, 1) if avg_score else None

    hired_count = await db.scalar(
        select(func.count(Application.id)).where(
            Application.status == "hired",
            Application.job_id.in_(company_jobs_sq),
        )
    ) or 0

    completed_interviews = await db.scalar(
        select(func.count(Interview.id))
        .join(Application, Interview.application_id == Application.id)
        .where(
            Interview.status == "completed",
            Interview.interview_date >= since,
            Application.job_id.in_(company_jobs_sq),
        )
    ) or 0

    passed_interviews = await db.scalar(
        select(func.count(Interview.id))
        .join(Application, Interview.application_id == Application.id)
        .where(
            Interview.status == "completed",
            Interview.interview_date >= since,
            Interview.recommendation.in_(["STRONG_HIRE", "HIRE"]),
            Application.job_id.in_(company_jobs_sq),
        )
    ) or 0
    interview_pass_rate = (
        round((passed_interviews / completed_interviews) * 100, 1)
        if completed_interviews > 0
        else None
    )

    # --- Application trend (daily counts for the period) ---
    trend_rows = (
        await db.execute(
            select(
                cast(Application.submitted_at, Date).label("day"),
                func.count(Application.id),
            )
            .where(
                Application.submitted_at >= since,
                Application.job_id.in_(company_jobs_sq),
            )
            .group_by("day")
            .order_by("day")
        )
    ).all()

    trend_map = {str(row[0]): row[1] for row in trend_rows}
    application_trend = []
    current = since.date()
    today = date.today()
    while current <= today:
        day_str = str(current)
        application_trend.append(
            DailyCount(date=day_str, count=trend_map.get(day_str, 0))
        )
        current += timedelta(days=1)

    # --- Score distribution (buckets of 10) ---
    company_app_ids = select(Application.id).where(Application.job_id.in_(company_jobs_sq))
    score_buckets_raw = (
        await db.execute(
            select(
                case(
                    (ScoringResult.total_score < 10, "0-9"),
                    (ScoringResult.total_score < 20, "10-19"),
                    (ScoringResult.total_score < 30, "20-29"),
                    (ScoringResult.total_score < 40, "30-39"),
                    (ScoringResult.total_score < 50, "40-49"),
                    (ScoringResult.total_score < 60, "50-59"),
                    (ScoringResult.total_score < 70, "60-69"),
                    (ScoringResult.total_score < 80, "70-79"),
                    (ScoringResult.total_score < 90, "80-89"),
                    else_="90-100",
                ).label("bucket"),
                func.count(ScoringResult.id),
            )
            .where(ScoringResult.application_id.in_(company_app_ids))
            .group_by("bucket")
        )
    ).all()

    bucket_order = [
        "0-9", "10-19", "20-29", "30-39", "40-49",
        "50-59", "60-69", "70-79", "80-89", "90-100",
    ]
    bucket_map = {row[0]: row[1] for row in score_buckets_raw}
    score_distribution = [
        ScoreBucket(range=b, count=bucket_map.get(b, 0)) for b in bucket_order
    ]

    # --- Application by status ---
    app_status_rows = (
        await db.execute(
            select(Application.status, func.count(Application.id))
            .where(Application.job_id.in_(company_jobs_sq))
            .group_by(Application.status)
        )
    ).all()
    application_by_status = [
        StatusCount(status=row[0], count=row[1]) for row in app_status_rows
    ]

    # --- Job by status ---
    job_status_rows = (
        await db.execute(
            select(Job.status, func.count(Job.id))
            .where(Job.id.in_(company_jobs_sq))
            .group_by(Job.status)
        )
    ).all()
    job_by_status = [
        StatusCount(status=row[0], count=row[1]) for row in job_status_rows
    ]

    # --- Top jobs by application count ---
    top_jobs_rows = (
        await db.execute(
            select(
                Job.id,
                Job.title_vi,
                Job.department,
                func.count(Application.id).label("app_count"),
                func.avg(ScoringResult.total_score).label("avg_sc"),
            )
            .join(Application, Application.job_id == Job.id)
            .outerjoin(ScoringResult, ScoringResult.application_id == Application.id)
            .where(Job.id.in_(company_jobs_sq))
            .group_by(Job.id, Job.title_vi, Job.department)
            .order_by(func.count(Application.id).desc())
            .limit(10)
        )
    ).all()

    top_jobs = [
        JobRanking(
            job_id=row[0],
            title=row[1] or "N/A",
            department=row[2],
            application_count=row[3],
            avg_score=round(row[4], 1) if row[4] else None,
        )
        for row in top_jobs_rows
    ]

    # --- Department stats ---
    dept_rows = (
        await db.execute(
            select(
                func.coalesce(Job.department, "Chưa phân loại").label("dept"),
                func.count(func.distinct(Job.id)).label("j_count"),
                func.count(Application.id).label("a_count"),
                func.avg(ScoringResult.total_score).label("avg_sc"),
            )
            .outerjoin(Application, Application.job_id == Job.id)
            .outerjoin(ScoringResult, ScoringResult.application_id == Application.id)
            .where(Job.id.in_(company_jobs_sq))
            .group_by("dept")
            .order_by(func.count(Application.id).desc())
        )
    ).all()

    department_stats = [
        DepartmentStat(
            department=row[0],
            job_count=row[1],
            application_count=row[2],
            avg_score=round(row[3], 1) if row[3] else None,
        )
        for row in dept_rows
    ]

    return ReportsOverview(
        total_jobs=total_jobs,
        active_jobs=active_jobs,
        total_applications=total_applications,
        scored_applications=scored_applications,
        avg_score=avg_score,
        hired_count=hired_count,
        completed_interviews=completed_interviews,
        passed_interviews=passed_interviews,
        interview_pass_rate=interview_pass_rate,
        ai_screening_time_saved_hours=None,
        application_trend=application_trend,
        score_distribution=score_distribution,
        application_by_status=application_by_status,
        job_by_status=job_by_status,
        top_jobs=top_jobs,
        department_stats=department_stats,
    )
