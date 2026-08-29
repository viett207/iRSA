import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.api.public.jobs import _process_new_application_ai


@pytest.mark.asyncio
async def test_process_new_application_ai_success():
    """Verify that _process_new_application_ai runs match scoring and AI evaluation agent."""
    with patch("app.core.database.get_sync_session") as mock_get_sync, \
         patch("app.services.scoring.score_application_sync") as mock_score_sync, \
         patch("src.services.agent_service.run_evaluation_agent", new_callable=AsyncMock) as mock_agent, \
         patch("app.core.database.AsyncSessionLocal") as mock_async_factory, \
         patch("app.services.notification_service.notify_hr_ai_evaluation_completed", new_callable=AsyncMock) as mock_notify:

        # Mock sync DB session
        mock_db = MagicMock()
        mock_get_sync.return_value.__enter__.return_value = mock_db

        # Mock score result
        mock_score_res = MagicMock()
        mock_score_res.total_score = 88.5
        mock_score_sync.return_value = mock_score_res

        # Mock agent result
        mock_agent.return_value = {"ai_score": 90.0, "recommendation": "GOOD_FIT"}

        # Mock DB select app for notification
        mock_app = MagicMock()
        mock_app.job_id = 1
        mock_app.job.created_by = 10
        mock_app.job.title_vi = "Backend Engineer"
        mock_app.candidate.full_name = "Nguyen Van A"
        mock_app.scoring_result.ai_score = 90.0
        mock_app.scoring_result.ai_evaluation = {"recommendation": "GOOD_FIT"}
        mock_db.execute.return_value.scalar_one_or_none.return_value = mock_app

        # Mock async session
        mock_async_session = AsyncMock()
        mock_async_factory.return_value.__aenter__.return_value = mock_async_session

        await _process_new_application_ai(123)

        # Assert match scoring was called
        mock_score_sync.assert_called_once_with(mock_db, 123)

        # Assert AI agent was called
        mock_agent.assert_called_once_with(None, 123)

        # Assert HR was notified
        mock_notify.assert_called_once()
