"""Tests for background tasks management and Celery notification tasks."""

import asyncio
from unittest.mock import AsyncMock, patch
import pytest

from app.core.background_tasks import background_tasks, create_background_task
from app.tasks.notification_tasks import send_interview_notification, send_status_change_notification


@pytest.mark.asyncio
async def test_create_background_task_success():
    """Verify background task is added to set and discarded upon completion."""
    completed = False

    async def sample_coroutine():
        nonlocal completed
        await asyncio.sleep(0.01)
        completed = True
        return "success"

    task = create_background_task(sample_coroutine(), name="test_success_task")
    assert task in background_tasks
    assert not task.done()

    await task
    await asyncio.sleep(0.01)  # Allow done callback to execute

    assert completed is True
    assert task not in background_tasks


@pytest.mark.asyncio
async def test_create_background_task_exception_handled():
    """Verify exceptions in background task are captured without crashing and on_error is triggered."""
    error_caught = None

    def on_error(exc: Exception):
        nonlocal error_caught
        error_caught = exc

    async def failing_coroutine():
        await asyncio.sleep(0.01)
        raise ValueError("Task failed intentionally")

    task = create_background_task(
        failing_coroutine(),
        name="test_failing_task",
        on_error=on_error,
    )
    assert task in background_tasks

    with pytest.raises(ValueError, match="Task failed intentionally"):
        await task

    await asyncio.sleep(0.01)  # Allow done callback to execute

    assert task not in background_tasks
    assert isinstance(error_caught, ValueError)
    assert str(error_caught) == "Task failed intentionally"


def test_send_interview_notification_task():
    """Test send_interview_notification Celery task executes properly."""
    with patch(
        "app.services.email.send_interview_notification_email",
        new_callable=AsyncMock,
    ) as mock_send:
        mock_send.return_value = True

        result = send_interview_notification(
            email="candidate@example.com",
            full_name="Nguyen Van A",
            job_title="Software Engineer",
            interview_date="2026-08-20T10:00:00",
            interview_type="online",
            location="https://meet.google.com/xyz",
            notes="Please be on time",
        )

        assert result == {"status": "sent", "email": "candidate@example.com"}
        mock_send.assert_called_once_with(
            candidate_email="candidate@example.com",
            candidate_name="Nguyen Van A",
            job_title="Software Engineer",
            interview_date="2026-08-20T10:00:00",
            interview_type="online",
            location="https://meet.google.com/xyz",
            notes="Please be on time",
        )
