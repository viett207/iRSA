"""Celery task for AI Evaluation Agent execution on shortlisted candidates."""

import asyncio
import logging

from app.tasks.celery_app import celery_app
from app.core.database import get_sync_session

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run async function in sync Celery context with proper cleanup."""
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
        finally:
            loop.close()
            asyncio.set_event_loop(None)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def ai_evaluate_application_task(self, application_id: int):
    """Run LangGraph AI Evaluation Agent for a shortlisted application.

    Auto-triggered when application status changes to 'shortlisted'
    or via manual trigger in Admin UI.
    """
    logger.info(f"Starting LangGraph AI Evaluation Agent for application {application_id}")

    try:
        from src.services.agent_service import run_evaluation_agent
        res = _run_async(run_evaluation_agent(None, application_id))

        if res and res.get("ai_score") is not None:
            logger.info(
                f"AI Evaluation Agent complete for app {application_id}: "
                f"score={res.get('ai_score')}, email_sent={res.get('email_sent')}"
            )
            return {
                "status": "evaluated",
                "application_id": application_id,
                "ai_score": res.get("ai_score"),
                "email_sent": res.get("email_sent"),
            }
        else:
            logger.warning(f"AI evaluation skipped or failed for app {application_id}")
            return {
                "status": "skipped",
                "application_id": application_id,
                "reason": "missing_data_or_evaluation_failed",
            }
    except Exception as e:
        logger.exception(f"AI evaluation failed for app {application_id}: {e}")
        self.retry(exc=e)

