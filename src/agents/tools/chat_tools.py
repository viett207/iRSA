"""Tools for Candidate AI Chatbot Assistant."""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload, Session

from app.models import Application, Job, JobCriteria, Resume, User
from app.models.scoring_result import ScoringResult

logger = logging.getLogger(__name__)


def get_candidate_profile(db: Session, application_id: int) -> Dict[str, Any]:
    """Retrieve full candidate profile, job details, and criteria."""
    stmt = (
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job).selectinload(Job.criteria),
            selectinload(Application.resume),
        )
        .where(Application.id == application_id)
    )
    app = db.execute(stmt).scalar_one_or_none()
    if not app:
        return {"error": f"Application {application_id} not found."}

    candidate = app.candidate
    job = app.job
    criteria = job.criteria if job else None

    return {
        "application_id": app.id,
        "candidate_name": candidate.full_name if candidate else "N/A",
        "candidate_email": candidate.email if candidate else "N/A",
        "candidate_phone": getattr(candidate, "phone", "N/A"),
        "status": app.status,
        "job_title": getattr(job, "title_vi", None) or getattr(job, "title", "N/A"),
        "department": getattr(job, "department", "N/A"),
        "salary_range": f"{job.salary_min or 0} - {job.salary_max or 0} VND" if job else "Thỏa thuận",
        "must_have_skills": criteria.must_have_skills if criteria else [],
        "nice_to_have_skills": criteria.nice_to_have_skills if criteria else [],
        "min_experience_years": criteria.min_experience_years if criteria else 0,
        "min_education": criteria.min_education if criteria else "N/A",
        "resume_length": len(app.resume.raw_text or "") if app.resume else 0,
    }


def search_cv(db: Session, application_id: int, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """Search for relevant text paragraphs/keywords in candidate's resume."""
    stmt = (
        select(Application)
        .options(selectinload(Application.resume))
        .where(Application.id == application_id)
    )
    app = db.execute(stmt).scalar_one_or_none()
    if not app or not app.resume or not app.resume.raw_text:
        return []

    text = app.resume.raw_text
    lines = [p.strip() for p in text.split("\n") if len(p.strip()) > 10]
    
    query_terms = [q.lower().strip() for q in query.split() if len(q.strip()) > 1]
    matches = []

    for line in lines:
        line_lower = line.lower()
        score = sum(1 for term in query_terms if term in line_lower)
        if score > 0:
            matches.append({"content": line, "score": score})

    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches[:max_results]


def get_evaluation_summary(db: Session, application_id: int) -> Dict[str, Any]:
    """Retrieve scoring breakdown and AI evaluation details."""
    stmt = select(ScoringResult).where(ScoringResult.application_id == application_id)
    result = db.execute(stmt).scalar_one_or_none()
    if not result:
        return {"error": "Chưa có kết quả chấm điểm."}

    return {
        "screening_total_score": result.total_score,
        "skill_match_score": result.skill_match_score,
        "experience_score": result.experience_score,
        "education_score": result.education_score,
        "ai_score": result.ai_score,
        "ai_evaluated_at": str(result.ai_evaluated_at) if result.ai_evaluated_at else None,
        "ai_evaluation": result.ai_evaluation or {},
    }
