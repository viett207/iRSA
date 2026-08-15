"""Node 3: Question Gen Node — Generate 8-10 targeted interview questions."""

import asyncio
import json
import logging
from typing import List, Dict, Any

from src.agents.state import AgentState
from src.services.llm_service import get_agent_llm
from src.agents.prompts.question_prompts import QUESTION_GEN_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


async def question_gen_node(state: AgentState) -> dict:
    """Generate 8-10 personalized interview questions targeting skill gaps & strengths."""
    job_title = state.get("job_title", "Position")
    candidate_name = state.get("candidate_name", "Ứng viên")
    skill_assessments = state.get("skill_assessments", [])
    strengths = state.get("strengths", [])
    concerns = state.get("concerns", [])
    resume_text = state.get("resume_text", "")

    logger.info(f"[Node 3: Question Gen] Generating interview questions for {candidate_name}...")

    user_prompt = f"""
Candidate: {candidate_name}
Applied Position: {job_title}

## Evaluation Summary
- Strengths: {', '.join(strengths)}
- Concerns/Gaps: {', '.join(concerns)}
- Skills Assessed: {json.dumps(skill_assessments, ensure_ascii=False)}

## Candidate CV Snippet:
{resume_text[:4000]}
"""

    llm = get_agent_llm(temperature=0.4)
    questions: List[Dict[str, Any]] = []

    if llm:
        try:
            if hasattr(llm, "ainvoke"):
                messages = [
                    ("system", QUESTION_GEN_SYSTEM_PROMPT),
                    ("human", user_prompt),
                ]
                resp = await llm.ainvoke(messages)
                content = resp.content if hasattr(resp, "content") else str(resp)
            elif hasattr(llm, "generate_content_async"):
                resp = await llm.generate_content_async(f"{QUESTION_GEN_SYSTEM_PROMPT}\n\n{user_prompt}")
                content = resp.text if hasattr(resp, "text") else str(resp)
            elif hasattr(llm, "generate_content"):
                resp = await asyncio.to_thread(llm.generate_content, f"{QUESTION_GEN_SYSTEM_PROMPT}\n\n{user_prompt}")
                content = resp.text if hasattr(resp, "text") else str(resp)
            else:
                content = ""

            cleaned = content.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                questions = parsed
        except Exception as e:
            logger.error(f"[Node 3: Question Gen] Error generating questions: {e}")

    # Fallback default questions if LLM fails
    if not questions:
        logger.warning("[Node 3: Question Gen] Using fallback question set.")
        questions = [
            {
                "question": f"Anh/Chị có thể trình bày chi tiết về dự án nổi bật nhất liên quan đến vị trí {job_title}?",
                "category": "experience",
                "target_skill": "Kinh nghiệm thực tế",
                "purpose": "Xác minh quy mô dự án và vai trò thực tế của ứng viên"
            },
            {
                "question": "Cách bạn tiếp cận và giải quyết rào cản kỹ thuật khó khăn nhất trong dự án gần đây?",
                "category": "technical",
                "target_skill": "Giải quyết vấn đề",
                "purpose": "Đánh giá tư duy kỹ thuật và khả năng chịu áp lực"
            },
            {
                "question": "Bạn phối hợp thế nào với các thành viên trong team khi có bất đồng ý kiến về giải pháp?",
                "category": "behavioral",
                "target_skill": "Kỹ năng mềm",
                "purpose": "Đánh giá khả năng làm việc nhóm và giao tiếp"
            }
        ]

    return {"interview_questions": questions}
