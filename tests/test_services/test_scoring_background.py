"""Tests for automatic CV/JD scoring after an application is submitted."""

from types import SimpleNamespace
from unittest.mock import patch

from app.services.scoring import score_application_in_background


def test_background_scoring_uses_fresh_session_and_persists_result():
    score_result = SimpleNamespace(total_score=87.5)

    with (
        patch("app.core.database.get_sync_session") as get_session,
        patch(
            "app.services.scoring.score_application_sync",
            return_value=score_result,
        ) as score_application,
    ):
        db = get_session.return_value.__enter__.return_value

        score_application_in_background(42)

    score_application.assert_called_once_with(db, 42)
