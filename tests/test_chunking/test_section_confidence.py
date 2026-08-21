"""Unit tests for explainable section_confidence calculation across High, Medium, and Low tiers.

Verifies:
1. Signal extraction: exact alias, short line, uppercase, colon, standalone line, fuzzy matching.
2. Explicit mathematical formula and explainable breakdown.
3. High confidence (>= 0.85).
4. Medium confidence (0.60 <= conf < 0.85).
5. Low confidence (0.0 < conf < 0.60).
6. Non-heading zero confidence (0.0).
7. Explainability metadata and structured breakdown.
"""

import pytest

from src.chunking.section_detector import (
    SectionDetector,
    calculate_section_confidence,
    strip_accents,
)
from src.models.evidence import CVSection


@pytest.fixture
def detector():
    return SectionDetector()


# ==============================================================================
# 1. HIGH CONFIDENCE TESTS (>= 0.85)
# ==============================================================================

def test_high_confidence_exact_aliases_all_caps(detector):
    """Verify standard ALL CAPS exact aliases score high confidence (>= 0.85)."""
    high_cases = [
        ("KINH NGHIỆM LÀM VIỆC", CVSection.EXPERIENCE),
        ("PROFESSIONAL SUMMARY", CVSection.SUMMARY),
        ("TECHNICAL SKILLS", CVSection.SKILLS),
        ("TRÌNH ĐỘ HỌC VẤN", CVSection.EDUCATION),
        ("KEY PROJECTS", CVSection.PROJECTS),
        ("CERTIFICATIONS", CVSection.CERTIFICATIONS),
        ("AWARDS & HONORS", CVSection.AWARDS),
    ]

    for line, expected_sec in high_cases:
        res = detector.detect_heading(line)
        assert res.is_heading is True
        assert res.section == expected_sec
        assert res.confidence >= 0.85
        assert res.confidence_breakdown is not None
        assert res.confidence_breakdown.confidence_tier == "high"
        assert res.confidence_breakdown.is_uppercase is True
        assert res.confidence_breakdown.is_standalone_line is True
        assert res.confidence_breakdown.base_match_score == 0.75
        assert "is_uppercase" in res.confidence_signals


def test_high_confidence_with_markdown_and_colon(detector):
    """Verify headings with Markdown formatting (#, ##, ###) or colons reach high confidence."""
    formatted_cases = [
        ("### Professional Experience:", CVSection.EXPERIENCE),
        ("## Kỹ năng chuyên môn:", CVSection.SKILLS),
        ("--- EDUCATION ---", CVSection.EDUCATION),
        ("I. TÓM TẮT BẢN THÂN", CVSection.SUMMARY),
        ("• Key Projects:", CVSection.PROJECTS),
    ]

    for line, expected_sec in formatted_cases:
        res = detector.detect_heading(line)
        assert res.is_heading is True
        assert res.section == expected_sec
        assert res.confidence >= 0.90
        assert res.confidence_breakdown.confidence_tier == "high"
        assert res.confidence_breakdown.has_heading_marker or res.confidence_breakdown.has_colon


def test_high_confidence_prefix_with_standard_date_qualifier(detector):
    """Verify prefix matches with standard date range qualifiers achieve high confidence."""
    qualified_cases = [
        ("KINH NGHIỆM LÀM VIỆC (2020 - 2024)", CVSection.EXPERIENCE),
        ("Work Experience (2018 - Present)", CVSection.EXPERIENCE),
        ("Kỹ năng & Công nghệ:", CVSection.SKILLS),
        ("Học vấn & Đào tạo:", CVSection.EDUCATION),
    ]

    for line, expected_sec in qualified_cases:
        res = detector.detect_heading(line)
        assert res.is_heading is True
        assert res.section == expected_sec
        assert res.confidence >= 0.85
        assert res.confidence_breakdown.confidence_tier == "high"
        assert res.confidence_breakdown.has_valid_qualifier is True or res.confidence_breakdown.match_type == "exact"


# ==============================================================================
# 2. MEDIUM CONFIDENCE TESTS (0.60 <= conf < 0.85)
# ==============================================================================

def test_medium_confidence_typo_fuzzy_match(detector):
    """Verify headings with minor typos match via fuzzy logic and receive medium confidence."""
    fuzzy_cases = [
        # Typo in English
        ("Work Experiance", CVSection.EXPERIENCE),
        ("Educaton:", CVSection.EDUCATION),
        ("Certificatons", CVSection.CERTIFICATIONS),
        ("Technical Skils", CVSection.SKILLS),
    ]

    for line, expected_sec in fuzzy_cases:
        res = detector.detect_heading(line)
        assert res.is_heading is True, f"Failed to fuzzy match: {line}"
        assert res.section == expected_sec
        assert 0.60 <= res.confidence < 0.85, f"Confidence {res.confidence} not in medium range for '{line}'"
        assert res.confidence_breakdown.confidence_tier == "medium"
        assert res.confidence_breakdown.match_type == "fuzzy"
        assert res.confidence_breakdown.similarity_ratio >= 0.80


def test_medium_confidence_unaccented_vietnamese_headings(detector):
    """Verify unaccented Vietnamese headings (candidate typed without diacritics) score medium confidence."""
    unaccented_cases = [
        ("KINH NGHIEM LAM VIEC", CVSection.EXPERIENCE),
        ("HOC VAN", CVSection.EDUCATION),
        ("KY NANG CHUYEN MON", CVSection.SKILLS),
        ("DU AN TIEU BIEU", CVSection.PROJECTS),
        ("CHUNG CHI NGHIEP VU", CVSection.CERTIFICATIONS),
    ]

    for line, expected_sec in unaccented_cases:
        res = detector.detect_heading(line)
        assert res.is_heading is True, f"Failed to match unaccented: {line}"
        assert res.section == expected_sec
        assert 0.60 <= res.confidence < 0.85, f"Confidence {res.confidence} not in medium range for '{line}'"
        assert res.confidence_breakdown.confidence_tier == "medium"


def test_medium_confidence_prefix_with_long_qualifier(detector):
    """Verify lowercase prefix match with longer qualifiers scores medium confidence."""
    moderate_cases = [
        ("personal projects & technical portfolio", CVSection.PROJECTS),
        ("core skills & competencies overview", CVSection.SKILLS),
    ]

    for line, expected_sec in moderate_cases:
        res = detector.detect_heading(line)
        assert res.is_heading is True
        assert res.section == expected_sec
        assert 0.60 <= res.confidence < 0.85
        assert res.confidence_breakdown.confidence_tier == "medium"


# ==============================================================================
# 3. LOW CONFIDENCE TESTS (0.0 < conf < 0.60)
# ==============================================================================

def test_low_confidence_implicit_pre_heading_region(detector):
    """Verify implicit pre-heading summary content is assigned low confidence (~0.50)."""
    raw_cv = (
        "Nguyễn Văn A\n"
        "Email: dev@example.com\n"
        "Kỹ sư phần mềm mong muốn tìm kiếm cơ hội phát triển.\n\n"
        "KINH NGHIỆM LÀM VIỆC:\n"
        "Công ty X (2021 - 2024)"
    )

    sections = detector.detect_sections(raw_cv)
    assert len(sections) >= 2
    pre_heading_sec = sections[0]

    assert pre_heading_sec.section == CVSection.SUMMARY
    assert pre_heading_sec.heading_span is None
    assert 0.0 < pre_heading_sec.confidence < 0.60
    assert pre_heading_sec.confidence_breakdown.confidence_tier == "low"
    assert pre_heading_sec.confidence_breakdown.match_type == "implicit"


def test_low_confidence_weak_fuzzy_longer_line_calculation():
    """Verify calculate_section_confidence assigns low confidence to weak fuzzy match on longer line."""
    breakdown = calculate_section_confidence(
        raw_line="technolgy stack notes and developer details and tools",
        norm_line="technolgy stack notes and developer details and tools",
        match_type="fuzzy",
        matched_alias="technologies",
        similarity_ratio=0.80,
    )

    assert 0.0 < breakdown.final_confidence < 0.60
    assert breakdown.confidence_tier == "low"
    assert breakdown.match_type == "fuzzy"
    assert "long_line_penalty" in breakdown.signal_weights


# ==============================================================================
# 4. ZERO CONFIDENCE / NON-HEADING REJECTION TESTS (0.0)
# ==============================================================================

def test_zero_confidence_descriptive_sentences_rejected(detector):
    """Verify full sentences containing keywords are completely rejected with 0.0 confidence."""
    sentence_cases = [
        "Tôi có 5 năm kinh nghiệm làm việc trong lĩnh vực phát triển hệ thống phân tán.",
        "Quá trình công tác tại công ty giúp tôi rèn luyện kỹ năng lãnh đạo và teamwork.",
        "Dự án này đã đạt giải nhất cuộc thi sáng tạo khoa học năm 2022.",
        "I was responsible for leading the backend development team of 8 engineers.",
    ]

    for sentence in sentence_cases:
        res = detector.detect_heading(sentence)
        assert res.is_heading is False
        assert res.section == CVSection.UNKNOWN
        assert res.confidence == 0.0
        assert res.confidence_breakdown.confidence_tier == "none"
        assert res.confidence_breakdown.final_confidence == 0.0


def test_zero_confidence_bullet_points_rejected(detector):
    """Verify bullet points describing work accomplishments are rejected with 0.0 confidence."""
    bullet_cases = [
        "- Phát triển 20+ RESTful APIs bằng Python và FastAPI cho khách hàng.",
        "* Tối ưu hóa truy vấn PostgreSQL giúp giảm 40% thời gian phản hồi.",
        "• Triển khai hệ thống CI/CD trên GitHub Actions và AWS EKS.",
    ]

    for bullet in bullet_cases:
        res = detector.detect_heading(bullet)
        assert res.is_heading is False
        assert res.section == CVSection.UNKNOWN
        assert res.confidence == 0.0


# ==============================================================================
# 5. EXPLAINABILITY & FORMULA BREAKDOWN VERIFICATION
# ==============================================================================

def test_explainable_breakdown_structure_and_formula():
    """Verify that calculate_section_confidence accurately tracks each signal additively."""
    # Test step-by-step addition of signals
    base_calc = calculate_section_confidence(
        raw_line="experience",
        norm_line="experience",
        match_type="exact",
        matched_alias="experience",
    )
    # base(0.75) + is_short_line(0.05) + is_standalone(0.05) = 0.85
    assert base_calc.raw_confidence == 0.85
    assert base_calc.final_confidence == 0.85

    # Add ALL CAPS modifier
    caps_calc = calculate_section_confidence(
        raw_line="EXPERIENCE",
        norm_line="experience",
        match_type="exact",
        matched_alias="experience",
    )
    # base(0.75) + is_uppercase(0.10) + is_short_line(0.05) + is_standalone(0.05) = 0.95
    assert caps_calc.raw_confidence == 0.95
    assert caps_calc.final_confidence == 0.95
    assert caps_calc.signal_weights["is_uppercase"] == 0.10

    # Add Colon modifier
    colon_calc = calculate_section_confidence(
        raw_line="EXPERIENCE:",
        norm_line="experience",
        match_type="exact",
        matched_alias="experience",
    )
    # base(0.75) + is_uppercase(0.10) + has_colon(0.05) + is_short_line(0.05) + is_standalone(0.05) = 1.00
    assert colon_calc.raw_confidence == 1.00
    assert colon_calc.final_confidence == 1.00
    assert colon_calc.signal_weights["has_colon"] == 0.05

    # Check explanation string contains transparent formula details
    assert "Base[exact]=0.75" in colon_calc.explanation
    assert "is_uppercase(+0.10)" in colon_calc.explanation
    assert "has_colon(+0.05)" in colon_calc.explanation
    assert "Tier=high" in colon_calc.explanation


def test_strip_accents_helper():
    """Verify strip_accents properly normalizes Vietnamese diacritics for fuzzy matching."""
    assert strip_accents("Kinh nghiệm làm việc") == "kinh nghiem lam viec"
    assert strip_accents("Trình độ học vấn") == "trinh do hoc van"
    assert strip_accents("Giải thưởng & thành tích") == "giai thuong & thanh tich"
    assert strip_accents("Đã hoàn thành") == "da hoan thanh"
