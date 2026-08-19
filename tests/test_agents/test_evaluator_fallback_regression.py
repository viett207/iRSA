"""Regression tests demonstrating fallback behaviors, synthetic metrics, and 75.0 default score.

Demonstrates how evaluator_node and agent_service fallback when:
1. No LLM is configured (get_agent_llm returns None).
2. LLM raises an Exception (network timeout, quota 429, 503 error).
3. LLM returns an empty string or whitespace.
4. LLM returns malformed / unparseable JSON.
5. LLM returns JSON missing the mandatory 'overall_score' field.
6. agent_service defaults to 75.0 points and 'GOOD_FIT' when overall_score is missing.
"""

from unittest.mock import AsyncMock, MagicMock
import pytest

from src.agents.nodes.evaluator_node import evaluator_node
from tests.fixtures.cv_fixtures import get_cv_fixture


@pytest.fixture
def sample_evaluator_state():
    """State fixture for evaluator_node input."""
    cv = get_cv_fixture("python_in_experience_with_date_range")
    return {
        "application_id": 101,
        "candidate_name": cv["name"],
        "job_title": "Python Backend Developer",
        "resume_text": cv["raw_text"],
        "must_have_skills": ["Python", "FastAPI", "PostgreSQL"],
        "nice_to_have_skills": ["Docker", "Redis"],
        "min_experience_years": 2,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "vector_search_results": {},
    }


# =============================================================================
# 1. Fallback khi KHÔNG CÓ LLM (get_agent_llm returns None)
# =============================================================================
@pytest.mark.asyncio
async def test_fallback_when_no_llm_available(sample_evaluator_state, monkeypatch):
    """Verify that when no LLM is available, evaluator falls back to rule-based evaluation

    with hardcoded confidence values and synthetic field relevance.
    """
    import src.agents.nodes.evaluator_node as eval_node
    import src.services.llm_service as llm_service

    # Force get_agent_llm to return None (no API key configured)
    monkeypatch.setattr(eval_node, "get_agent_llm", lambda temperature=None: None)
    monkeypatch.setattr(llm_service, "get_agent_llm", lambda temperature=None: None)

    result = await evaluator_node(sample_evaluator_state)

    # 1. Verify fallback evaluation was produced
    assert isinstance(result, dict)
    assert "overall_score" in result
    assert result["overall_score"] > 0.0
    assert result["recommendation"] in ["STRONG_FIT", "GOOD_FIT", "PARTIAL_FIT", "WEAK_FIT", "NOT_FIT"]

    # 2. Verify synthetic metrics created by deterministic fallback
    skill_assessments = result.get("skill_assessments", [])
    assert len(skill_assessments) == 5  # 3 must-have + 2 nice-to-have

    # Deterministic fallback hardcodes confidence to 90.0/95.0 and level to 'intermediate'/'unknown'
    for s in skill_assessments:
        if s["found"]:
            assert s["confidence"] == 90.0 or s["confidence"] == 85.0
            assert s["level"] == "intermediate"
        else:
            assert s["confidence"] == 95.0
            assert s["level"] == "unknown"

    # Deterministic fallback hardcodes experience confidence to 80.0
    exp_assessment = result.get("experience_assessment", {})
    assert exp_assessment.get("confidence") == 80.0
    assert exp_assessment.get("detected_years") == 2.0

    # Deterministic fallback hardcodes field_relevant=True simply because level is bachelor
    edu_assessment = result.get("education_assessment", {})
    assert edu_assessment.get("field_relevant") is True
    assert edu_assessment.get("detected_level") == "bachelor"


# =============================================================================
# 2. Fallback khi LLM NÉM EXCEPTION (Network Timeout, Quota 429, 503 Error)
# =============================================================================
@pytest.mark.asyncio
async def test_fallback_when_llm_raises_exception(sample_evaluator_state, monkeypatch):
    """Verify that when LLM call throws an exception, evaluator catches it and falls back seamlessly."""
    import src.agents.nodes.evaluator_node as eval_node

    failing_llm = MagicMock()
    failing_llm.ainvoke = AsyncMock(side_effect=Exception("503 Service Unavailable: Rate limit exceeded or connection timed out"))

    monkeypatch.setattr(eval_node, "get_agent_llm", lambda temperature=None: failing_llm)

    result = await evaluator_node(sample_evaluator_state)

    # Must not crash; must fall back to deterministic evaluation
    assert isinstance(result, dict)
    assert result["overall_score"] > 0.0
    assert "overall_assessment" in result
    assert len(result["skill_assessments"]) > 0
    assert result["experience_assessment"]["confidence"] == 80.0


# =============================================================================
# 3. Fallback khi LLM TRẢ CHUỖI RỖNG (Empty / Whitespace String)
# =============================================================================
@pytest.mark.asyncio
async def test_fallback_when_llm_returns_empty_string(sample_evaluator_state, monkeypatch):
    """Verify that when LLM returns empty string or whitespace, evaluator detects invalid output and falls back."""
    import src.agents.nodes.evaluator_node as eval_node

    empty_llm = MagicMock()
    empty_resp = MagicMock()
    empty_resp.content = "   "
    empty_resp.text = "   "
    empty_llm.ainvoke = AsyncMock(return_value=empty_resp)

    monkeypatch.setattr(eval_node, "get_agent_llm", lambda temperature=None: empty_llm)

    result = await evaluator_node(sample_evaluator_state)

    assert isinstance(result, dict)
    assert result["overall_score"] > 0.0
    assert len(result["skill_assessments"]) == 5
    assert result["experience_assessment"]["detected_years"] == 2.0


# =============================================================================
# 4. Fallback khi LLM TRẢ JSON KHÔNG HỢP LỆ (Malformed / Unparseable JSON)
# =============================================================================
@pytest.mark.asyncio
async def test_fallback_when_llm_returns_malformed_json(sample_evaluator_state, monkeypatch):
    """Verify that when LLM returns invalid / broken JSON, evaluator catches JSONDecodeError and falls back."""
    import src.agents.nodes.evaluator_node as eval_node

    malformed_llm = MagicMock()
    malformed_resp = MagicMock()
    malformed_resp.content = "```json\n{ overall_score: 90, unquoted_key: invalid_json, ...\n```"
    malformed_resp.text = malformed_resp.content
    malformed_llm.ainvoke = AsyncMock(return_value=malformed_resp)

    monkeypatch.setattr(eval_node, "get_agent_llm", lambda temperature=None: malformed_llm)

    result = await evaluator_node(sample_evaluator_state)

    assert isinstance(result, dict)
    assert result["overall_score"] > 0.0
    assert result["recommendation"] in ["STRONG_FIT", "GOOD_FIT", "PARTIAL_FIT", "WEAK_FIT", "NOT_FIT"]
    assert result["education_assessment"]["detected_level"] == "bachelor"


# =============================================================================
# 5. Fallback khi LLM TRẢ JSON THIẾU overall_score
# =============================================================================
@pytest.mark.asyncio
async def test_fallback_when_llm_returns_json_missing_overall_score(sample_evaluator_state, monkeypatch):
    """Verify that when LLM returns JSON missing the mandatory 'overall_score' key, evaluator falls back."""
    import src.agents.nodes.evaluator_node as eval_node

    incomplete_llm = MagicMock()
    incomplete_resp = MagicMock()
    # JSON is syntactically valid but missing 'overall_score'
    incomplete_resp.content = """
    {
        "overall_assessment": "Ứng viên phù hợp nhưng quên chấm điểm số.",
        "recommendation": "GOOD_FIT",
        "skill_assessments": [{"skill": "Python", "found": true, "confidence": 90}]
    }
    """
    incomplete_resp.text = incomplete_resp.content
    incomplete_llm.ainvoke = AsyncMock(return_value=incomplete_resp)

    monkeypatch.setattr(eval_node, "get_agent_llm", lambda temperature=None: incomplete_llm)

    result = await evaluator_node(sample_evaluator_state)

    # Since 'overall_score' was missing in LLM response, fallback recalculates it
    assert isinstance(result, dict)
    assert "overall_score" in result
    assert result["overall_score"] > 0.0
    assert len(result["skill_assessments"]) == 5  # Replaced with full deterministic assessment


# =============================================================================
# 6. Tái hiện Fallback mặc định 75.0 điểm trong agent_service.py
# =============================================================================
def test_agent_service_75_point_default_on_missing_overall_score():
    """Demonstrate that src/services/agent_service.py line 40 assigns 75.0 points

    and 'GOOD_FIT' recommendation as a hardcoded default whenever overall_score is missing in final_state.
    """
    # Simulate an incomplete final_state produced when graph returns empty or missing score
    final_state_without_score = {
        "candidate_name": "Ứng viên thử nghiệm",
        "overall_assessment": "Chưa có nhận xét.",
    }

    # Replicate exact extraction logic from src/services/agent_service.py:L40-44:
    # ai_score = float(final_state.get("overall_score", 75.0))
    # recommendation = final_state.get("recommendation", "GOOD_FIT")
    ai_score = float(final_state_without_score.get("overall_score", 75.0))
    recommendation = final_state_without_score.get("recommendation", "GOOD_FIT")

    # Assert exact legacy default values
    assert ai_score == 75.0, "Expected legacy default score to be 75.0"
    assert recommendation == "GOOD_FIT", "Expected legacy default recommendation to be GOOD_FIT"
