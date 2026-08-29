"""Dashboard statistics API for HR Admin.

HR users only see dashboard data for their own company (filtered by company_code).
Admin users without company_code see all data.
"""

import time
from datetime import datetime
from typing import Tuple
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.api.deps import CurrentUser
from app.models import Job, Application
from app.models.user import User


# --- Response schemas ---

class DashboardStats(BaseModel):
    active_jobs: int
    total_applications: int
    total_candidates: int


class RecentApplication(BaseModel):
    id: int
    job_id: int
    candidate_name: str
    job_title: str
    submitted_at: datetime | None
    status: str


class PendingApproval(BaseModel):
    id: int
    title: str
    creator: str
    created_at: datetime | None


class DashboardResponse(BaseModel):
    stats: DashboardStats
    application_status_counts: dict[str, int]
    job_status_counts: dict[str, int]
    recent_applications: list[RecentApplication]
    pending_approvals: list[PendingApproval]


# --- In-memory Short TTL Cache ---
_DASHBOARD_CACHE: dict[Tuple[int, str | None], Tuple[float, DashboardResponse]] = {}
CACHE_TTL_SECONDS = 15.0


# --- Endpoint ---

router = APIRouter()


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

    # Recent applications (last 10, company-scoped) - use joinedload for 1 roundtrip
    recent_result = await db.execute(
        select(Application)
        .options(
            joinedload(Application.candidate),
            joinedload(Application.job),
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
            job_title=(app.job.title_vi or "N/A") if app.job else "N/A",
            submitted_at=app.submitted_at,
            status=app.status,
        )
        for app in recent_apps
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
        ),
        application_status_counts=status_counts,
        job_status_counts=job_status_counts,
        recent_applications=recent_items,
        pending_approvals=pending_items,
    )

    # Save to short-term cache
    _DASHBOARD_CACHE[cache_key] = (now, response)
    if len(_DASHBOARD_CACHE) > 100:
        _DASHBOARD_CACHE.clear()

    return response
