"""Scoring API for resume-job match evaluation."""

import asyncio
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DBSession, HRUser
from app.core.database import get_sync_session
from app.models import Application, Resume, Job
from app.models.scoring_result import ScoringResult
from app.services.scoring import score_application_sync

router = APIRouter()


# --- Response schemas ---

class ScoringResultResponse(BaseModel):
    """Scoring result for a single application."""

    id: int
    application_id: int
    total_score: float
    skill_match_score: float
    experience_score: float
    education_score: float
    match_details: dict
    scored_at: datetime

    class Config:
        from_attributes = True


class ScoreTriggeredResponse(BaseModel):
    """Response when scoring is triggered."""

    message: str
    application_id: int


# --- Endpoints ---

@router.get(
    "/jobs/{job_id}/applications/{app_id}/score",
    response_model=ScoringResultResponse | None,
)
async def get_application_score(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Get existing scoring result for an application."""
    result = await db.execute(
        select(ScoringResult)
        .join(Application)
        .where(
            ScoringResult.application_id == app_id,
            Application.job_id == job_id,
        )
    )
    score = result.scalar_one_or_none()

    if not score:
        return None

    return ScoringResultResponse(
        id=score.id,
        application_id=score.application_id,
        total_score=score.total_score,
        skill_match_score=score.skill_match_score,
        experience_score=score.experience_score,
        education_score=score.education_score,
        match_details=score.match_details,
        scored_at=score.scored_at,
    )


@router.post(
    "/jobs/{job_id}/applications/{app_id}/score",
    response_model=ScoringResultResponse,
)
async def trigger_scoring(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Run scoring (keyword + embedding combined) and return result."""
    result = await db.execute(
        select(Application).where(
            Application.id == app_id,
            Application.job_id == job_id,
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Job creator, HR, Admin or Recruiter can trigger scoring
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    allowed_roles = {"admin", "hr", "manager", "recruiter", "leader"}
    if job and job.created_by != current_user.id and current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Chỉ HR hoặc người quản lý mới có quyền chấm điểm ứng viên")

    def _run_scoring():
        with get_sync_session() as sync_db:
            return score_application_sync(sync_db, app_id)

    score = await asyncio.to_thread(_run_scoring)
    if not score:
        raise HTTPException(
            status_code=400,
            detail="Không thể chấm điểm: Ứng viên chưa đính kèm CV hoặc file CV không có nội dung chữ dạng text.",
        )

    return ScoringResultResponse(
        id=score.id,
        application_id=score.application_id,
        total_score=score.total_score,
        skill_match_score=score.skill_match_score,
        experience_score=score.experience_score,
        education_score=score.education_score,
        match_details=score.match_details,
        scored_at=score.scored_at,
    )


class ScoreAllResponse(BaseModel):
    message: str
    count: int
    scored: int


@router.post(
    "/jobs/{job_id}/score-all",
    response_model=ScoreAllResponse,
)
async def trigger_score_all(
    job_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Score all applications for a job synchronously."""
    # Job creator, HR, Admin or Recruiter can trigger scoring
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    allowed_roles = {"admin", "hr", "manager", "recruiter", "leader"}
    if job and job.created_by != current_user.id and current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Chỉ HR hoặc người quản lý mới có quyền chấm điểm ứng viên")

    result = await db.execute(
        select(Application.id).where(Application.job_id == job_id)
    )
    app_ids = list(result.scalars().all())

    if not app_ids:
        raise HTTPException(status_code=404, detail="No applications found")

    def _run_all():
        scored = 0
        with get_sync_session() as sync_db:
            for aid in app_ids:
                r = score_application_sync(sync_db, aid)
                if r:
                    scored += 1
        return scored

    scored = await asyncio.to_thread(_run_all)

    return ScoreAllResponse(
        message=f"Scored {scored}/{len(app_ids)} applications",
        count=len(app_ids),
        scored=scored,
    )


# --- Match Details ---

class ResumeSnippet(BaseModel):
    keyword: str
    context: str
    section: str = "full_text"


class MatchDetailsResponse(BaseModel):
    candidate_name: str
    total_score: float
    skill_match_score: float
    experience_score: float
    education_score: float
    match_details: dict
    resume_snippets: list[ResumeSnippet]
    scored_at: datetime


def _extract_snippets(
    text: str,
    keywords: list[str],
    max_snippets: int = 6,
    context_chars: int = 80,
) -> list[ResumeSnippet]:
    """Extract text snippets around matched keywords."""
    snippets: list[ResumeSnippet] = []
    text_lower = text.lower()

    for kw in keywords:
        if len(snippets) >= max_snippets:
            break
        kw_lower = kw.lower()
        pos = text_lower.find(kw_lower)
        if pos == -1:
            continue
        start = max(0, pos - context_chars)
        end = min(len(text), pos + len(kw) + context_chars)
        prefix = "..." if start > 0 else ""
        suffix = "..." if end < len(text) else ""
        snippet_text = prefix + text[start:end].strip() + suffix
        snippets.append(ResumeSnippet(keyword=kw, context=snippet_text))

    return snippets


@router.get(
    "/jobs/{job_id}/applications/{app_id}/match-details",
    response_model=MatchDetailsResponse,
)
async def get_match_details(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Get detailed match breakdown including resume snippets."""
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.resume),
            selectinload(Application.scoring_result),
        )
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    score = app.scoring_result
    if not score:
        raise HTTPException(status_code=404, detail="No scoring result found")

    # Extract snippets from resume around matched keywords
    resume_snippets: list[ResumeSnippet] = []
    resume_text = app.resume.raw_text if app.resume else None
    if resume_text and score.match_details:
        skills_data = score.match_details.get("skills", {})
        matched_keywords = (
            skills_data.get("matched_must", [])
            + skills_data.get("matched_nice", [])
        )
        resume_snippets = _extract_snippets(resume_text, matched_keywords)

    return MatchDetailsResponse(
        candidate_name=app.candidate.full_name if app.candidate else "N/A",
        total_score=score.total_score,
        skill_match_score=score.skill_match_score,
        experience_score=score.experience_score,
        education_score=score.education_score,
        match_details=score.match_details,
        resume_snippets=resume_snippets,
        scored_at=score.scored_at,
    )


# --- AI Evaluation ---

class AiEvaluationResponse(BaseModel):
    """AI evaluation result for a shortlisted application."""

    application_id: int
    ai_score: float | None
    ai_evaluation: dict | None
    ai_evaluated_at: datetime | None
    has_evaluation: bool


@router.get(
    "/jobs/{job_id}/applications/{app_id}/ai-evaluation",
    response_model=AiEvaluationResponse,
)
async def get_ai_evaluation(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Get AI evaluation result for a shortlisted application."""
    result = await db.execute(
        select(ScoringResult)
        .join(Application)
        .where(
            ScoringResult.application_id == app_id,
            Application.job_id == job_id,
        )
    )
    score = result.scalar_one_or_none()

    if not score:
        return AiEvaluationResponse(
            application_id=app_id,
            ai_score=None,
            ai_evaluation=None,
            ai_evaluated_at=None,
            has_evaluation=False,
        )

    return AiEvaluationResponse(
        application_id=app_id,
        ai_score=score.ai_score,
        ai_evaluation=score.ai_evaluation,
        ai_evaluated_at=score.ai_evaluated_at,
        has_evaluation=score.ai_evaluation is not None,
    )
