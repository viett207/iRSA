"""Database tools for AI Agent to read candidate CV/job criteria and save evaluation results."""

import logging
from typing import Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload, Session

from app.models import Application, Job, JobCriteria, Resume
from app.models.scoring_result import ScoringResult

logger = logging.getLogger(__name__)


def fetch_application_data(db: Session, application_id: int) -> Optional[Dict[str, Any]]:
    """Fetch complete data for application including Job Criteria, Candidate, and Resume text."""
    stmt = (
        select(Application)
        .options(
            selectinload(Application.job).selectinload(Job.criteria),
            selectinload(Application.candidate),
            selectinload(Application.resume),
        )
        .where(Application.id == application_id)
    )
    app = db.execute(stmt).scalar_one_or_none()
    if not app or not app.job or not app.resume:
        logger.warning(f"Application {application_id} missing job or resume data")
        return None

    criteria = app.job.criteria
    must_have = (criteria.must_have_skills or []) if criteria else []
    nice_to_have = (criteria.nice_to_have_skills or []) if criteria else []
    min_exp = criteria.min_experience_years if criteria else 0
    max_exp = criteria.max_experience_years if criteria else None
    min_edu = criteria.min_education if criteria else None

    job_title = getattr(app.job, "title_vi", None) or getattr(app.job, "title", "Position")

    return {
        "application_id": app.id,
        "job_title": job_title,
        "candidate_name": app.candidate.full_name if app.candidate else "N/A",
        "recruiter_email": getattr(app.job, "creator_email", None) or (app.candidate.email if app.candidate else None),
        "recruiter_name": "HR Manager",
        "resume_text": app.resume.raw_text or "",
        "must_have_skills": must_have,
        "nice_to_have_skills": nice_to_have,
        "min_experience_years": min_exp,
        "max_experience_years": max_exp,
        "min_education": min_edu,
    }


def save_agent_evaluation(db: Session, application_id: int, ai_score: float, evaluation_dict: Dict[str, Any]) -> bool:
    """Save AI Agent evaluation output to scoring_results table in PostgreSQL."""
    try:
        from datetime import datetime, timezone
        stmt = select(ScoringResult).where(ScoringResult.application_id == application_id)
        result = db.execute(stmt).scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if result:
            result.ai_score = ai_score
            result.ai_evaluation = evaluation_dict
            result.ai_evaluated_at = now
        else:
            result = ScoringResult(
                application_id=application_id,
                total_score=ai_score,
                skill_match_score=ai_score,
                experience_score=ai_score,
                education_score=ai_score,
                match_details={},
                ai_score=ai_score,
                ai_evaluation=evaluation_dict,
                ai_evaluated_at=now,
            )
            db.add(result)
        db.commit()
        logger.info(f"Agent evaluation saved successfully for Application {application_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to save agent evaluation for App {application_id}: {e}")
        db.rollback()
        return False
