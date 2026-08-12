"""Celery tasks for resume scoring."""

import logging

from app.tasks.celery_app import celery_app
from app.core.database import get_sync_session

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def score_application_task(self, application_id: int):
    """Score a single application asynchronously.

    Called automatically on application submission
    or manually via the 'Calculate Score' button.
    """
    logger.info(f"Scoring application {application_id}")

    try:
        from app.services.scoring import score_application_sync

        with get_sync_session() as db:
            result = score_application_sync(db, application_id)

        if result:
            logger.info(
                f"Application {application_id} scored: {result.total_score}"
            )
            return {
                "status": "scored",
                "application_id": application_id,
                "total_score": result.total_score,
            }
        else:
            logger.warning(
                f"Application {application_id}: insufficient data for scoring"
            )
            return {
                "status": "skipped",
                "application_id": application_id,
                "reason": "insufficient_data",
            }

    except Exception as e:
        logger.exception(f"Error scoring application {application_id}: {e}")
        self.retry(exc=e)
