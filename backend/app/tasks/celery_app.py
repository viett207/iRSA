"""Celery application configuration with automatic local eager fallback when Redis is offline."""

import socket
import logging
from celery import Celery
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def check_redis_available(redis_url: str) -> bool:
    """Check if Redis broker is reachable with a 1-second timeout."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(redis_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except Exception:
        return False


redis_online = check_redis_available(settings.REDIS_URL)

celery_app = Celery(
    "irsa",
    broker=settings.REDIS_URL if redis_online else "memory://",
    backend=settings.REDIS_URL if redis_online else "rpc://",
    include=[
        "app.tasks.notification_tasks",
        "app.tasks.scoring_tasks",
        "app.tasks.ai_evaluation_tasks",
    ],
)

# Configuration
config_update = {
    # Task settings
    "task_serializer": "json",
    "accept_content": ["json"],
    "result_serializer": "json",
    "timezone": "Asia/Ho_Chi_Minh",
    "enable_utc": True,

    # Retry settings
    "task_acks_late": True,
    "task_reject_on_worker_lost": True,

    # Concurrency
    "worker_prefetch_multiplier": 1,
    "worker_concurrency": 4,

    # Task time limits
    "task_soft_time_limit": 300,  # 5 minutes soft limit
    "task_time_limit": 360,  # 6 minutes hard limit

    # Result backend
    "result_expires": 86400,  # 24 hours
}

if not redis_online:
    logger.warning("Redis is offline at %s. Celery operating in local eager mode (task_always_eager=True).", settings.REDIS_URL)
    config_update.update({
        "task_always_eager": True,
        "task_eager_propagates": True,
    })

celery_app.conf.update(**config_update)
