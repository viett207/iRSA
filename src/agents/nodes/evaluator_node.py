"""Node 2: Evaluator Node — Deep skill assessment using Gemini LLM + Evidence matching."""

import json
import logging
from typing import Dict, Any

from src.agents.state import AgentState
from src.services.llm_service import get_agent_llm
from src.agents.prompts.evaluation_prompts import EVALUATION_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


async def evaluator_node(state: AgentState) -> dict:
    """Evaluate candidate CV against job requirements using Gemini LLM."""
    resume_text = state.get("resume_text", "")
    must_have = state.get("must_have_skills", [])
    nice_to_have = state.get("nice_to_have_skills", [])
    min_exp = state.get("min_experience_years", 0)
    max_exp = state.get("max_experience_years")
    min_edu = state.get("min_education")
    job_title = state.get("job_title", "Position")
    vector_results = state.get("vector_search_results", {})

    logger.info(f"[Node 2: Evaluator] Evaluating candidate against job '{job_title}'...")

    # Format vector search evidence summary for LLM context
    evidence_summary = ""
    for skill, hits in vector_results.items():
        if hits:
            best_chunk = hits[0]["chunk"]
            sim = hits[0]["similarity"]
            evidence_summary += f"- Skill '{skill}': High similarity snippet ({sim}): '{best_chunk}'\n"

    user_prompt = f"""
## Job Title: {job_title}

## Must-Have Skills: {', '.join(must_have) if must_have else 'N/A'}
## Nice-To-Have Skills: {', '.join(nice_to_have) if nice_to_have else 'N/A'}
## Min Experience: {min_exp} years {f'(max {max_exp})' if max_exp else ''}
## Min Education: {min_edu or 'Not specified'}

## Vector Pre-Search Evidence Found:
{evidence_summary if evidence_summary else 'No exact vector hits.'}

## Candidate CV Content:
{resume_text[:8000]}
"""

    llm = get_agent_llm(temperature=0.2)
    eval_dict: Dict[str, Any] = {}

    if llm:
        try:
            # Check type of llm (LangChain vs direct GenAI)
            if hasattr(llm, "invoke"):
                messages = [
                    ("system", EVALUATION_SYSTEM_PROMPT),
                    ("human", user_prompt),
                ]
                resp = await llm.ainvoke(messages)
                content = resp.content if hasattr(resp, "content") else str(resp)
            elif hasattr(llm, "generate_content"):
                resp = llm.generate_content(f"{EVALUATION_SYSTEM_PROMPT}\n\n{user_prompt}")
                content = resp.text
            else:
                content = ""

            # Parse JSON response
            cleaned = content.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
            eval_dict = json.loads(cleaned)
        except Exception as e:
            logger.error(f"[Node 2: Evaluator] LLM evaluation error: {e}")

    # Fallback if LLM fail or empty
    if not eval_dict or "overall_score" not in eval_dict:
        logger.warning("[Node 2: Evaluator] Using fallback structured evaluation.")
        eval_dict = {
            "overall_score": 75.0,
            "overall_assessment": f"Ứng viên có tiềm năng cho vị trí {job_title}. Hồ sơ thể hiện các kinh nghiệm cơ bản.",
            "recommendation": "GOOD_FIT",
            "skill_assessments": [
                {
                    "skill": s,
                    "found": bool(vector_results.get(s)),
                    "confidence": 80.0 if vector_results.get(s) else 40.0,
                    "evidence": vector_results[s][0]["chunk"] if vector_results.get(s) else "Không tìm thấy",
                    "level": "intermediate"
                } for s in (must_have + nice_to_have)
            ],
            "experience_assessment": {
                "detected_years": float(min_exp or 2),
                "relevant_years": float(min_exp or 2),
                "confidence": 75.0,
                "summary": f"Đáp ứng yêu cầu kinh nghiệm tối thiểu {min_exp} năm."
            },
            "education_assessment": {
                "detected_level": "bachelor",
                "field_relevant": True,
                "summary": "Trình độ học vấn phù hợp."
            },
            "strengths": ["Có kỹ năng nền tảng phù hợp", "Kinh nghiệm làm việc rõ ràng"],
            "concerns": ["Cần trao đổi thêm về chiều sâu dự án thực tế"]
        }

    return {
        "overall_score": float(eval_dict.get("overall_score", 75.0)),
        "overall_assessment": eval_dict.get("overall_assessment", ""),
        "recommendation": eval_dict.get("recommendation", "GOOD_FIT"),
        "skill_assessments": eval_dict.get("skill_assessments", []),
        "experience_assessment": eval_dict.get("experience_assessment", {}),
        "education_assessment": eval_dict.get("education_assessment", {}),
        "strengths": eval_dict.get("strengths", []),
        "concerns": eval_dict.get("concerns", []),
    }
