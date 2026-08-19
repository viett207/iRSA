"""Regression tests demonstrating current weaknesses and loopholes in verifier_node.

Proves that the current verifier_node:
1. Returns verification_passed=True even when evidence is completely fabricated,
   because _is_evidence_grounded only checks if the skill name appears in the CV.
2. Completely ignores experience_assessment, allowing absurd detected_years (e.g. 99 years)
   to pass verification without flags.
3. Completely ignores candidate strengths/concerns, allowing ungrounded or hallucinated
   claims (e.g. 'Đoạt giải Nobel Tin học') to pass verification.
4. Accepts found=True with empty/whitespace evidence as long as the skill word exists in the CV.
"""

import pytest
from src.agents.nodes.verifier_node import verifier_node, _is_evidence_grounded
from tests.fixtures.cv_fixtures import get_cv_fixture


# =============================================================================
# 1. Tái hiện: Evidence hoàn toàn BỊA ĐẶT nhưng verifier vẫn cho verification_passed=True
# =============================================================================
@pytest.mark.asyncio
async def test_verifier_passes_fabricated_evidence_when_skill_word_exists_in_cv():
    """Demonstrate that if a skill word ('Python') exists anywhere in the CV (e.g. in a skill list),

    the LLM can fabricate completely fictitious evidence (e.g. leading a $50M bank project),
    and verifier_node still marks verification_passed=True.
    """
    cv = get_cv_fixture("python_in_skills_only")
    # In this CV, candidate only listed 'Python' under Skills, and worked as PHP dev at ABC Corp.

    # LLM hallucinates an extravagant claim that never happened:
    fabricated_evidence = (
        "Ứng viên trực tiếp làm Giám đốc kỹ thuật phụ trách hệ thống xử lý giao dịch "
        "50 triệu USD bằng Python tại Ngân hàng Vietcombank trong 5 năm liên tục."
    )

    # Prove that _is_evidence_grounded returns True due to the line:
    # `if skill_clean in text_lower: return True`
    assert _is_evidence_grounded(fabricated_evidence, "Python", cv["raw_text"]) is True, (
        "Vulnerability: _is_evidence_grounded returned True for completely fabricated evidence "
        "simply because the word 'python' was found in the CV!"
    )

    # Construct evaluator state with the hallucinated evidence
    state = {
        "application_id": 201,
        "resume_text": cv["raw_text"],
        "must_have_skills": ["Python"],
        "nice_to_have_skills": [],
        "overall_score": 85.0,
        "recommendation": "STRONG_FIT",
        "interview_questions": [
            {
                "question": "Anh/chị hãy chia sẻ về dự án 50 triệu USD tại Vietcombank?",
                "category": "experience",
                "target_skill": "Python",
                "purpose": "Xác minh kinh nghiệm",
            }
        ],
        "skill_assessments": [
            {
                "skill": "Python",
                "found": True,
                "confidence": 95.0,
                "evidence": fabricated_evidence,
                "level": "expert",
            }
        ],
        "experience_assessment": {
            "detected_years": 5.0,
            "relevant_years": 5.0,
            "confidence": 90.0,
            "summary": "Kinh nghiệm 5 năm",
        },
        "education_assessment": {
            "detected_level": "bachelor",
            "field_relevant": True,
            "summary": "Cử nhân",
        },
        "strengths": ["Lãnh đạo dự án ngân hàng 50 triệu USD"],
        "concerns": [],
        "reflection_attempts": 0,
    }

    result = await verifier_node(state)

    # Proof: Verifier accepted the hallucinated evidence without correcting found -> False
    assert result["verification_passed"] is True, "Expected verifier to pass due to current loose check"
    assert result["skill_assessments"][0]["found"] is True
    assert result["skill_assessments"][0]["evidence"] == fabricated_evidence


# =============================================================================
# 2. Tái hiện: detected_years VÔ LÝ (99 năm) nhưng verifier không kiểm tra
# =============================================================================
@pytest.mark.asyncio
async def test_verifier_ignores_unreasonable_detected_years():
    """Demonstrate that verifier_node has zero validation for experience_assessment,

    allowing impossible numbers like 99.0 years of experience to pass without error.
    """
    cv = get_cv_fixture("python_in_experience_with_date_range")

    state = {
        "application_id": 202,
        "resume_text": cv["raw_text"],
        "must_have_skills": ["Python", "FastAPI"],
        "nice_to_have_skills": [],
        "overall_score": 90.0,
        "recommendation": "STRONG_FIT",
        "interview_questions": [
            {
                "question": "Kinh nghiệm thực tế của bạn là gì?",
                "category": "experience",
                "target_skill": "Python",
                "purpose": "Đánh giá kinh nghiệm",
            }
        ],
        "skill_assessments": [
            {
                "skill": "Python",
                "found": True,
                "confidence": 95.0,
                "evidence": "Kỹ sư Backend với 2 năm kinh nghiệm thực chiến phát triển API và microservices bằng Python và FastAPI.",
                "level": "advanced",
            },
            {
                "skill": "FastAPI",
                "found": True,
                "confidence": 95.0,
                "evidence": "Thiết kế và triển khai hệ thống microservices sử dụng Python, FastAPI",
                "level": "advanced",
            },
        ],
        # Completely unreasonable / absurd detected years:
        "experience_assessment": {
            "detected_years": 99.0,
            "relevant_years": 99.0,
            "confidence": 99.0,
            "summary": "Ứng viên có 99 năm kinh nghiệm từ thời tiền sử.",
        },
        "education_assessment": {
            "detected_level": "bachelor",
            "field_relevant": True,
            "summary": "Đại học",
        },
        "strengths": ["99 năm kinh nghiệm"],
        "concerns": [],
        "reflection_attempts": 0,
    }

    result = await verifier_node(state)

    # Proof: Verifier ignores experience_assessment and passes the evaluation
    assert result["verification_passed"] is True
    assert result["overall_score"] == 90.0
    assert result["recommendation"] == "STRONG_FIT"


# =============================================================================
# 3. Tái hiện: Strengths HOÀN TOÀN BỊA ĐẶT (Không có nguồn) vẫn passed
# =============================================================================
@pytest.mark.asyncio
async def test_verifier_ignores_hallucinated_strengths_without_grounding():
    """Demonstrate that verifier_node does not inspect or ground candidate strengths,

    allowing arbitrary or fabricated claims to pass.
    """
    cv = get_cv_fixture("python_in_experience_with_date_range")

    state = {
        "application_id": 203,
        "resume_text": cv["raw_text"],
        "must_have_skills": ["Python"],
        "nice_to_have_skills": [],
        "overall_score": 85.0,
        "recommendation": "STRONG_FIT",
        "interview_questions": [
            {
                "question": "Câu hỏi kiểm tra",
                "category": "technical",
                "target_skill": "Python",
                "purpose": "Kiểm tra",
            }
        ],
        "skill_assessments": [
            {
                "skill": "Python",
                "found": True,
                "confidence": 90.0,
                "evidence": "Kỹ sư Backend với 2 năm kinh nghiệm thực chiến phát triển API và microservices bằng Python",
                "level": "intermediate",
            }
        ],
        "experience_assessment": {
            "detected_years": 2.0,
            "relevant_years": 2.0,
            "confidence": 85.0,
            "summary": "2 năm kinh nghiệm",
        },
        "education_assessment": {
            "detected_level": "bachelor",
            "field_relevant": True,
            "summary": "Cử nhân",
        },
        # Completely fabricated strengths not mentioned anywhere in CV:
        "strengths": [
            "Đoạt giải Nobel Tin học thế giới năm 2023",
            "Cựu Giám đốc Công nghệ (CTO) tại Google Mountain View 10 năm",
            "Tác giả chính phát minh ra ngôn ngữ Python và hệ điều hành Linux",
        ],
        "concerns": [],
        "reflection_attempts": 0,
    }

    result = await verifier_node(state)

    # Proof: Verifier has no check on strengths, so verification_passed is True
    assert result["verification_passed"] is True
    assert result["overall_score"] == 85.0


# =============================================================================
# 4. Tái hiện: found=True nhưng Evidence là CHUỖI RỖNG / KHOẢNG TRẮNG
# =============================================================================
def test_is_evidence_grounded_behavior_on_empty_and_whitespace_evidence():
    """Demonstrate how _is_evidence_grounded behaves with empty or whitespace evidence."""
    cv = get_cv_fixture("python_in_skills_only")

    # 1. When evidence is empty string or None -> returns False
    assert _is_evidence_grounded("", "Python", cv["raw_text"]) is False
    assert _is_evidence_grounded(None, "Python", cv["raw_text"]) is False
    assert _is_evidence_grounded("Không tìm thấy trong CV", "Python", cv["raw_text"]) is False

    # 2. But when evidence is whitespace with the skill name (e.g. ' Python ')
    # it immediately returns True via `skill_clean in text_lower`
    assert _is_evidence_grounded("   Python   ", "Python", cv["raw_text"]) is True
