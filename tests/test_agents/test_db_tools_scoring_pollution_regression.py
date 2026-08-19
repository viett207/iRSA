"""Regression tests demonstrating scoring contamination / pollution in save_agent_evaluation.

Proves that when save_agent_evaluation is called for an application that DOES NOT YET
have a ScoringResult record in the database:
1. It creates a new ScoringResult object.
2. It simultaneously copies ai_score into all four deterministic screening score columns:
   - total_score = ai_score
   - skill_match_score = ai_score
   - experience_score = ai_score
   - education_score = ai_score
3. It sets match_details = {} (empty), creating synthetic/fake deterministic scores without evidence.

Also verifies the contrasting behavior when a ScoringResult record ALREADY EXISTS:
- Only ai_score, ai_evaluation, and ai_evaluated_at are updated.
- Existing deterministic scores (total_score, skill_match_score, etc.) remain intact.
"""

from unittest.mock import MagicMock
import pytest

from src.agents.tools.db_tools import save_agent_evaluation
from app.models.scoring_result import ScoringResult


def test_save_agent_evaluation_pollutes_deterministic_scores_when_no_prior_record():
    """Prove that save_agent_evaluation writes ai_score into total_score,

    skill_match_score, experience_score, and education_score when creating a new record.
    """
    mock_db = MagicMock()
    # Simulate: No existing ScoringResult for this application
    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    target_app_id = 999
    ai_score_value = 88.5
    eval_dict = {
        "overall_score": 88.5,
        "overall_assessment": "Ứng viên rất xuất sắc.",
        "recommendation": "STRONG_FIT",
        "skill_assessments": [{"skill": "Python", "found": True}],
    }

    # Execute
    success = save_agent_evaluation(
        db=mock_db,
        application_id=target_app_id,
        ai_score=ai_score_value,
        evaluation_dict=eval_dict,
    )

    assert success is True
    assert mock_db.commit.called is True

    # Capture the ScoringResult object added to the session
    assert mock_db.add.called is True
    added_obj = mock_db.add.call_args[0][0]

    assert isinstance(added_obj, ScoringResult)
    assert added_obj.application_id == target_app_id
    assert added_obj.ai_score == ai_score_value
    assert added_obj.ai_evaluation == eval_dict

    # PROOF OF THE DEFECT: All 4 deterministic scoring fields are contaminated with ai_score:
    assert added_obj.total_score == ai_score_value, (
        f"Defect demonstrated: total_score was set to ai_score ({ai_score_value}) instead of remaining uncomputed or 0.0"
    )
    assert added_obj.skill_match_score == ai_score_value, (
        f"Defect demonstrated: skill_match_score was set to ai_score ({ai_score_value})"
    )
    assert added_obj.experience_score == ai_score_value, (
        f"Defect demonstrated: experience_score was set to ai_score ({ai_score_value})"
    )
    assert added_obj.education_score == ai_score_value, (
        f"Defect demonstrated: education_score was set to ai_score ({ai_score_value})"
    )
    assert added_obj.match_details == {}, (
        "Defect demonstrated: match_details is empty dict {} despite having non-zero scores"
    )


def test_save_agent_evaluation_preserves_deterministic_scores_when_record_exists():
    """Verify that when a ScoringResult record already exists from Phase 1 screening,

    save_agent_evaluation updates ONLY the AI columns and preserves original deterministic scores.
    """
    mock_db = MagicMock()

    # Pre-existing Phase 1 screening record with authentic deterministic breakdown
    existing_record = ScoringResult(
        application_id=101,
        total_score=62.5,
        skill_match_score=50.0,
        experience_score=75.0,
        education_score=100.0,
        match_details={"skills": {"matched_must": ["Python"]}},
        ai_score=None,
        ai_evaluation=None,
        ai_evaluated_at=None,
    )

    mock_db.execute.return_value.scalar_one_or_none.return_value = existing_record

    target_app_id = 101
    ai_score_value = 92.0
    eval_dict = {
        "overall_score": 92.0,
        "overall_assessment": "Đánh giá sâu chuyên môn đạt điểm cao.",
        "recommendation": "STRONG_FIT",
    }

    # Execute
    success = save_agent_evaluation(
        db=mock_db,
        application_id=target_app_id,
        ai_score=ai_score_value,
        evaluation_dict=eval_dict,
    )

    assert success is True
    assert mock_db.commit.called is True
    assert mock_db.add.called is False  # Update in place, no add called

    # AI columns are updated
    assert existing_record.ai_score == 92.0
    assert existing_record.ai_evaluation == eval_dict
    assert existing_record.ai_evaluated_at is not None

    # Original deterministic scores remain untouched
    assert existing_record.total_score == 62.5, "Original Phase 1 total_score must be preserved"
    assert existing_record.skill_match_score == 50.0, "Original skill_match_score must be preserved"
    assert existing_record.experience_score == 75.0, "Original experience_score must be preserved"
    assert existing_record.education_score == 100.0, "Original education_score must be preserved"
    assert "skills" in existing_record.match_details, "Original match_details must be preserved"


def test_save_agent_evaluation_handles_database_error_and_rolls_back():
    """Verify that if database commit fails, save_agent_evaluation triggers rollback and returns False."""
    mock_db = MagicMock()
    mock_db.execute.return_value.scalar_one_or_none.return_value = None
    mock_db.commit.side_effect = Exception("PostgreSQL Connection Terminated")

    success = save_agent_evaluation(
        db=mock_db,
        application_id=102,
        ai_score=70.0,
        evaluation_dict={},
    )

    assert success is False
    assert mock_db.rollback.called is True
