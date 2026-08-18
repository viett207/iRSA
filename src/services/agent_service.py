"""Agent Service wrapper for executing the AI Evaluation Agent graph."""

import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from src.agents.graph import agent_graph
from src.agents.tools.db_tools import fetch_application_data, save_agent_evaluation
from src.agents.tools.notification_tools import send_hr_notification_async
from src.models.schemas import AiEvaluationOutput

logger = logging.getLogger(__name__)


async def run_evaluation_agent(db: Session, application_id: int) -> Optional[Dict[str, Any]]:
    """Execute the full AI Evaluation Agent for a given application ID.
    
    Flow:
    1. Fetch Application + CV + Job Criteria from DB.
    2. Invoke LangGraph Agent Graph (Extractor -> Evaluator -> QuestionGen -> Verifier).
    3. Save final evaluation output to scoring_results table.
    4. Send email notification to HR recruiter.
    """
    logger.info(f"Starting AI Evaluation Agent for Application ID: {application_id}")

    # 1. Fetch DB data
    input_data = fetch_application_data(db, application_id)
    if not input_data:
        logger.error(f"Cannot run Agent: Application {application_id} data missing or invalid.")
        return None

    # 2. Invoke Agent Graph
    try:
        final_state = await agent_graph.ainvoke(input_data)
    except Exception as e:
        logger.exception(f"Error executing agent_graph for App {application_id}: {e}")
        return None

    # 3. Format Evaluation Result
    ai_score = float(final_state.get("overall_score", 75.0))
    evaluation_dict = {
        "overall_score": ai_score,
        "overall_assessment": final_state.get("overall_assessment", ""),
        "recommendation": final_state.get("recommendation", "GOOD_FIT"),
        "skill_assessments": final_state.get("skill_assessments", []),
        "experience_assessment": final_state.get("experience_assessment", {}),
        "education_assessment": final_state.get("education_assessment", {}),
        "strengths": final_state.get("strengths", []),
        "concerns": final_state.get("concerns", []),
        "interview_questions": final_state.get("interview_questions", []),
    }

    # Validate output schema
    try:
        validated_output = AiEvaluationOutput(**evaluation_dict)
        evaluation_dict = validated_output.model_dump()
    except Exception as e:
        logger.warning(f"Schema validation warning: {e}")

    # 4. Save to Database
    save_agent_evaluation(db, application_id, ai_score, evaluation_dict)

    # 5. Trigger HR Notification Tool
    recruiter_email = input_data.get("recruiter_email")
    recruiter_name = input_data.get("recruiter_name", "HR Manager")
    candidate_name = input_data.get("candidate_name", "Ứng viên")
    job_title = input_data.get("job_title", "Position")

    email_sent = False
    if recruiter_email:
        email_sent = await send_hr_notification_async(
            recruiter_email=recruiter_email,
            recruiter_name=recruiter_name,
            candidate_name=candidate_name,
            job_title=job_title,
            ai_result=evaluation_dict,
        )

    logger.info(f"AI Evaluation Agent completed successfully for App {application_id}. Score: {ai_score}")
    return {
        "application_id": application_id,
        "ai_score": ai_score,
        "evaluation": evaluation_dict,
        "email_sent": email_sent,
    }


async def run_candidate_chat(
    db: Session,
    application_id: int,
    message: str,
    history: Optional[list] = None,
) -> Dict[str, Any]:
    """Execute AI Chat Assistant for recruiter asking about a candidate's CV and competencies."""
    from src.services.llm_service import get_agent_llm
    from src.agents.tools.chat_tools import get_candidate_profile, search_cv, get_evaluation_summary

    profile = get_candidate_profile(db, application_id)
    eval_data = get_evaluation_summary(db, application_id)
    cv_search_results = search_cv(db, application_id, message)

    snippets_text = "\n".join([f"- {item['content']}" for item in cv_search_results]) if cv_search_results else "Không tìm thấy trích đoạn từ khóa trực tiếp."

    system_prompt = f"""Bạn là Trợ lý Tuyển dụng AI (iRSA Recruiter Copilot).
Nhiệm vụ của bạn là hỗ trợ Nhà tuyển dụng (HR / Hiring Manager / Technical Lead) giải đáp mọi thắc mắc chuyên sâu, chi tiết về hồ sơ của ứng viên, đối chiếu năng lực với tiêu chí công việc và đề xuất chiến lược phỏng vấn/tuyển dụng.

THÔNG TIN ỨNG VIÊN & VỊ TRÍ:
- Họ và tên ứng viên: {profile.get('candidate_name', 'N/A')}
- Email: {profile.get('candidate_email', 'N/A')}
- Số điện thoại: {profile.get('candidate_phone', 'N/A')}
- Vị trí ứng tuyển: {profile.get('job_title', 'N/A')}
- Phòng ban: {profile.get('department', 'N/A')}
- Dải lương vị trí: {profile.get('salary_range', 'Thỏa thuận')}
- Tiêu chí bắt buộc (Must-Have): {', '.join(profile.get('must_have_skills', []))}
- Tiêu chí ưu tiên (Nice-To-Have): {', '.join(profile.get('nice_to_have_skills', []))}
- Yêu cầu kinh nghiệm: {profile.get('min_experience_years', 0)} năm
- Yêu cầu học vấn: {profile.get('min_education', 'N/A')}

KẾT QUẢ ĐÁNH GIÁ CỦA HỆ THỐNG:
- Điểm sàng lọc vòng 1: {eval_data.get('screening_total_score', 'N/A')}/100 (Kỹ năng: {eval_data.get('skill_match_score', 'N/A')}, Kinh nghiệm: {eval_data.get('experience_score', 'N/A')}, Học vấn: {eval_data.get('education_score', 'N/A')})
- Điểm đánh giá chuyên sâu AI: {eval_data.get('ai_score', 'N/A')}/100
- Đánh giá tổng quan: {eval_data.get('ai_evaluation', {}).get('overall_assessment', 'Chưa có')}
- Điểm mạnh nổi bật: {', '.join(eval_data.get('ai_evaluation', {}).get('strengths', []))}
- Lưu ý / Lỗ hổng tiềm ẩn: {', '.join(eval_data.get('ai_evaluation', {}).get('concerns', []))}

CÁC TRÍCH ĐOẠN KHỚP TỪ CV:
{snippets_text}

NGUYÊN TẮC TRẢ LỜI:
1. Luôn trả lời bằng tiếng Việt chuyên nghiệp, súc tích, có dẫn chứng cụ thể từ CV và tiêu chí tuyển dụng.
2. Nêu rõ ưu điểm, rủi ro tiềm ẩn (nếu có) và đưa ra lời khuyên thực tế cho người phỏng vấn.
3. Định dạng câu trả lời rõ ràng bằng Markdown (bullet points, in đậm từ khóa quan trọng).
"""

    messages = [("system", system_prompt)]
    if history:
        for turn in history[-8:]:
            role = "human" if turn.get("role") in ["user", "human"] else "assistant"
            messages.append((role, turn.get("content", "")))
    messages.append(("human", message))

    llm = get_agent_llm(temperature=0.3)
    reply_text = "Xin lỗi, không thể xử lý câu trả lời lúc này."

    if llm:
        try:
            resp = await llm.ainvoke(messages)
            reply_text = resp.content if hasattr(resp, "content") else str(resp)
        except Exception as e:
            logger.error(f"Error in run_candidate_chat: {e}")
            reply_text = f"Đã xảy ra lỗi khi trao đổi với AI: {e}"

    suggested_followups = [
        f"Ứng viên có đáp ứng đủ kỹ năng bắt buộc của {profile.get('job_title', 'vị trí')} không?",
        "Điểm yếu lớn nhất của ứng viên này trong CV là gì?",
        "Gợi ý 3 câu hỏi phỏng vấn kỹ thuật hóc búa cho ứng viên này",
    ]

    return {
        "reply": reply_text,
        "suggested_followups": suggested_followups,
        "candidate_name": profile.get("candidate_name"),
    }

