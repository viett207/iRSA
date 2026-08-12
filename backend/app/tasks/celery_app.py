"""Celery application configuration."""

from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "irsa",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.notification_tasks",
        "app.tasks.scoring_tasks",
        "app.tasks.ai_evaluation_tasks",
    ],
)

# Configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,

    # Retry settings
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # Concurrency
    worker_prefetch_multiplier=1,
    worker_concurrency=4,

    # Task time limits
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=360,  # 6 minutes hard limit

    # Result backend
    result_expires=86400,  # 24 hours
)
