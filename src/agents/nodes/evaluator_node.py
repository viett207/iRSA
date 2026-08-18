"""Node 2: Evaluator Node — Deep skill assessment using Gemini LLM + Evidence matching."""

import asyncio
import json
import logging
import re
from typing import Dict, Any, List

from src.agents.state import AgentState
from src.services.llm_service import get_agent_llm
from src.agents.prompts.evaluation_prompts import EVALUATION_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


def _extract_skill_snippet(skill: str, text: str) -> str:
    """Find the exact line or surrounding sentence containing the skill."""
    escaped = re.escape(skill)
    # Search for sentence containing the skill
    pattern = rf"([^.\n]*\b{escaped}\b[^.\n]*)"
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        snippet = match.group(1).strip()
        if len(snippet) > 150:
            snippet = snippet[:150] + "..."
        return snippet
    return "Không tìm thấy trong CV"


def _deterministic_fallback_evaluation(
    resume_text: str,
    job_title: str,
    must_have: List[str],
    nice_to_have: List[str],
    min_exp: float,
    min_edu: str | None,
) -> Dict[str, Any]:
    """Honest deterministic fallback when LLM is unavailable or fails."""
    logger.info("[Node 2: Evaluator] Running deterministic rule-based evaluation fallback.")
    
    text_lower = resume_text.lower()
    
    # 1. Skill evaluation
    skill_assessments = []
    matched_must = 0
    matched_nice = 0
    
    for s in must_have:
        escaped = re.escape(s.lower())
        found = bool(re.search(rf"\b{escaped}\b", text_lower))
        evidence = _extract_skill_snippet(s, resume_text) if found else "Không tìm thấy trong CV"
        if found:
            matched_must += 1
        skill_assessments.append({
            "skill": s,
            "found": found,
            "confidence": 90.0 if found else 95.0,
            "evidence": evidence,
            "level": "intermediate" if found else "unknown",
        })
        
    for s in nice_to_have:
        escaped = re.escape(s.lower())
        found = bool(re.search(rf"\b{escaped}\b", text_lower))
        evidence = _extract_skill_snippet(s, resume_text) if found else "Không tìm thấy trong CV"
        if found:
            matched_nice += 1
        skill_assessments.append({
            "skill": s,
            "found": found,
            "confidence": 85.0 if found else 95.0,
            "evidence": evidence,
            "level": "intermediate" if found else "unknown",
        })

    # 2. Experience extraction
    exp_matches = re.findall(r"(\d{1,2})\s*(?:năm|year)", text_lower)
    detected_years = max([float(m) for m in exp_matches], default=0.0)
    
    # 3. Education detection
    edu_detected = "unknown"
    if any(k in text_lower for k in ["tiến sĩ", "phd", "doctor"]):
        edu_detected = "phd"
    elif any(k in text_lower for k in ["thạc sĩ", "master", "mba"]):
        edu_detected = "master"
    elif any(k in text_lower for k in ["cử nhân", "đại học", "kỹ sư", "bachelor", "university"]):
        edu_detected = "bachelor"
    elif any(k in text_lower for k in ["cao đẳng", "college"]):
        edu_detected = "college"
    elif any(k in text_lower for k in ["trung học", "thpt", "high school"]):
        edu_detected = "high_school"

    # 4. Compute honest score
    must_score = (matched_must / len(must_have) * 100.0) if must_have else 100.0
    nice_score = (matched_nice / len(nice_to_have) * 100.0) if nice_to_have else 100.0
    exp_score = min(100.0, (detected_years / min_exp * 100.0)) if min_exp > 0 else 100.0
    edu_score = 100.0 if edu_detected in ["bachelor", "master", "phd"] else 50.0

    total_score = round(0.50 * must_score + 0.20 * nice_score + 0.20 * exp_score + 0.10 * edu_score, 1)

    # Caps for missing must-haves
    if must_have and matched_must == 0:
        total_score = min(total_score, 20.0)
    elif must_have and (matched_must / len(must_have)) < 0.5:
        total_score = min(total_score, 45.0)

    if total_score >= 85:
        rec = "STRONG_FIT"
    elif total_score >= 70:
        rec = "GOOD_FIT"
    elif total_score >= 50:
        rec = "PARTIAL_FIT"
    elif total_score >= 30:
        rec = "WEAK_FIT"
    else:
        rec = "NOT_FIT"

    strengths = []
    if matched_must > 0:
        strengths.append(f"Đáp ứng {matched_must}/{len(must_have)} kỹ năng bắt buộc")
    if detected_years >= min_exp and min_exp > 0:
        strengths.append(f"Kinh nghiệm làm việc ({detected_years} năm) đáp ứng yêu cầu")
    if not strengths:
        strengths.append("Hồ sơ ứng tuyển đã được ghi nhận")

    concerns = []
    if must_have and matched_must < len(must_have):
        missing_count = len(must_have) - matched_must
        concerns.append(f"Chưa tìm thấy bằng chứng cho {missing_count} kỹ năng bắt buộc")
    if min_exp > 0 and detected_years < min_exp:
        concerns.append(f"Số năm kinh nghiệm phát hiện ({detected_years} năm) thấp hơn yêu cầu ({min_exp} năm)")

    return {
        "overall_score": total_score,
        "overall_assessment": f"Ứng viên đạt mức độ phù hợp {rec} ({total_score}/100) cho vị trí {job_title}. Hệ thống đã rà soát {len(skill_assessments)} kỹ năng theo yêu cầu.",
        "recommendation": rec,
        "skill_assessments": skill_assessments,
        "experience_assessment": {
            "detected_years": detected_years,
            "relevant_years": detected_years,
            "confidence": 80.0,
            "summary": f"Phát hiện khoảng {detected_years} năm kinh nghiệm trong hồ sơ."
        },
        "education_assessment": {
            "detected_level": edu_detected,
            "field_relevant": edu_detected in ["bachelor", "master", "phd"],
            "summary": f"Trình độ học vấn ghi nhận: {edu_detected}."
        },
        "strengths": strengths,
        "concerns": concerns,
    }


async def evaluator_node(state: AgentState) -> dict:
    """Evaluate candidate CV against job requirements using Gemini LLM with anti-hallucination safeguards."""
    resume_text = (state.get("resume_text") or "").strip()
    must_have = state.get("must_have_skills", [])
    nice_to_have = state.get("nice_to_have_skills", [])
    min_exp = state.get("min_experience_years", 0)
    max_exp = state.get("max_experience_years")
    min_edu = state.get("min_education")
    job_title = state.get("job_title", "Position")
    vector_results = state.get("vector_search_results", {})

    logger.info(f"[Node 2: Evaluator] Evaluating candidate against job '{job_title}' (CV length: {len(resume_text)} chars)...")

    # 1. Guard against empty/unreadable CV text (e.g. scanned image PDF)
    if not resume_text or len(resume_text) < 30:
        logger.warning(f"[Node 2: Evaluator] CV text is empty or too short ({len(resume_text)} chars). Returning NOT_FIT zero evaluation.")
        all_skills = must_have + nice_to_have
        return {
            "overall_score": 0.0,
            "overall_assessment": "Không tìm thấy nội dung văn bản trong hồ sơ ứng viên (hoặc CV là dạng ảnh scan không thể trích xuất văn bản). Không thể đánh giá độ phù hợp.",
            "recommendation": "NOT_FIT",
            "skill_assessments": [
                {
                    "skill": s,
                    "found": False,
                    "confidence": 100.0,
                    "evidence": "Không tìm thấy trong CV (CV không có nội dung văn bản)",
                    "level": "unknown"
                } for s in all_skills
            ],
            "experience_assessment": {
                "detected_years": 0.0,
                "relevant_years": 0.0,
                "confidence": 100.0,
                "summary": "Không phát hiện thông tin kinh nghiệm làm việc do CV thiếu nội dung văn bản."
            },
            "education_assessment": {
                "detected_level": "unknown",
                "field_relevant": False,
                "summary": "Không phát hiện thông tin bằng cấp/học vấn."
            },
            "strengths": [],
            "concerns": [
                "CV không có nội dung văn bản trích xuất được (có thể là file scan/ảnh)",
                "Ứng viên cần tải lên bản CV định dạng PDF có text hoặc file DOCX"
            ],
        }

    # 2. Format verified vector search evidence summary for LLM context
    evidence_summary = ""
    for skill, hits in vector_results.items():
        if hits:
            # Only include hits with significant similarity
            top_hit = hits[0]
            sim = top_hit.get("similarity", 0)
            if sim >= 0.7:
                best_chunk = top_hit["chunk"]
                evidence_summary += f"- Kỹ năng '{skill}' (độ khớp {sim}): \"{best_chunk}\"\n"

    user_prompt = f"""
## Vị trí tuyển dụng: {job_title}

## Tiêu chí bắt buộc (Must-Have Skills): {', '.join(must_have) if must_have else 'Không có'}
## Tiêu chí ưu tiên (Nice-To-Have Skills): {', '.join(nice_to_have) if nice_to_have else 'Không có'}
## Kinh nghiệm yêu cầu: Tối thiểu {min_exp} năm {f'(tối đa {max_exp} năm)' if max_exp else ''}
## Trình độ học vấn yêu cầu: {min_edu or 'Không yêu cầu cụ thể'}

## Đoạn văn bản trích xuất khớp từ khóa trong CV (Chỉ tham khảo):
{evidence_summary if evidence_summary else 'Không tìm thấy trích đoạn từ khóa trực tiếp.'}

## Toàn bộ nội dung CV ứng viên (Đọc kỹ để trích dẫn bằng chứng trung thực):
{resume_text[:9000]}
"""

    llm = get_agent_llm(temperature=0.1)
    eval_dict: Dict[str, Any] = {}

    if llm:
        try:
            if hasattr(llm, "ainvoke"):
                messages = [
                    ("system", EVALUATION_SYSTEM_PROMPT),
                    ("human", user_prompt),
                ]
                resp = await llm.ainvoke(messages)
                content = resp.content if hasattr(resp, "content") else str(resp)
            elif hasattr(llm, "generate_content_async"):
                resp = await llm.generate_content_async(f"{EVALUATION_SYSTEM_PROMPT}\n\n{user_prompt}")
                content = resp.text if hasattr(resp, "text") else str(resp)
            elif hasattr(llm, "generate_content"):
                resp = await asyncio.to_thread(llm.generate_content, f"{EVALUATION_SYSTEM_PROMPT}\n\n{user_prompt}")
                content = resp.text if hasattr(resp, "text") else str(resp)
            else:
                content = ""

            # Parse JSON response
            cleaned = content.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
            
            # Robust JSON extraction if extra preamble exists
            if "{" in cleaned and "}" in cleaned:
                start_brace = cleaned.find("{")
                end_brace = cleaned.rfind("}") + 1
                cleaned = cleaned[start_brace:end_brace]

            eval_dict = json.loads(cleaned)
        except Exception as e:
            logger.error(f"[Node 2: Evaluator] LLM evaluation error: {e}")

    # Fallback to deterministic evaluation if LLM fails or returns incomplete output
    if not eval_dict or "overall_score" not in eval_dict or not isinstance(eval_dict.get("skill_assessments"), list):
        logger.warning("[Node 2: Evaluator] LLM output missing or invalid. Using deterministic rule-based fallback.")
        eval_dict = _deterministic_fallback_evaluation(
            resume_text=resume_text,
            job_title=job_title,
            must_have=must_have,
            nice_to_have=nice_to_have,
            min_exp=float(min_exp or 0),
            min_edu=min_edu,
        )

    return {
        "overall_score": float(eval_dict.get("overall_score", 0.0)),
        "overall_assessment": eval_dict.get("overall_assessment", ""),
        "recommendation": eval_dict.get("recommendation", "NOT_FIT"),
        "skill_assessments": eval_dict.get("skill_assessments", []),
        "experience_assessment": eval_dict.get("experience_assessment", {}),
        "education_assessment": eval_dict.get("education_assessment", {}),
        "strengths": eval_dict.get("strengths", []),
        "concerns": eval_dict.get("concerns", []),
    }

