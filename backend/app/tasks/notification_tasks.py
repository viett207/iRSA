"""Celery tasks for email notifications."""

import asyncio
import logging
from html import escape

from app.tasks.celery_app import celery_app
from app.services.email import send_status_notification_email

logger = logging.getLogger(__name__)


def run_async(coro):
    """Run async function in sync context with proper cleanup."""
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


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_status_change_notification(
    self,
    email: str,
    full_name: str,
    job_title: str,
    status: str,
):
    """
    Send email notification when application status changes.

    Args:
        email: Candidate email address
        full_name: Candidate full name
        job_title: Job title (Vietnamese)
        status: New application status
    """
    logger.info(f"Sending status notification to {email}: {status}")

    try:
        result = run_async(
            send_status_notification_email(email, full_name, job_title, status)
        )

        if result:
            logger.info(f"Status notification sent to {email}")
            return {"status": "sent", "email": email}
        else:
            logger.warning(f"Failed to send notification to {email}")
            return {"status": "failed", "email": email}

    except Exception as e:
        logger.exception(f"Error sending notification to {email}: {e}")
        self.retry(exc=e)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_application_received_notification(
    self,
    email: str,
    full_name: str,
    job_title: str,
):
    """
    Send email confirmation when application is received.

    Args:
        email: Candidate email address
        full_name: Candidate full name
        job_title: Job title (Vietnamese)
    """
    from app.services.email import send_email

    logger.info(f"Sending application confirmation to {email}")

    safe_name = escape(full_name)
    safe_job_title = escape(job_title)

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #1890ff; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 30px 20px; background: #f9f9f9; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Đã nhận hồ sơ ứng tuyển</h2>
            </div>
            <div class="content">
                <p>Xin chào <strong>{safe_name}</strong>,</p>
                <p>Cảm ơn bạn đã ứng tuyển vị trí <strong>{safe_job_title}</strong>.</p>
                <p>Chúng tôi đã nhận được hồ sơ của bạn và sẽ xem xét trong thời gian sớm nhất.</p>
                <p>Bạn có thể theo dõi trạng thái đơn ứng tuyển tại trang cá nhân.</p>
            </div>
            <div class="footer">
                <p>© iRSA - Intelligent Resume Screening Automation</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        result = run_async(
            send_email(
                to_email=email,
                subject=f"[iRSA] Đã nhận hồ sơ ứng tuyển - {safe_job_title}",
                html_content=html_content,
            )
        )

        if result:
            logger.info(f"Application confirmation sent to {email}")
            return {"status": "sent", "email": email}
        else:
            logger.warning(f"Failed to send confirmation to {email}")
            return {"status": "failed", "email": email}

    except Exception as e:
        logger.exception(f"Error sending confirmation to {email}: {e}")
        self.retry(exc=e)
