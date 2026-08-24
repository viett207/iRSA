"""Unit & Integration Tests for Hidden / Implicit Block Boundary Detection (Phase 3).

Verifies:
1. Heading-less CV with structured job entries (date intervals + company/role) is detected as
   implicit EXPERIENCE sections (confidence ~0.50, low tier).
2. Heading-less CV with structured education entries (date intervals + university) is detected as
   implicit EDUCATION sections.
3. Two-line block headers (Company on line 1, Role + Date on line 2) are properly grouped.
4. Pure conversational / narrative prose (without structural date intervals) is NEVER converted
   and safely remains UNKNOWN with 0.0 confidence.
5. End-to-end integration with ExperienceExtractor and SkillBinder extracts and binds facts
   with low confidence tier flags.
"""

import pytest

from src.chunking.experience_extractor import ExperienceExtractor
from src.chunking.section_detector import SectionDetector
from src.chunking.skill_attachment import extract_and_bind_skills
from src.chunking.text_chunker import TextChunker
from src.models.evidence import CVSection, ChunkLevel, EvidenceBlock


@pytest.fixture
def detector():
    return SectionDetector()


# ==============================================================================
# 1. IMPLICIT EXPERIENCE BLOCK DETECTION
# ==============================================================================

class TestImplicitExperienceBlockDetection:
    """Verify heading-less CVs with structured experience entries are detected implicitly."""

    def test_headingless_cv_with_single_experience_block(self, detector):
        cv_text = """LÊ HOÀNG NAM
Email: nam.le@example.com | SĐT: 0912345678

Công ty Cổ phần Công nghệ FPT (01/2022 - 12/2023)
Vị trí: Backend Developer
- Phát triển các dịch vụ RESTful API bằng Python, FastAPI và PostgreSQL.
- Triển khai hệ thống trên hạ tầng Docker và AWS.
"""
        sections = detector.detect_sections(cv_text)
        assert len(sections) == 2

        # 1. Intro content before first block -> SUMMARY
        assert sections[0].section == CVSection.SUMMARY
        assert sections[0].confidence == 0.45

        # 2. Structured job block -> EXPERIENCE (implicit)
        assert sections[1].section == CVSection.EXPERIENCE
        assert sections[1].confidence == 0.50
        assert sections[1].confidence_signals.get("implicit_structural") is True
        assert sections[1].heading_span is None

    def test_headingless_cv_with_multiple_experience_blocks(self, detector):
        cv_text = """TRẦN MINH ĐỨC

Tập đoàn VNG (01/2023 - Hiện tại)
Senior Golang Engineer
- Xây dựng hệ thống thanh toán với Golang, Kafka và Redis.

Công ty TNHH Phần mềm ABC (06/2021 - 12/2022)
Backend Developer
- Lập trình microservices với Python và Django.
"""
        sections = detector.detect_sections(cv_text)
        exp_sections = [s for s in sections if s.section == CVSection.EXPERIENCE]
        assert len(exp_sections) == 2
        for s in exp_sections:
            assert s.confidence == 0.50
            assert s.confidence_signals.get("implicit_structural") is True

    def test_two_line_company_and_role_date_header(self, detector):
        cv_text = """NGUYỄN VĂN AN

Công ty Công nghệ CMC
Lập trình viên Backend (2020 - 2023)
- Phát triển ứng dụng Java Spring Boot.
"""
        sections = detector.detect_sections(cv_text)
        exp_sections = [s for s in sections if s.section == CVSection.EXPERIENCE]
        assert len(exp_sections) == 1
        assert exp_sections[0].confidence == 0.50


# ==============================================================================
# 2. IMPLICIT EDUCATION BLOCK DETECTION
# ==============================================================================

class TestImplicitEducationBlockDetection:
    """Verify heading-less CVs with structured education entries are detected implicitly."""

    def test_headingless_cv_with_education_block(self, detector):
        cv_text = """PHẠM THỊ HÀ

Đại học Bách Khoa Hà Nội (2018 - 2022)
Ngành Công nghệ thông tin
- Cử nhân loại Giỏi, GPA 3.6/4.0
"""
        sections = detector.detect_sections(cv_text)
        edu_sections = [s for s in sections if s.section == CVSection.EDUCATION]
        assert len(edu_sections) == 1
        assert edu_sections[0].confidence == 0.50
        assert edu_sections[0].confidence_signals.get("implicit_structural") is True


# ==============================================================================
# 3. SAFETY GUARD: PURE NARRATIVE TEXT REMAINS UNKNOWN (0.0 CONFIDENCE)
# ==============================================================================

class TestPureNarrativeSafetyGuard:
    """Verify that pure narrative sentences without structured date intervals are NEVER converted."""

    def test_pure_narrative_cv_remains_single_unknown_section(self, detector):
        narrative_cv = (
            "Nguyễn Quốc Tuấn sinh năm 1996 tốt nghiệp ngành Công nghệ thông tin năm 2018.\n"
            "Tôi đã có 5 năm làm kỹ sư backend tại các công ty tài chính và thương mại điện tử.\n"
            "Hàng ngày tôi sử dụng Python, FastAPI, PostgreSQL và Redis để thiết kế các dịch vụ thanh toán.\n"
            "Tôi cũng thường xuyên triển khai các cụm Docker và Kubernetes trên hạ tầng AWS EKS.\n"
            "Ngoài ra tôi đạt chứng chỉ AWS Certified Solutions Architect và giải nhì Olympic tin học sinh viên."
        )
        sections = detector.detect_sections(narrative_cv)
        assert len(sections) == 1
        assert sections[0].section == CVSection.UNKNOWN
        assert sections[0].confidence == 0.0
        assert sections[0].heading_span is None


# ==============================================================================
# 4. END-TO-END INTEGRATION WITH EXTRACTORS & SKILL BINDING
# ==============================================================================

class TestEndToEndImplicitExtractionAndBinding:
    """Verify complete pipeline extracts entries and binds skills on heading-less structured CV."""

    def test_full_pipeline_on_headingless_structured_cv(self, detector):
        cv_text = """LÊ MINH ANH
0909123456 | anh.le@example.com

Công ty Cổ phần Công nghệ XYZ (01/2022 - 12/2023)
Kỹ sư Backend
- Phát triển API với Python, FastAPI và Redis.
- Tối ưu database PostgreSQL.
"""
        extractor = ExperienceExtractor()
        exp_entries = extractor.extract_entries(cv_text, doc_id="headingless_01")

        assert len(exp_entries) >= 1
        exp = exp_entries[0]
        assert "XYZ" in (exp.company or "")
        assert exp.start_date == "2022-01"
        assert exp.end_date == "2023-12"

        mentions, attachments = extract_and_bind_skills(
            raw_text=cv_text,
            experience_entries=exp_entries,
            detector=detector,
        )

        attached_skills = [a.skill_name for a in attachments if a.status == "attached"]
        assert "Python" in attached_skills
        assert "FastAPI" in attached_skills
        assert "PostgreSQL" in attached_skills
        assert "Redis" in attached_skills
