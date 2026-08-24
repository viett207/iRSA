"""Unit and Integration Tests for Multi-Line Heading Merging, Extended Section Ontology,
and Majority Overlap Resolution.

Verifies:
1. Multi-Line Heading Merging: Correctly detects section headers split across 2 lines.
2. Extended Section Ontology: Accurately classifies Publications, Languages, Volunteering,
   References, Interests, and Activities in Vietnamese & English.
3. Majority Overlap Resolution: Cross-boundary chunks inherit the majority section.
4. Seamless End-to-End Segmentation without boundary errors or data loss.
"""

import pytest

from src.chunking.section_detector import SectionDetector
from src.chunking.text_chunker import TextChunker
from src.models.evidence import CVSection, ChunkLevel, EvidenceBlock


@pytest.fixture
def detector():
    return SectionDetector()


# ==============================================================================
# 1. MULTI-LINE HEADING MERGING
# ==============================================================================

class TestMultiLineHeadingMerging:
    """Verify that headings split across two consecutive short lines are seamlessly merged."""

    def test_multiline_vietnamese_experience_heading(self, detector):
        cv_text = """NGUYỄN VĂN AN
KINH NGHIỆM
LÀM VIỆC
Tập đoàn FPT (01/2022 - 12/2023)
- Lập trình backend Python, FastAPI
"""
        sections = detector.detect_sections(cv_text)
        exp_secs = [s for s in sections if s.section == CVSection.EXPERIENCE]
        assert len(exp_secs) == 1
        assert exp_secs[0].heading_span is not None
        assert "KINH NGHIỆM" in exp_secs[0].heading_span.matched_text
        assert "LÀM VIỆC" in exp_secs[0].heading_span.matched_text
        assert exp_secs[0].confidence >= 0.85

    def test_multiline_vietnamese_work_history_heading(self, detector):
        cv_text = """TRẦN THỊ BÌNH
QUÁ TRÌNH
CÔNG TÁC
Công ty ABC (01/2021 - 12/2022)
- Phát triển hệ thống microservices
"""
        sections = detector.detect_sections(cv_text)
        exp_secs = [s for s in sections if s.section == CVSection.EXPERIENCE]
        assert len(exp_secs) == 1
        assert exp_secs[0].heading_span is not None
        assert "QUÁ TRÌNH" in exp_secs[0].heading_span.matched_text

    def test_multiline_english_experience_heading(self, detector):
        cv_text = """JOHN DOE
PROFESSIONAL
EXPERIENCE
Tech Corp (2020 - 2023)
- Senior Software Engineer
"""
        sections = detector.detect_sections(cv_text)
        exp_secs = [s for s in sections if s.section == CVSection.EXPERIENCE]
        assert len(exp_secs) == 1
        assert exp_secs[0].heading_span is not None
        assert "PROFESSIONAL" in exp_secs[0].heading_span.matched_text

    def test_multiline_technical_skills_heading(self, detector):
        cv_text = """LÊ MINH
TECHNICAL
SKILLS
Python, Docker, Kubernetes, AWS
"""
        sections = detector.detect_sections(cv_text)
        sk_secs = [s for s in sections if s.section == CVSection.SKILLS]
        assert len(sk_secs) == 1
        assert sk_secs[0].heading_span is not None

    def test_multiline_projects_heading(self, detector):
        cv_text = """HOÀNG NAM
DỰ ÁN
TIÊU BIỂU
E-Commerce Platform (2023)
"""
        sections = detector.detect_sections(cv_text)
        proj_secs = [s for s in sections if s.section == CVSection.PROJECTS]
        assert len(proj_secs) == 1

    def test_multiline_education_heading(self, detector):
        cv_text = """VŨ ĐỨC
TRÌNH ĐỘ
HỌC VẤN
Đại học Bách Khoa Hà Nội (2018 - 2022)
"""
        sections = detector.detect_sections(cv_text)
        edu_secs = [s for s in sections if s.section == CVSection.EDUCATION]
        assert len(edu_secs) == 1


# ==============================================================================
# 2. EXTENDED SECTION ONTOLOGY
# ==============================================================================

class TestExtendedSectionOntology:
    """Verify newly added sections (Publications, Languages, Volunteering, References, Interests, Activities)."""

    @pytest.mark.parametrize("heading,expected_section", [
        # Publications
        ("PUBLICATIONS", CVSection.PUBLICATIONS),
        ("Công bố khoa học", CVSection.PUBLICATIONS),
        ("Bài báo khoa học:", CVSection.PUBLICATIONS),
        ("Research Papers", CVSection.PUBLICATIONS),
        ("Scientific Publications", CVSection.PUBLICATIONS),
        ("Sáng chế & Công bố:", CVSection.PUBLICATIONS),
        # Languages
        ("LANGUAGES", CVSection.LANGUAGES),
        ("Ngoại ngữ", CVSection.LANGUAGES),
        ("Trình độ ngoại ngữ:", CVSection.LANGUAGES),
        ("Language Skills", CVSection.LANGUAGES),
        ("Language Proficiency:", CVSection.LANGUAGES),
        # Volunteering
        ("VOLUNTEERING", CVSection.VOLUNTEERING),
        ("Hoạt động tình nguyện", CVSection.VOLUNTEERING),
        ("Community Service", CVSection.VOLUNTEERING),
        ("Volunteer Experience:", CVSection.VOLUNTEERING),
        ("Công tác xã hội", CVSection.VOLUNTEERING),
        # References
        ("REFERENCES", CVSection.REFERENCES),
        ("Người tham chiếu", CVSection.REFERENCES),
        ("Thông tin tham chiếu:", CVSection.REFERENCES),
        ("Referees", CVSection.REFERENCES),
        ("Professional References", CVSection.REFERENCES),
        # Interests
        ("INTERESTS", CVSection.INTERESTS),
        ("Sở thích", CVSection.INTERESTS),
        ("Hobbies", CVSection.INTERESTS),
        ("Personal Interests:", CVSection.INTERESTS),
        # Activities
        ("ACTIVITIES", CVSection.ACTIVITIES),
        ("Hoạt động ngoại khóa", CVSection.ACTIVITIES),
        ("Extracurricular Activities", CVSection.ACTIVITIES),
        ("Hoạt động đoàn thể:", CVSection.ACTIVITIES),
    ])
    def test_extended_sections_recognized(self, detector, heading, expected_section):
        res = detector.detect_heading(heading)
        assert res.is_heading is True, f"Failed to detect heading: '{heading}'"
        assert res.section == expected_section, f"Expected {expected_section}, got {res.section} for '{heading}'"
        assert res.confidence >= 0.85


# ==============================================================================
# 3. MAJORITY OVERLAP RESOLUTION IN TEXT CHUNKER
# ==============================================================================

class TestMajorityOverlapResolution:
    """Verify that chunks spanning section boundaries inherit the majority section."""

    def test_chunk_spanning_two_sections_gets_majority(self, detector):
        cv_text = (
            "KINH NGHIỆM LÀM VIỆC:\n"
            "Công ty ABC (2020 - 2022): Lập trình Python.\n"
            "TRÌNH ĐỘ HỌC VẤN:\n"
            "Đại học Bách Khoa Hà Nội (2016 - 2020): Cử nhân CNTT.\n"
        )
        sections = detector.detect_sections(cv_text)
        assert len(sections) == 2
        exp_sec = sections[0]
        edu_sec = sections[1]

        # Span with 10 chars in experience and 60 chars in education -> Should be EDUCATION
        span_start = exp_sec.full_char_end - 10
        span_end = span_start + 70  # 10 chars in exp + 60 chars in edu

        sec, conf, is_h, _ = TextChunker._resolve_section_for_span(
            char_start=span_start,
            char_end=span_end,
            sections=sections,
        )
        assert sec == CVSection.EDUCATION, f"Majority (60 vs 10) should resolve to EDUCATION, got {sec}"

    def test_chunk_within_single_section_remains_exact(self, detector):
        cv_text = (
            "KINH NGHIỆM LÀM VIỆC:\n"
            "Công ty ABC (2020 - 2022): Lập trình Python và FastAPI.\n"
            "HỌC VẤN:\n"
            "Đại học Bách Khoa (2016 - 2020).\n"
        )
        sections = detector.detect_sections(cv_text)
        exp_sec = sections[0]

        # Chunk fully inside experience body (not heading)
        sec, conf, is_h, _ = TextChunker._resolve_section_for_span(
            char_start=exp_sec.body_char_start + 5,
            char_end=exp_sec.body_char_start + 35,
            sections=sections,
        )
        assert sec == CVSection.EXPERIENCE
        assert is_h is False



# ==============================================================================
# 4. COMPREHENSIVE END-TO-END SEGMENTATION
# ==============================================================================

class TestEndToEndSegmentation:
    """Verify complete segmentation of multi-section CV with multi-line headers."""

    def test_full_cv_segmentation_with_multiline_and_extended_sections(self, detector):
        cv_text = """NGUYỄN VĂN AN
TÓM TẮT
BẢN THÂN
Kỹ sư phần mềm với 5 năm kinh nghiệm.

KINH NGHIỆM
LÀM VIỆC
Tập đoàn FPT (01/2021 - 12/2023)
- Phát triển backend Python, FastAPI

HỌC VẤN
Đại học Bách Khoa Hà Nội (2016 - 2020)

CÔNG BỐ
KHOA HỌC
- Bài báo về Machine Learning tại IEEE 2020

NGOẠI NGỮ
- Tiếng Anh: IELTS 7.5
- Tiếng Nhật: N3

NGƯỜI THAM CHIẾU
- Ông Nguyễn Văn X - CTO FPT (0901234567)
"""
        sections = detector.detect_sections(cv_text)
        section_types = [s.section for s in sections]

        assert CVSection.SUMMARY in section_types
        assert CVSection.EXPERIENCE in section_types
        assert CVSection.EDUCATION in section_types
        assert CVSection.PUBLICATIONS in section_types
        assert CVSection.LANGUAGES in section_types
        assert CVSection.REFERENCES in section_types

        # Verify all sections have valid bounding spans and no negative bounds
        for s in sections:
            assert s.full_char_start >= 0
            assert s.full_char_end > s.full_char_start
            assert cv_text[s.full_char_start:s.full_char_end] is not None
