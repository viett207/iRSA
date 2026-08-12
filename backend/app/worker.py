"""Celery worker entry point — re-exports celery_app with all tasks registered."""

from app.tasks.celery_app import celery_app  # noqa: F401
