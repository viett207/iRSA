"""AI deep skill assessment using the LangGraph AI Evaluation Agent in src/."""

import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.scoring_result import ScoringResult
from src.services.agent_service import run_evaluation_agent

logger = logging.getLogger(__name__)


def evaluate_with_gemini(db: Session, application_id: int) -> ScoringResult | None:
    """Run AI Evaluation Agent for a shortlisted application.

    Delegates processing to the LangGraph AI Agent in src/services/agent_service.py.
    """
    logger.info(f"Executing LangGraph AI Evaluation Agent for application {application_id}...")

    try:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        agent_res = loop.run_until_complete(run_evaluation_agent(db, application_id))
    except Exception as e:
        logger.error(f"AI Agent execution failed for application {application_id}: {e}")
        return None

    if not agent_res:
        logger.warning(f"AI Agent returned no result for application {application_id}")
        return None

    existing = db.execute(
        select(ScoringResult).where(ScoringResult.application_id == application_id)
    ).scalar_one_or_none()

    return existing


