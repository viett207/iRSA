"""Notification tools for Agent to email HR recruiter with evaluation summary."""

import logging
import asyncio
from typing import Dict, Any
from app.services.email import send_ai_evaluation_email

logger = logging.getLogger(__name__)


async def send_hr_notification_async(
    recruiter_email: str,
    recruiter_name: str,
    candidate_name: str,
    job_title: str,
    ai_result: Dict[str, Any],
) -> bool:
    """Agent tool: Send HR notification email asynchronously."""
    if not recruiter_email:
        logger.info("No recruiter email provided, skipping notification tool")
        return False

    try:
        success = await send_ai_evaluation_email(
            recruiter_email=recruiter_email,
            recruiter_name=recruiter_name or "HR Manager",
            candidate_name=candidate_name,
            job_title=job_title,
            ai_result=ai_result,
        )
        logger.info(f"Agent HR notification email status: {success}")
        return success
    except Exception as e:
        logger.error(f"Agent HR notification tool failed: {e}")
        return False
