"""Celery task for Gemini AI evaluation of shortlisted candidates."""

import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.tasks.celery_app import celery_app
from app.core.database import get_sync_session
from app.models import Application, Job

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run async function in sync Celery context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


def _send_evaluation_email(db, application_id: int, ai_result: dict) -> None:
    """Send AI evaluation results email to the job's recruiter."""
    try:
        from app.services.email import send_ai_evaluation_email

        app = db.execute(
            select(Application)
            .options(
                selectinload(Application.candidate),
                selectinload(Application.job).selectinload(Job.creator),
            )
            .where(Application.id == application_id)
        ).scalar_one_or_none()

        if not app or not app.job or not app.job.creator:
            logger.warning(f"App {application_id}: no recruiter to send email to")
            return

        recruiter = app.job.creator
        candidate_name = app.candidate.full_name if app.candidate else "N/A"
        job_title = app.job.title_vi if app.job else "N/A"

        sent = _run_async(send_ai_evaluation_email(
            recruiter_email=recruiter.email,
            recruiter_name=recruiter.full_name,
            candidate_name=candidate_name,
            job_title=job_title,
            ai_result=ai_result,
        ))

        if sent:
            logger.info(f"AI evaluation email sent to {recruiter.email} for app {application_id}")
        else:
            logger.warning(f"Failed to send AI evaluation email for app {application_id}")

    except Exception as e:
        # Don't fail the task if email fails
        logger.error(f"Error sending AI evaluation email for app {application_id}: {e}")


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def ai_evaluate_application_task(self, application_id: int):
    """Run Gemini AI deep skill assessment for a shortlisted application.

    Auto-triggered when application status changes to 'shortlisted'.
    Sends results email to recruiter after evaluation completes.
    """
    logger.info(f"Starting AI evaluation for application {application_id}")

    try:
        from app.services.ai_evaluation import evaluate_with_gemini

        with get_sync_session() as db:
            result = evaluate_with_gemini(db, application_id)

            if result and result.ai_score is not None:
                logger.info(
                    f"AI evaluation complete for app {application_id}: "
                    f"score={result.ai_score}"
                )

                # Auto-send email to recruiter
                _send_evaluation_email(db, application_id, result.ai_evaluation)

                return {
                    "status": "evaluated",
                    "application_id": application_id,
                    "ai_score": result.ai_score,
                }
            else:
                logger.warning(f"AI evaluation skipped for app {application_id}")
                return {
                    "status": "skipped",
                    "application_id": application_id,
                    "reason": "missing_data_or_api_key",
                }

    except Exception as e:
        logger.exception(f"AI evaluation failed for app {application_id}: {e}")
        self.retry(exc=e)
