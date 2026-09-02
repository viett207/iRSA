"""Service for parsing and extracting structured job description (JD) data from PDF and DOCX files using AI with robust fallback."""

import json
import logging
import re
from typing import Any, Dict, List, Optional
from io import BytesIO

from app.services.text_extractor import extract_text, _extract_from_pdf, _extract_from_docx
from src.services.llm_service import get_agent_llm

logger = logging.getLogger(__name__)


def extract_raw_jd_text(file_bytes: bytes, filename: str, content_type: str = "") -> str:
    """Extract plain text from uploaded JD file (PDF or DOCX)."""
    text = None
    fn_lower = filename.lower()

    if fn_lower.endswith(".pdf") or "pdf" in content_type:
        text = _extract_from_pdf(file_bytes)
    elif fn_lower.endswith(".docx") or "word" in content_type or "officedocument" in content_type:
        text = _extract_from_docx(file_bytes)
    else:
        text = extract_text(file_bytes, content_type)

    if not text or len(text.strip()) < 10:
        raise ValueError("Không thể trích xuất nội dung văn bản từ file. Vui lòng đảm bảo file không bị khóa hoặc rỗng.")

    return text.strip()


def _sanitize_llm_json(raw_response: str) -> Optional[Dict[str, Any]]:
    """Clean markdown code blocks and parse JSON safely."""
    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
    cleaned = cleaned.strip()

    match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(1)

    try:
        return json.loads(cleaned)
    except Exception as e:
        logger.warning(f"Failed to parse LLM response as JSON: {e}. Raw response: {raw_response[:200]}")
        return None


def _parse_jd_with_regex_fallback(text: str) -> Dict[str, Any]:
    """Smart fallback parser using Vietnamese NLP patterns when LLM is unavailable."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    first_line = lines[0] if lines else "Vị trí tuyển dụng"

    # Extract title
    title = first_line
    for line in lines[:5]:
        if any(kw in line.lower() for kw in ["tuyển dụng", "vị trí", "job title", "cần tuyển", "position:"]):
            cleaned = re.sub(r"(?i)^(tuyển dụng|vị trí|job title|cần tuyển|position:)\s*[:\-\–]?\s*", "", line).strip()
            if len(cleaned) > 3:
                title = cleaned
                break

    # Extract department
    dept = "Công nghệ thông tin"
    for line in lines[:10]:
        if "phòng ban" in line.lower() or "bộ phận" in line.lower() or "department" in line.lower():
            cleaned = re.sub(r"(?i)^(phòng ban|bộ phận|department)\s*[:\-\–]?\s*", "", line).strip()
            if cleaned:
                dept = cleaned
                break

    # Extract employment type
    emp_type = "full_time"
    text_lower = text.lower()
    if "part-time" in text_lower or "bán thời gian" in text_lower or "part time" in text_lower:
        emp_type = "part_time"
    elif "thực tập" in text_lower or "intern" in text_lower:
        emp_type = "internship"
    elif "hợp đồng" in text_lower or "contract" in text_lower or "freelance" in text_lower:
        emp_type = "contract"

    # Extract experience years
    min_exp = 0
    exp_match = re.search(r"(\d+)\s*(?:\+|\-|đến|\-)?\s*(?:\d+)?\s*(?:năm|year)", text_lower)
    if exp_match:
        try:
            min_exp = int(exp_match.group(1))
        except ValueError:
            min_exp = 0

    # Extract common tech skills
    common_skills = [
        "Python", "Java", "JavaScript", "TypeScript", "Angular", "React", "Vue.js", "Node.js",
        "FastAPI", "Django", "Spring Boot", "Golang", "C#", ".NET", "PHP", "Laravel",
        "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
        "Docker", "Kubernetes", "AWS", "GCP", "Azure", "CI/CD", "Git", "Linux",
        "HTML5", "CSS3", "SCSS", "RESTful API", "GraphQL", "Microservices",
        "Figma", "UI/UX", "Scrum", "Agile", "Machine Learning", "PyTorch", "TensorFlow"
    ]

    found_skills = []
    for skill in common_skills:
        if re.search(rf"\b{re.escape(skill)}\b", text, re.IGNORECASE):
            found_skills.append(skill)

    must_have = found_skills[:5] if found_skills else ["Kỹ năng chuyên môn"]
    nice_to_have = found_skills[5:10] if len(found_skills) > 5 else []

    return {
        "title_vi": title[:250],
        "department": dept,
        "location": "Hà Nội",
        "employment_type": emp_type,
        "salary_min": None,
        "salary_max": None,
        "description_vi": text[:1500],
        "requirements_vi": text[1500:3000] if len(text) > 1500 else text[:1000],
        "criteria": {
            "must_have_skills": must_have,
            "nice_to_have_skills": nice_to_have,
            "min_experience_years": min_exp,
            "max_experience_years": min_exp + 3 if min_exp > 0 else None,
            "min_education": "bachelor",
        }
    }


async def parse_jd_content(raw_text: str) -> Dict[str, Any]:
    """Use AI LLM (Gemini) to parse JD text into structured data with fallback."""
    llm = get_agent_llm(temperature=0.1)

    prompt = f"""Bạn là một chuyên gia nhân sự và tuyển dụng AI (AI HR Specialist).
Nhiệm vụ của bạn là đọc kỹ nội dung bản mô tả công việc (Job Description - JD) bên dưới và trích xuất thành dữ liệu cấu trúc JSON chuẩn xác để tự động điền vào biểu mẫu tạo tin tuyển dụng.

NỘI DUNG VĂN BẢN JD:
\"\"\"
{raw_text[:7000]}
\"\"\"

YÊU CẦU TRÍCH XUẤT (BẮT BUỘC trả về ĐÚNG định dạng JSON sau, không kèm bất kỳ giải thích nào):
{{
  "title_vi": "Tiêu đề công việc chính xác bằng tiếng Việt (ví dụ: Kỹ sư Full-stack Senior, Chuyên viên Tuyển dụng...)",
  "department": "Tên phòng ban / Ngành nghề (ví dụ: Công nghệ thông tin, Marketing, Kế toán - Tài chính, Nhân sự...)",
  "location": "Địa điểm làm việc (ví dụ: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Toàn quốc...)",
  "employment_type": "full_time | part_time | contract | internship (chỉ được chọn 1 trong 4 giá trị này)",
  "salary_min": null hoặc số nguyên đơn vị triệu VNĐ (ví dụ: 15 nếu mức lương từ 15 triệu),
  "salary_max": null hoặc số nguyên đơn vị triệu VNĐ (ví dụ: 30 nếu mức lương đến 30 triệu),
  "description_vi": "Đoạn văn mô tả tóm tắt và chi tiết trách nhiệm, công việc chính cần thực hiện",
  "requirements_vi": "Đoạn văn chi tiết về yêu cầu năng lực, thái độ, kinh nghiệm và kỹ năng cần có",
  "criteria": {{
    "must_have_skills": ["danh", "sách", "kỹ năng", "bắt buộc", "viết ngắn gọn tên từng công nghệ/kỹ năng, tối đa 8 mục"],
    "nice_to_have_skills": ["danh", "sách", "kỹ năng", "ưu tiên", "cộng điểm, tối đa 8 mục"],
    "min_experience_years": số nguyên năm kinh nghiệm tối thiểu (ví dụ: 2. Nếu không yêu cầu ghi 0),
    "max_experience_years": số nguyên năm kinh nghiệm tối đa hoặc null,
    "min_education": "high_school | bachelor | master | phd (chỉ chọn 1 trong 4 giá trị này, mặc định bachelor nếu không nêu rõ)"
  }}
}}
"""

    if llm is not None:
        try:
            logger.info("Parsing JD text with Gemini LLM...")
            res = await llm.ainvoke(prompt)
            content = str(res)
            parsed = _sanitize_llm_json(content)
            if parsed and isinstance(parsed, dict) and parsed.get("title_vi"):
                criteria = parsed.get("criteria", {})
                if not isinstance(criteria, dict):
                    criteria = {}

                valid_types = {"full_time", "part_time", "contract", "internship"}
                emp_type = parsed.get("employment_type")
                if emp_type not in valid_types:
                    emp_type = "full_time"

                valid_edu = {"high_school", "bachelor", "master", "phd"}
                min_edu = criteria.get("min_education")
                if min_edu not in valid_edu:
                    min_edu = "bachelor"

                return {
                    "title_vi": str(parsed.get("title_vi", "Tin tuyển dụng mới")).strip(),
                    "department": str(parsed.get("department", "Công nghệ thông tin")).strip() if parsed.get("department") else None,
                    "location": str(parsed.get("location", "Hà Nội")).strip() if parsed.get("location") else None,
                    "employment_type": emp_type,
                    "salary_min": int(parsed["salary_min"]) if parsed.get("salary_min") is not None and str(parsed["salary_min"]).isdigit() else None,
                    "salary_max": int(parsed["salary_max"]) if parsed.get("salary_max") is not None and str(parsed["salary_max"]).isdigit() else None,
                    "description_vi": str(parsed.get("description_vi", "")).strip(),
                    "requirements_vi": str(parsed.get("requirements_vi", "")).strip(),
                    "criteria": {
                        "must_have_skills": [str(s).strip() for s in criteria.get("must_have_skills", []) if str(s).strip()],
                        "nice_to_have_skills": [str(s).strip() for s in criteria.get("nice_to_have_skills", []) if str(s).strip()],
                        "min_experience_years": int(criteria.get("min_experience_years", 0)) if str(criteria.get("min_experience_years", "")).isdigit() else 0,
                        "max_experience_years": int(criteria["max_experience_years"]) if criteria.get("max_experience_years") is not None and str(criteria["max_experience_years"]).isdigit() else None,
                        "min_education": min_edu,
                    }
                }
        except Exception as e:
            logger.warning(f"LLM JD parsing failed, falling back to rule-based extraction: {e}")

    return _parse_jd_with_regex_fallback(raw_text)
