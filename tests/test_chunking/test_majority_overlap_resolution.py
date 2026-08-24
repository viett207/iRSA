"""Comprehensive Unit & Integration Tests for Majority Character Overlap Resolution (Phase 4).

Verifies:
1. Two-section boundary crossing: Window chunk spanning between Section A and Section B
   inherits the section having the strictly greater character overlap.
2. Multi-section boundary crossing: Large window (e.g. 80 words) touching Section A, B, and C
   inherits the section with the absolute maximum character overlap.
3. Heading span within window chunks: Heading text inside a window properly marks
   is_heading=True only when heading constitutes the primary/majority content of the chunk.
4. All chunk levels (Line, Window 30, Window 80, EvidenceBlocks) maintain consistent section
   grounding and 100% exact character offset fidelity.
"""

import pytest

from src.chunking.section_detector import SectionDetector
from src.chunking.text_chunker import TextChunker
from src.models.evidence import CVSection, ChunkLevel, EvidenceBlock


@pytest.fixture
def detector():
    return SectionDetector()


# Multi-section CV fixture for precise character overlap measurements
OVERLAP_TEST_CV = (
    "NGUYỄN VĂN AN\n"
    "Fullstack Engineer với 5 năm kinh nghiệm.\n\n"
    "KINH NGHIỆM LÀM VIỆC:\n"
    "Tập đoàn FPT Software (01/2021 - 12/2023)\n"
    "- Phát triển các microservices backend bằng Python FastAPI và database PostgreSQL.\n"
    "- Xây dựng các cụm Docker containers và pipeline CI/CD trên AWS.\n\n"
    "KỸ NĂNG CHUYÊN MÔN:\n"
    "- Ngôn ngữ: Python, Go, TypeScript, SQL\n"
    "- Framework: FastAPI, Django, React, Vue\n"
    "- DevOps: Docker, Kubernetes, AWS, CI/CD\n\n"
    "TRÌNH ĐỘ HỌC VẤN:\n"
    "Đại học Bách Khoa Hà Nội (2016 - 2020)\n"
    "- Cử nhân Công nghệ Thông tin loại Giỏi\n\n"
    "NGOẠI NGỮ:\n"
    "- Tiếng Anh: IELTS 7.5\n"
)


# ==============================================================================
# 1. MATHEMATICAL OVERLAP RESOLUTION
# ==============================================================================

class TestMathematicalMajorityOverlap:
    """Verify exact mathematical character overlap calculations for arbitrary span slices."""

    def test_70_30_split_resolves_to_majority_section(self, detector):
        """When 70% of chars belong to Section B and 30% to Section A -> Section B."""
        sections = detector.detect_sections(OVERLAP_TEST_CV)
        exp_sec = [s for s in sections if s.section == CVSection.EXPERIENCE][0]
        sk_sec = [s for s in sections if s.section == CVSection.SKILLS][0]

        # Span taking 30 chars from tail of EXPERIENCE and 70 chars from head of SKILLS
        span_start = exp_sec.full_char_end - 30
        span_end = exp_sec.full_char_end + 70

        sec, conf, is_h, _ = TextChunker._resolve_section_for_span(
            char_start=span_start,
            char_end=span_end,
            sections=sections,
        )
        assert sec == CVSection.SKILLS, f"Expected SKILLS (70 > 30), got {sec}"

    def test_80_20_split_resolves_to_first_section(self, detector):
        """When 80% of chars belong to Section A and 20% to Section B -> Section A."""
        sections = detector.detect_sections(OVERLAP_TEST_CV)
        exp_sec = [s for s in sections if s.section == CVSection.EXPERIENCE][0]
        sk_sec = [s for s in sections if s.section == CVSection.SKILLS][0]

        # Span taking 80 chars from tail of EXPERIENCE and 20 chars from head of SKILLS
        span_start = exp_sec.full_char_end - 80
        span_end = exp_sec.full_char_end + 20

        sec, conf, is_h, _ = TextChunker._resolve_section_for_span(
            char_start=span_start,
            char_end=span_end,
            sections=sections,
        )
        assert sec == CVSection.EXPERIENCE, f"Expected EXPERIENCE (80 > 20), got {sec}"

    def test_three_section_overlap_picks_absolute_maximum(self, detector):
        """Span touching 3 sections (A: 15 chars, B: 120 chars, C: 25 chars) -> Section B."""
        sections = detector.detect_sections(OVERLAP_TEST_CV)
        exp_sec = [s for s in sections if s.section == CVSection.EXPERIENCE][0]
        sk_sec = [s for s in sections if s.section == CVSection.SKILLS][0]
        edu_sec = [s for s in sections if s.section == CVSection.EDUCATION][0]

        # Span starting 15 chars before SKILLS (in EXP), covering entire SKILLS, and 25 chars into EDU
        span_start = sk_sec.full_char_start - 15
        span_end = sk_sec.full_char_end + 25

        sec, conf, is_h, _ = TextChunker._resolve_section_for_span(
            char_start=span_start,
            char_end=span_end,
            sections=sections,
        )
        assert sec == CVSection.SKILLS, f"Expected SKILLS (largest overlap), got {sec}"


# ==============================================================================
# 2. SLIDING WINDOW CHUNKER INTEGRATION
# ==============================================================================

class TestSlidingWindowMajorityOverlap:
    """Verify window_30 and window_80 chunks accurately resolve boundary sections."""

    def test_window_chunks_have_valid_sections_and_no_unknown_in_structured_cv(self, detector):
        """All window chunks in a structured CV must be assigned to valid non-unknown sections."""
        chunks_30 = TextChunker.chunk_windows(
            OVERLAP_TEST_CV,
            window_size=30,
            level_name="window_30",
            detector=detector,
        )
        chunks_80 = TextChunker.chunk_windows(
            OVERLAP_TEST_CV,
            window_size=80,
            level_name="window_80",
            detector=detector,
        )

        assert len(chunks_30) > 0
        assert len(chunks_80) > 0

        valid_sections = {"summary", "experience", "skills", "education", "languages"}
        for c in chunks_30:
            assert c["section"] in valid_sections, f"Window 30 chunk had invalid section: {c['section']}"
            assert OVERLAP_TEST_CV[c["char_start"]:c["char_end"]] == c["text"]

        for c in chunks_80:
            assert c["section"] in valid_sections, f"Window 80 chunk had invalid section: {c['section']}"
            assert OVERLAP_TEST_CV[c["char_start"]:c["char_end"]] == c["text"]


# ==============================================================================
# 3. HEADING OVERLAP THRESHOLD IN WINDOWS
# ==============================================================================

class TestHeadingOverlapInWindows:
    """Verify is_heading flag behavior for exact headings vs body windows."""

    def test_exact_heading_line_marked_is_heading_true(self, detector):
        sections = detector.detect_sections(OVERLAP_TEST_CV)
        exp_sec = [s for s in sections if s.section == CVSection.EXPERIENCE][0]
        h_span = exp_sec.heading_span
        assert h_span is not None

        sec, conf, is_h, _ = TextChunker._resolve_section_for_span(
            char_start=h_span.char_start,
            char_end=h_span.char_end,
            sections=sections,
        )
        assert sec == CVSection.EXPERIENCE
        assert is_h is True

    def test_body_window_not_marked_is_heading(self, detector):
        sections = detector.detect_sections(OVERLAP_TEST_CV)
        exp_sec = [s for s in sections if s.section == CVSection.EXPERIENCE][0]

        # Window purely in body
        sec, conf, is_h, _ = TextChunker._resolve_section_for_span(
            char_start=exp_sec.body_char_start + 10,
            char_end=exp_sec.body_char_start + 60,
            sections=sections,
        )
        assert sec == CVSection.EXPERIENCE
        assert is_h is False


# ==============================================================================
# 4. EVIDENCE BLOCK CONVERSION & FIDELITY
# ==============================================================================

class TestEvidenceBlockMajorityOverlapFidelity:
    """Verify chunk_to_evidence_blocks produces fully validated blocks with majority overlap."""

    def test_chunk_to_evidence_blocks_has_zero_span_discrepancies(self, detector):
        blocks = TextChunker.chunk_to_evidence_blocks(OVERLAP_TEST_CV, detector=detector)
        assert len(blocks) > 0

        for b in blocks:
            # 100% exact text slice match
            assert OVERLAP_TEST_CV[b.char_start:b.char_end] == b.text
            # Block ID must be standard format
            assert b.block_id.startswith("blk_")
            # Confidence must be valid float in [0.0, 1.0]
            assert 0.0 <= b.section_confidence <= 1.0
