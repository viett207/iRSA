"""Unit tests for rule-based SectionDetector (English & Vietnamese)."""

import pytest
from src.chunking.section_detector import SectionDetector, HeadingSpan, SectionDetectionResult
from src.models.evidence import CVSection
from tests.fixtures.cv_fixtures import CV_FIXTURES


@pytest.fixture
def detector():
    return SectionDetector()


def test_detect_all_standard_english_headings(detector):
    """Verify standard English headings are recognized with correct CVSection."""
    test_cases = [
        ("PROFESSIONAL SUMMARY", CVSection.SUMMARY),
        ("Summary", CVSection.SUMMARY),
        ("About Me", CVSection.SUMMARY),
        ("Career Objective:", CVSection.SUMMARY),
        ("WORK EXPERIENCE", CVSection.EXPERIENCE),
        ("Professional Experience:", CVSection.EXPERIENCE),
        ("Employment History", CVSection.EXPERIENCE),
        ("KEY PROJECTS", CVSection.PROJECTS),
        ("Personal Projects:", CVSection.PROJECTS),
        ("TECHNICAL SKILLS", CVSection.SKILLS),
        ("Core Competencies:", CVSection.SKILLS),
        ("Programming Languages", CVSection.SKILLS),
        ("EDUCATION", CVSection.EDUCATION),
        ("Academic Background:", CVSection.EDUCATION),
        ("CERTIFICATIONS", CVSection.CERTIFICATIONS),
        ("Licenses & Certifications", CVSection.CERTIFICATIONS),
        ("AWARDS AND HONORS", CVSection.AWARDS),
        ("Honors & Awards:", CVSection.AWARDS),
    ]

    for heading, expected_section in test_cases:
        res = detector.detect_heading(heading)
        assert res.is_heading is True, f"Failed to recognize '{heading}' as heading"
        assert res.section == expected_section, (
            f"Heading '{heading}' classified as {res.section}, expected {expected_section}"
        )
        assert res.confidence >= 0.90


def test_detect_all_standard_vietnamese_headings(detector):
    """Verify standard Vietnamese headings are recognized with correct CVSection."""
    test_cases = [
        ("TÓM TẮT BẢN THÂN", CVSection.SUMMARY),
        ("Mục tiêu nghề nghiệp:", CVSection.SUMMARY),
        ("Giới thiệu bản thân", CVSection.SUMMARY),
        ("KINH NGHIỆM LÀM VIỆC", CVSection.EXPERIENCE),
        ("Quá trình làm việc:", CVSection.EXPERIENCE),
        ("Lịch sử làm việc", CVSection.EXPERIENCE),
        ("DỰ ÁN TIÊU BIỂU", CVSection.PROJECTS),
        ("Dự án cá nhân:", CVSection.PROJECTS),
        ("KỸ NĂNG CHUYÊN MÔN", CVSection.SKILLS),
        ("Kỹ năng kỹ thuật:", CVSection.SKILLS),
        ("Công nghệ sử dụng", CVSection.SKILLS),
        ("TRÌNH ĐỘ HỌC VẤN", CVSection.EDUCATION),
        ("Quá trình học tập:", CVSection.EDUCATION),
        ("CHỨNG CHỈ NGHỀ NGHIỆP", CVSection.CERTIFICATIONS),
        ("Bằng cấp & Chứng chỉ", CVSection.CERTIFICATIONS),
        ("GIẢI THƯỞNG & THÀNH TÍCH", CVSection.AWARDS),
        ("Khen thưởng & Danh hiệu:", CVSection.AWARDS),
    ]

    for heading, expected_section in test_cases:
        res = detector.detect_heading(heading)
        assert res.is_heading is True, f"Failed to recognize '{heading}' as heading"
        assert res.section == expected_section, (
            f"Heading '{heading}' classified as {res.section}, expected {expected_section}"
        )
        assert res.confidence >= 0.90


def test_heading_formatting_variations(detector):
    """Verify detector handles Markdown symbols, numbering, bullets, and punctuation variations."""
    variations = [
        ("### KINH NGHIỆM LÀM VIỆC", CVSection.EXPERIENCE),
        ("## 1. KỸ NĂNG CHUYÊN MÔN:", CVSection.SKILLS),
        ("- Projects:", CVSection.PROJECTS),
        ("--- EDUCATION ---", CVSection.EDUCATION),
        ("I. TÓM TẮT NGHỀ NGHIỆP", CVSection.SUMMARY),
        ("• CERTIFICATIONS & LICENSES:", CVSection.CERTIFICATIONS),
    ]

    for line, expected_section in variations:
        res = detector.detect_heading(line)
        assert res.is_heading is True, f"Failed to recognize variation '{line}'"
        assert res.section == expected_section


def test_heading_span_coordinates_accuracy(detector):
    """Verify heading_span exact start and end match the source slice in raw text."""
    raw_text = (
        "NGUYỄN VĂN A\n"
        "Email: a@example.com\n\n"
        "KINH NGHIỆM LÀM VIỆC:\n"
        "Công ty ABC (2021 - 2024)\n"
    )

    heading_line = "KINH NGHIỆM LÀM VIỆC:"
    start = raw_text.index(heading_line)
    end = start + len(heading_line)

    res = detector.detect_heading(heading_line, char_start=start, char_end=end)

    assert res.is_heading is True
    assert res.heading_span is not None
    assert res.heading_span.char_start == start
    assert res.heading_span.char_end == end
    assert raw_text[res.heading_span.char_start:res.heading_span.char_end] == heading_line


def test_register_alias_extensibility(detector):
    """Verify custom aliases can be registered dynamically at runtime."""
    custom_heading = "KHO VŨ KHÍ CÔNG NGHỆ"

    # Before registering: unknown
    res_before = detector.detect_heading(custom_heading)
    assert res_before.section == CVSection.UNKNOWN

    # Register new custom alias
    detector.register_alias(CVSection.SKILLS, "kho vũ khí công nghệ")

    # After registering: matches SKILLS
    res_after = detector.detect_heading(custom_heading)
    assert res_after.is_heading is True
    assert res_after.section == CVSection.SKILLS
    assert res_after.confidence >= 0.90


def test_non_heading_regular_text_classified_as_unknown(detector):
    """Verify regular description lines, bullets, and long paragraphs are not mistaken for headings."""
    non_headings = [
        "- Phát triển 20+ RESTful APIs bằng Python và FastAPI cho khách hàng doanh nghiệp.",
        "Nguyễn Văn A - Backend Software Engineer",
        "Tôi là một kỹ sư phần mềm đam mê công nghệ và muốn đóng góp giá trị cho dự án.",
        "Điện thoại: 0912345678, Email: dev@example.com",
    ]

    for line in non_headings:
        res = detector.detect_heading(line)
        assert res.is_heading is False
        assert res.section == CVSection.UNKNOWN


def test_detect_sections_full_document_segmentation(detector):
    """Verify detect_sections accurately segments a full CV into contiguous sections."""
    raw_cv = (
        "HỌ TÊN: NGUYỄN VĂN A\n\n"
        "TÓM TẮT:\n"
        "Kỹ sư phần mềm 3 năm kinh nghiệm.\n\n"
        "KINH NGHIỆM LÀM VIỆC:\n"
        "Công ty X (2021-2023): Lập trình Python.\n\n"
        "KỸ NĂNG:\n"
        "Python, FastAPI, Docker, PostgreSQL.\n\n"
        "HỌC VẤN:\n"
        "Đại học Bách Khoa Hà Nội (2016-2020)."
    )

    sections = detector.detect_sections(raw_cv)
    assert len(sections) >= 4

    detected_types = [s.section for s in sections]
    assert CVSection.SUMMARY in detected_types
    assert CVSection.EXPERIENCE in detected_types
    assert CVSection.SKILLS in detected_types
    assert CVSection.EDUCATION in detected_types

    # Ensure full coverage without invalid bounds
    for sec in sections:
        assert 0 <= sec.full_char_start < sec.full_char_end <= len(raw_cv)
        assert sec.body_char_start >= sec.full_char_start
        assert sec.body_char_end <= sec.full_char_end


def test_section_detector_across_all_12_cv_fixtures(detector):
    """Verify SectionDetector runs without error on all 12 regression CV fixtures."""
    for cv_key, cv_data in CV_FIXTURES.items():
        raw_text = cv_data["raw_text"]
        sections = detector.detect_sections(raw_text)
        assert len(sections) > 0, f"CV {cv_key} produced 0 sections"

        for s in sections:
            assert s.full_char_start >= 0
            assert s.full_char_end <= len(raw_text)
            if s.heading_span:
                # Heading span must strictly slice from raw_text
                hs = s.heading_span
                assert raw_text[hs.char_start:hs.char_end] == hs.matched_text
