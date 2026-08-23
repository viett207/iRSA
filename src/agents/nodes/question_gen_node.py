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
                "purpose": "Xác minh quy mô dự án, vai trò thực tế và mức độ làm chủ công nghệ của ứng viên",
                "good_signs": [
                    "Mô tả rõ ràng luồng dữ liệu, các thành phần công nghệ đã dùng và lý do lựa chọn",
                    "Nêu rõ phần việc mình trực tiếp phụ trách thay vì nói chung chung về team",
                    "Đưa ra số liệu cụ thể (số lượng người dùng, lượng request hoặc quy mô dữ liệu)"
                ],
                "red_flags": [
                    "Chỉ nói lý thuyết chung chung, không nêu được tên module hay tính năng cụ thể tự làm",
                    "Ngập ngừng khi hỏi sâu về lý do chọn giải pháp kỹ thuật"
                ],
                "grading_guide": "Đạt nếu ứng viên giải thích mạch lạc vai trò và kiến trúc dự án thực tế; Chưa đạt nếu trả lời mập mờ, né tránh vai trò cụ thể."
            },
            {
                "question": "Trong các dự án trước đây, anh/chị đã giải quyết vấn đề hiệu năng (Performance / Bottleneck) hoặc tối ưu hệ thống/truy vấn như thế nào?",
                "category": "technical",
                "target_skill": "Tối ưu hóa & Hiệu năng",
                "purpose": "Đánh giá tư duy kỹ thuật chuyên sâu và khả năng xử lý bài toán thực tế",
                "good_signs": [
                    "Nêu quy trình đo lường/profiling trước khi tối ưu (log, APM, query plan)",
                    "Áp dụng giải pháp cụ thể: Indexing, Caching (Redis), Connection Pooling, Async...",
                    "Có số liệu so sánh trước và sau khi tối ưu (ví dụ: giảm thời gian phản hồi từ 2s xuống 200ms)"
                ],
                "red_flags": [
                    "Đoán mò nguyên nhân mà không có công cụ đo lường",
                    "Không phân biệt được tối ưu phần mềm với việc nâng cấp cấu hình phần cứng"
                ],
                "grading_guide": "Đạt khi ứng viên có tư duy đo lường trước khi tối ưu và dẫn chứng số liệu rõ ràng; Chưa đạt nếu nói chung chung không có phương pháp."
            },
            {
                "question": "Anh/Chị thiết kế cơ chế bảo mật, phân quyền và kiểm soát lỗi (Error Handling) cho hệ thống ra sao?",
                "category": "architecture",
                "target_skill": "Bảo mật & Thiết kế hệ thống",
                "purpose": "Kiểm tra kiến thức về an toàn thông tin và tiêu chuẩn thiết kế phần mềm",
                "good_signs": [
                    "Nêu cơ chế xác thực/phân quyền chuẩn (JWT, OAuth2, RBAC)",
                    "Mã hóa dữ liệu nhạy cảm, validate đầu vào tránh Injection/XSS",
                    "Có hệ thống log lỗi tập trung (Sentry, ELK) và không để lộ thông tin nhạy cảm ra client"
                ],
                "red_flags": [
                    "Xem nhẹ vấn đề bảo mật hoặc cho rằng bảo mật là việc riêng của DevOps/Infra",
                    "Lưu mật khẩu dạng plain-text hoặc bỏ qua validation"
                ],
                "grading_guide": "Đạt nếu nắm vững nguyên tắc an toàn dữ liệu và phân quyền bài bản; Chưa đạt nếu không nhận thức được các nguy cơ bảo mật cơ bản."
            },
            {
                "question": "Anh/Chị đã từng gặp sự cố Production nghiêm trọng nào chưa? Quy trình anh/chị điều tra log, khoanh vùng và khắc phục sự cố đó diễn ra thế nào?",
                "category": "situational",
                "target_skill": "Xử lý sự cố & Troubleshooting",
                "purpose": "Đánh giá khả năng bình tĩnh xử lý áp lực và kỹ năng giải quyết sự cố thực tế",
                "good_signs": [
                    "Bình tĩnh, ưu tiên khôi phục dịch vụ cho người dùng trước (Rollback / Fallback / Hotfix)",
                    "Có quy trình Post-mortem tìm nguyên nhân gốc rễ (Root Cause) để tránh tái diễn",
                    "Giao tiếp chủ động với các bên liên quan trong lúc xảy ra sự cố"
                ],
                "red_flags": [
                    "Đổ lỗi cho khách hàng hoặc đồng nghiệp",
                    "Khẳng định chưa từng gặp lỗi hoặc hoảng loạn sửa trực tiếp trên Production mà không test"
                ],
                "grading_guide": "Đạt nếu có quy trình xử lý bình tĩnh, trách nhiệm và có giải pháp phòng ngừa; Chưa đạt nếu thiếu tính chịu trách nhiệm hoặc xử lý cảm tính."
            },
            {
                "question": "Khi có bất đồng quan điểm về giải pháp công việc hoặc phương án kỹ thuật với đồng nghiệp/khách hàng, anh/chị đã xử lý như thế nào?",
                "category": "behavioral",
                "target_skill": "Kỹ năng mềm & Giao tiếp",
                "purpose": "Đánh giá khả năng làm việc nhóm, tư duy xây dựng và lắng nghe",
                "good_signs": [
                    "Tập trung vào mục tiêu chung và dữ liệu/thực nghiệm thay vì cái tôi cá nhân",
                    "Lắng nghe góc nhìn của người khác và sẵn sàng thỏa hiệp vì lợi ích dự án",
                    "Nếu cần, làm bản thử nghiệm nhỏ (POC) để chứng minh tính hiệu quả"
                ],
                "red_flags": [
                    "Bảo thủ, áp đặt hoặc có thái độ tiêu cực khi bị phản bác ý kiến",
                    "Né tránh xung đột bằng cách im lặng nhưng không hợp tác thực hiện"
                ],
                "grading_guide": "Đạt nếu thể hiện tư duy hướng đến giải pháp và tôn trọng đồng đội; Chưa đạt nếu có biểu hiện cái tôi quá cao hoặc thiếu tinh thần hợp tác."
            },
            {
                "question": "Nếu được giao một công nghệ hoặc nghiệp vụ hoàn toàn mới trong dự án với thời hạn gấp, phương pháp nghiên cứu và làm chủ của anh/chị là gì?",
                "category": "behavioral",
                "target_skill": "Khả năng tự học & Thích ứng",
                "purpose": "Đánh giá tiềm năng phát triển và tính linh hoạt trong môi trường thay đổi nhanh",
                "good_signs": [
                    "Đọc tài liệu chính thức (Official Docs), xây dựng ngay ứng dụng mẫu nhỏ (Hello World / POC)",
                    "Biết tận dụng cộng đồng, AI và đồng nghiệp có kinh nghiệm để gỡ rối nhanh",
                    "Chủ động báo cáo tiến độ và rủi ro cho quản lý"
                ],
                "red_flags": [
                    "Bị động chờ người khác hướng dẫn từng bước",
                    "Ôm việc không dám hỏi khi gặp bế tắc dẫn đến trễ hạn dự án"
                ],
                "grading_guide": "Đạt nếu có phương pháp tự học chủ động, thực tế và biết quản lý rủi ro; Chưa đạt nếu phụ thuộc hoàn toàn vào người khác."
            }
        ]

    return {"interview_questions": questions}
