"""AI Interview Evaluation Service for scoring recorded candidate answers and session summaries."""

import json
import logging
import re
from typing import Dict, Any, List, Optional

from src.services.llm_service import get_agent_llm

logger = logging.getLogger(__name__)


def _clean_json_text(text: str) -> str:
    """Extract JSON block from markdown code fences or raw LLM output."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


async def evaluate_single_answer(
    question_text: str,
    answer_transcript: str,
    job_title: str = "Software Engineer",
    must_have_skills: Optional[List[str]] = None,
    candidate_name: str = "Ứng viên",
    category: str = "technical",
    target_skill: Optional[str] = None,
    purpose: Optional[str] = None,
    good_signs: Optional[List[str]] = None,
    red_flags: Optional[List[str]] = None,
    grading_guide: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluate a candidate's transcribed spoken answer against the interview question and job requirements.
    
    Raises RuntimeError if LLM call fails instead of returning fake/fabricated scores.
    """
    if not answer_transcript or not answer_transcript.strip():
        raise ValueError("Chưa có nội dung câu trả lời hoặc không ghi nhận được âm thanh từ microphone.")

    must_skills_str = ", ".join(must_have_skills) if must_have_skills else "Theo yêu cầu vị trí"
    good_signs_str = "\n".join([f"- {g}" for g in (good_signs or [])]) or "- Nắm chắc kiến thức, có ví dụ thực tế"
    red_flags_str = "\n".join([f"- {r}" for r in (red_flags or [])]) or "- Trả lời lan man, sai kiến thức cơ bản"

    system_prompt = f"""Bạn là Chuyên gia Đánh giá Phỏng vấn Tuyển dụng Cấp cao (Senior Technical Interviewer & HR Assessment Specialist).
Nhiệm vụ của bạn là phân tích sâu và chấm điểm câu trả lời phỏng vấn của ứng viên dựa trên câu hỏi, cẩm nang phỏng vấn và tiêu chuẩn tuyển dụng.

THÔNG TIN VỊ TRÍ & ỨNG VIÊN:
- Vị trí ứng tuyển: {job_title}
- Kỹ năng bắt buộc của vị trí: {must_skills_str}
- Tên ứng viên: {candidate_name}

THÔNG TIN CÂU HỎI PHỎNG VẤN:
- Nội dung câu hỏi: {question_text}
- Phân loại câu hỏi: {category} (Kỹ năng mục tiêu: {target_skill or 'Chung'})
- Mục đích câu hỏi: {purpose or 'Đánh giá năng lực chuyên môn và tư duy xử lý vấn đề'}
- Dấu hiệu câu trả lời tốt (Good signs):
{good_signs_str}
- Dấu hiệu cảnh báo / Kém (Red flags):
{red_flags_str}
- Gợi ý chấm nhanh: {grading_guide or 'Đánh giá mức độ hiểu sâu và kinh nghiệm thực chiến'}

NỘI DUNG CÂU TRẢ LỜI CỦA ỨNG VIÊN (Bóc băng từ ghi âm):
\"\"\"{answer_transcript}\"\"\"

TIÊU CHÍ ĐÁNH GIÁ (Thang điểm 0 - 100):
1. **Độ chính xác & Trọng tâm (40đ)**: Trả lời đúng trọng tâm câu hỏi, kiến thức kỹ thuật chuẩn xác, không lan man.
2. **Kinh nghiệm thực chiến & Mô hình STAR (30đ)**: Nêu rõ Tình huống (Situation) -> Nhiệm vụ (Task) -> Hành động (Action) -> Kết quả (Result) hoặc có dẫn chứng thực tế.
3. **Kỹ năng diễn đạt & Tư duy logic (20đ)**: Trình bày mạch lạc, tự tin, lập luận rõ ràng, sử dụng thuật ngữ đúng ngữ cảnh.
4. **Thái độ & Phù hợp văn hóa (10đ)**: Tinh thần trách nhiệm, chủ động giải quyết vấn đề.

HÃY TRẢ VỀ KẾT QUẢ DUY NHẤT DƯỚI DẠNG JSON HỢP LỆ VỚI CẤU TRÚC:
{{
  "score": 85.0,
  "assessment": "Nhận xét súc tích 2-3 câu về chất lượng câu trả lời của ứng viên",
  "strengths": [
    "Điểm mạnh 1 nổi bật trong câu trả lời",
    "Điểm mạnh 2"
  ],
  "improvements": [
    "Điểm còn thiếu sót hoặc chưa làm rõ trong câu trả lời"
  ],
  "star_analysis": {{
    "situation": "Tóm tắt bối cảnh tình huống ứng viên nêu (nếu có)",
    "task": "Nhiệm vụ hoặc thách thức phải giải quyết",
    "action": "Hành động / giải pháp kỹ thuật ứng viên đã thực hiện",
    "result": "Kết quả đạt được (số liệu, hiệu năng, tác động)"
  }},
  "follow_up_question": "Gợi ý 1 câu hỏi đào sâu tiếp theo (Follow-up) cho người phỏng vấn hỏi thêm nếu cần"
}}
"""

    llm = get_agent_llm(temperature=0.2)
    if not llm:
        raise RuntimeError("Chưa cấu hình API Key cho mô hình AI hoặc LLM Service không khả dụng.")

    try:
        response = await llm.ainvoke(system_prompt)
        raw_text = response.content if hasattr(response, "content") else str(response)
        cleaned_json = _clean_json_text(raw_text)
        data = json.loads(cleaned_json)
        
        # Ensure score is float and between 0-100
        score = float(data.get("score", 0.0))
        score = max(0.0, min(100.0, score))
        data["score"] = round(score, 1)
        return data
    except Exception as e:
        logger.error(f"Failed to evaluate answer with LLM: {e}")
        raise RuntimeError(f"Lỗi khi AI chấm điểm câu trả lời: {str(e)}")


async def summarize_full_interview(
    job_title: str,
    candidate_name: str,
    questions: List[Dict[str, Any]],
    answers: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Summarize the overall interview session based on all evaluated answers.
    
    Raises RuntimeError if LLM fails instead of making up fake summary.
    """
    answered_items = []
    total_score = 0.0
    scored_count = 0

    for idx, q in enumerate(questions):
        idx_str = str(idx)
        ans = answers.get(idx_str) or answers.get(idx)
        if ans and isinstance(ans, dict) and "score" in ans:
            score = ans.get("score", 0.0)
            total_score += score
            scored_count += 1
            answered_items.append({
                "question": q.get("question", ""),
                "category": q.get("category", ""),
                "transcript": ans.get("transcript", ""),
                "score": score,
                "assessment": ans.get("assessment", ""),
            })

    if scored_count == 0:
        raise ValueError("Chưa có câu trả lời nào được chấm điểm để thực hiện tổng kết phỏng vấn.")

    avg_score = round(total_score / scored_count, 1)

    system_prompt = f"""Bạn là Trưởng ban Tuyển dụng (Head of Talent Acquisition / Hiring Committee Lead).
Hãy tổng hợp và đánh giá toàn diện buổi phỏng vấn trực tiếp của ứng viên sau:

VỊ TRÍ: {job_title}
ỨNG VIÊN: {candidate_name}
SỐ CÂU ĐÃ TRẢ LỜI: {scored_count}/{len(questions)}
ĐIỂM TRUNG BÌNH CÁC CÂU: {avg_score}/100

CHI TIẾT CÁC CÂU ĐÃ PHỎNG VẤN:
{json.dumps(answered_items, ensure_ascii=False, indent=2)}

HÃY ĐƯA RA KẾT LUẬN TỔNG THỂ DƯỚI DẠNG JSON HỢP LỆ:
{{
  "overall_score": {avg_score},
  "overall_feedback": "Nhận xét tổng thể 3-4 câu về năng lực chuyên môn, thái độ và mức độ phù hợp của ứng viên với vị trí",
  "recommendation": "STRONG_HIRE" | "HIRE" | "CONSIDER" | "REJECT",
  "key_strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "key_concerns": ["Điểm cần lưu ý 1"],
  "hiring_verdict": "Khuyến nghị quyết định tuyển dụng và lý do chính"
}}
"""

    llm = get_agent_llm(temperature=0.2)
    if not llm:
        raise RuntimeError("Chưa cấu hình API Key cho mô hình AI hoặc LLM Service không khả dụng.")

    try:
        response = await llm.ainvoke(system_prompt)
        raw_text = response.content if hasattr(response, "content") else str(response)
        cleaned_json = _clean_json_text(raw_text)
        data = json.loads(cleaned_json)
        return data
    except Exception as e:
        logger.error(f"Failed to summarize interview: {e}")
        raise RuntimeError(f"Lỗi khi AI tổng kết phỏng vấn: {str(e)}")


async def generate_extra_interview_questions(
    job_title: str,
    must_have_skills: List[str],
    candidate_name: str,
    focus_topic: str = "technical",
    count: int = 3,
) -> List[Dict[str, Any]]:
    """Generate extra tailored interview questions on demand using AI."""
    skills_str = ", ".join(must_have_skills) if must_have_skills else "Chuyên môn theo JD"

    prompt = f"""Bạn là Chuyên gia Xây dựng Bộ câu hỏi Phỏng vấn Tuyển dụng.
Hãy tạo thêm {count} câu hỏi phỏng vấn chuyên sâu cho ứng viên {candidate_name} ứng tuyển vị trí {job_title}.
Chủ đề trọng tâm: {focus_topic}
Kỹ năng yêu cầu: {skills_str}

Mỗi câu hỏi cần có cẩm nang đánh giá chi tiết cho Non-Tech HR.
TRẢ VỀ DUY NHẤT JSON ARRAY:
[
  {{
    "question": "Nội dung câu hỏi cụ thể, tình huống thực tế...",
    "category": "{focus_topic}",
    "target_skill": "Kỹ năng mục tiêu",
    "purpose": "Mục đích câu hỏi",
    "good_signs": ["Dấu hiệu trả lời tốt 1", "Dấu hiệu 2"],
    "red_flags": ["Dấu hiệu cảnh báo trả lời kém 1"],
    "grading_guide": "Gợi ý thang điểm nhanh cho HR"
  }}
]
"""
    llm = get_agent_llm(temperature=0.3)
    if not llm:
        raise RuntimeError("Chưa cấu hình API Key cho mô hình AI hoặc LLM Service không khả dụng.")

    try:
        resp = await llm.ainvoke(prompt)
        raw_text = resp.content if hasattr(resp, "content") else str(resp)
        cleaned_json = _clean_json_text(raw_text)
        data = json.loads(cleaned_json)
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Failed to generate extra questions: {e}")
        raise RuntimeError(f"Lỗi khi AI sinh câu hỏi phỏng vấn: {str(e)}")
