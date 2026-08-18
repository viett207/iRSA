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
                "question": f"Anh/Chị hãy trình bày chi tiết về kiến trúc dự án nổi bật nhất liên quan đến vị trí {job_title} mà anh/chị từng đảm nhiệm?",
                "category": "experience",
                "target_skill": "Kinh nghiệm thực tế & Kiến trúc",
                "purpose": "Xác minh quy mô dự án, vai trò thực tế và mức độ làm chủ công nghệ của ứng viên"
            },
            {
                "question": "Trong các dự án trước đây, anh/chị đã giải quyết vấn đề hiệu năng (Performance / Bottleneck) hoặc tối ưu truy vấn Database lớn như thế nào?",
                "category": "technical",
                "target_skill": "Tối ưu hóa & Database",
                "purpose": "Đánh giá tư duy kỹ thuật chuyên sâu và khả năng xử lý bài toán quy mô lớn"
            },
            {
                "question": "Anh/Chị thiết kế cơ chế bảo mật, phân quyền (Authentication / Authorization) và kiểm soát lỗi (Error Handling) cho hệ thống Backend ra sao?",
                "category": "architecture",
                "target_skill": "Bảo mật & Clean Architecture",
                "purpose": "Kiểm tra kiến thức về an toàn thông tin và tiêu chuẩn thiết kế phần mềm"
            },
            {
                "question": "Anh/Chị đã từng gặp sự cố Production nghiêm trọng nào chưa? Quy trình anh/chị điều tra log, khoanh vùng và khắc phục sự cố đó diễn ra thế nào?",
                "category": "situational",
                "target_skill": "Xử lý sự cố & Troubleshooting",
                "purpose": "Đánh giá khả năng bình tĩnh xử lý áp lực và kỹ năng giải quyết sự cố thực tế"
            },
            {
                "question": "Khi có bất đồng quan điểm về giải pháp kỹ thuật giữa anh/chị và thành viên khác trong nhóm, anh/chị đã thuyết phục hoặc thỏa hiệp như thế nào?",
                "category": "behavioral",
                "target_skill": "Kỹ năng mềm & Giao tiếp",
                "purpose": "Đánh giá khả năng làm việc nhóm, tư duy xây dựng và lắng nghe"
            },
            {
                "question": "Anh/Chị áp dụng quy trình CI/CD, viết Unit Test / Integration Test và Code Review trong công việc hàng ngày như thế nào?",
                "category": "technical",
                "target_skill": "DevOps & Quality Assurance",
                "purpose": "Đo lường kỷ luật công nghệ và thói quen bảo đảm chất lượng mã nguồn"
            },
            {
                "question": "Nếu được giao một công nghệ hoặc nghiệp vụ hoàn toàn mới trong dự án với thời hạn gấp, phương pháp nghiên cứu và làm chủ của anh/chị là gì?",
                "category": "behavioral",
                "target_skill": "Khả năng tự học & Thích ứng",
                "purpose": "Đánh giá tiềm năng phát triển và tính linh hoạt trong môi trường thay đổi nhanh"
            }
        ]

    return {"interview_questions": questions}
