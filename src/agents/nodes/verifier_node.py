"""Node 4: Verifier Node — Self-Reflection, Evidence Grounding & Consistency Verification."""

import logging
import re
from typing import List, Dict, Any

from src.agents.state import AgentState

logger = logging.getLogger(__name__)


def _is_evidence_grounded(evidence: str, skill: str, resume_text: str) -> bool:
    """Verify if the cited evidence or skill actually exists in the CV text."""
    if not evidence or evidence.lower() in ["không tìm thấy trong cv", "không tìm thấy", "n/a"]:
        return False

    text_lower = resume_text.lower()
    
    # Check 1: Direct skill mention in CV
    skill_clean = skill.strip().lower()
    if skill_clean in text_lower or re.search(rf"\b{re.escape(skill_clean)}\b", text_lower):
        return True

    # Check 2: Substring or significant token match of evidence snippet
    ev_clean = evidence.strip().lower()
    if ev_clean in text_lower:
        return True

    # Token overlap of evidence snippet
    ev_tokens = [w for w in re.findall(r"\w+", ev_clean) if len(w) > 2]
    if ev_tokens:
        matched = [w for w in ev_tokens if w in text_lower]
        if len(matched) / len(ev_tokens) >= 0.6:
            return True

    return False


async def verifier_node(state: AgentState) -> dict:
    """Verify evaluation outputs, detect hallucinations in evidence, and ensure scoring consistency."""
    score = float(state.get("overall_score", 0.0))
    questions = state.get("interview_questions", [])
    recommendation = state.get("recommendation", "NOT_FIT")
    attempts = state.get("reflection_attempts", 0) + 1
    resume_text = (state.get("resume_text") or "").strip()
    must_have = state.get("must_have_skills", [])
    nice_to_have = state.get("nice_to_have_skills", [])
    skill_assessments: List[Dict[str, Any]] = state.get("skill_assessments", [])

    logger.info(f"[Node 4: Verifier] Running Grounding & Self-Reflection Verification (Attempt {attempts})...")

    # 1. Hallucination Check: Verify every 'found: true' skill has real grounding in CV
    hallucination_found = False
    verified_skills = []
    verified_must_count = 0
    verified_nice_count = 0

    for item in skill_assessments:
        skill_name = item.get("skill", "")
        is_found = item.get("found", False)
        evidence_text = item.get("evidence", "")
        
        is_must = skill_name in must_have

        if is_found:
            grounded = _is_evidence_grounded(evidence_text, skill_name, resume_text)
            if not grounded:
                logger.warning(
                    f"[Node 4: Verifier] Hallucination detected for skill '{skill_name}'! "
                    f"Evidence '{evidence_text}' not grounded in CV. Correcting found -> False."
                )
                hallucination_found = True
                verified_skills.append({
                    **item,
                    "found": False,
                    "confidence": 95.0,
                    "evidence": "Không tìm thấy bằng chứng xác thực trong CV (AI trích dẫn không khớp)",
                    "level": "unknown",
                })
            else:
                verified_skills.append(item)
                if is_must:
                    verified_must_count += 1
                else:
                    verified_nice_count += 1
        else:
            verified_skills.append(item)

    # 2. Consistency Check: Enforce Score-Skill alignment
    corrected_score = score
    total_must = len(must_have)

    if total_must > 0:
        if verified_must_count == 0:
            # 0 must-have skills matched => Score cannot exceed 20
            if corrected_score > 20.0:
                logger.warning(
                    f"[Node 4: Verifier] Inconsistency: Score {corrected_score} too high for 0/{total_must} must-have skills. Adjusting score to 15.0."
                )
                corrected_score = 15.0
                recommendation = "NOT_FIT"
        elif (verified_must_count / total_must) < 0.5:
            # < 50% must-have skills matched => Score cannot exceed 45
            if corrected_score > 45.0:
                logger.warning(
                    f"[Node 4: Verifier] Inconsistency: Score {corrected_score} too high for {verified_must_count}/{total_must} must-have skills. Adjusting score to 40.0."
                )
                corrected_score = 40.0
                recommendation = "WEAK_FIT"

    # Align recommendation with score
    if corrected_score >= 85.0:
        recommendation = "STRONG_FIT"
    elif corrected_score >= 70.0:
        recommendation = "GOOD_FIT"
    elif corrected_score >= 50.0:
        recommendation = "PARTIAL_FIT"
    elif corrected_score >= 30.0:
        recommendation = "WEAK_FIT"
    else:
        recommendation = "NOT_FIT"

    # 3. Overall validation criteria
    is_valid_score = 0.0 <= corrected_score <= 100.0
    has_questions = len(questions) >= 1
    has_recommendation = recommendation in ["STRONG_FIT", "GOOD_FIT", "PARTIAL_FIT", "WEAK_FIT", "NOT_FIT"]
    passed = is_valid_score and has_questions and has_recommendation and not hallucination_found

    feedback = (
        "Kiểm định thành công: Tất cả bằng chứng trích dẫn khớp thực tế trong CV và điểm số nhất quán."
        if passed
        else f"Kiểm định hoàn tất (lần {attempts}): Đã rà soát và điều chỉnh các chỉ số chưa nhất quán."
    )

    logger.info(
        f"[Node 4: Verifier] Verification result: Passed={passed}, Score={corrected_score}, "
        f"Rec={recommendation}, Verified Must-Haves={verified_must_count}/{total_must}"
    )

    return {
        "overall_score": corrected_score,
        "recommendation": recommendation,
        "skill_assessments": verified_skills,
        "verification_passed": passed,
        "verification_feedback": feedback,
        "reflection_attempts": attempts,
    }

