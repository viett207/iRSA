"""Node 4: Verifier Node — Self-Reflection & Output Verification."""

import logging
from src.agents.state import AgentState

logger = logging.getLogger(__name__)


async def verifier_node(state: AgentState) -> dict:
    """Verify evaluation outputs, check consistency, and increment reflection attempts."""
    score = state.get("overall_score", 0.0)
    questions = state.get("interview_questions", [])
    recommendation = state.get("recommendation", "")
    attempts = state.get("reflection_attempts", 0) + 1

    logger.info(f"[Node 4: Verifier] Running Self-Reflection (Attempt {attempts})...")

    # Simple inspection criteria
    is_valid_score = 0.0 <= score <= 100.0
    has_questions = len(questions) >= 1
    has_recommendation = recommendation in ["STRONG_FIT", "GOOD_FIT", "PARTIAL_FIT", "WEAK_FIT", "NOT_FIT"]

    passed = is_valid_score and has_questions and has_recommendation
    feedback = "Tất cả các chỉ số đánh giá hợp lệ và đạt chuẩn." if passed else "Phát hiện chỉ số đánh giá chưa đạt chuẩn."

    logger.info(f"[Node 4: Verifier] Reflection status: Passed={passed}, Attempt={attempts}")

    return {
        "verification_passed": passed,
        "verification_feedback": feedback,
        "reflection_attempts": attempts,
    }
