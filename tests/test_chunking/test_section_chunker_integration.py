"""Integration tests for SectionDetector and TextChunker integration.

Verifies:
1. Section applies continuously from heading to next heading.
2. Headings are clearly marked with `is_heading=True` or excluded when requested.
3. Pre-heading content is classified as summary or unknown with appropriate confidence.
4. 100% span fidelity is preserved across all chunk levels and evidence blocks.
5. EvidenceBlock objects pass validation with zero errors.
6. Full integration coverage across 12 regression CV fixtures (English & Vietnamese).
"""

import pytest

from src.chunking.section_detector import SectionDetector
from src.chunking.text_chunker import TextChunker
from src.chunking.validator import validate_evidence_blocks
from src.models.evidence import CVSection, EvidenceBlock
from tests.fixtures.cv_fixtures import CV_FIXTURES


@pytest.fixture
def detector():
    return SectionDetector()


# Sample structured multi-section CV
SAMPLE_STRUCTURED_CV = (
    "NGUYỄN VĂN AN - FULLSTACK DEVELOPER\n"
    "Email: an.nguyen@example.com | SĐT: 0912345678\n"
    "Kỹ sư phần mềm hơn 4 năm kinh nghiệm phát triển Web và Cloud.\n\n"
    "KINH NGHIỆM LÀM VIỆC:\n"
    "Công ty Công nghệ ABC (2021 - 2024)\n"
    "- Xây dựng hệ thống Backend với Python, FastAPI và PostgreSQL.\n"
    "- Thiết kế luồng xử lý dữ liệu lớn với Kafka và Redis.\n\n"
    "KỸ NĂNG CHUYÊN MÔN:\n"
    "- Ngôn ngữ: Python, TypeScript, SQL\n"
    "- Frameworks: FastAPI, React, Next.js\n"
    "- Công cụ: Docker, Kubernetes, AWS\n\n"
    "TRÌNH ĐỘ HỌC VẤN:\n"
    "Đại học Bách Khoa Hà Nội (2016 - 2020)\n"
    "Chuyên ngành: Công nghệ Thông tin - GPA: 3.6/4.0\n"
)


# ==============================================================================
# 1. CONTINUOUS SECTION PROPAGATION (HEADING TO NEXT HEADING)
# ==============================================================================

def test_section_applies_from_heading_to_next_heading(detector):
    """Verify that section type applies continuously from each heading until the next heading starts."""
    chunks = TextChunker.chunk_lines(SAMPLE_STRUCTURED_CV, detector=detector)
    assert len(chunks) > 0

    # Group line chunks by their text
    chunk_map = {c["text"].strip(): c for c in chunks}

    # 1. Experience section items
    exp_heading = chunk_map["KINH NGHIỆM LÀM VIỆC:"]
    assert exp_heading["section"] == "experience"
    assert exp_heading["section_confidence"] >= 0.85
    assert exp_heading["is_heading"] is True

    exp_line_1 = chunk_map["Công ty Công nghệ ABC (2021 - 2024)"]
    assert exp_line_1["section"] == "experience"
    assert exp_line_1["is_heading"] is False
    assert exp_line_1["section_confidence"] >= 0.85

    exp_line_2 = chunk_map["- Xây dựng hệ thống Backend với Python, FastAPI và PostgreSQL."]
    assert exp_line_2["section"] == "experience"
    assert exp_line_2["is_heading"] is False

    # 2. Skills section items
    skills_heading = chunk_map["KỸ NĂNG CHUYÊN MÔN:"]
    assert skills_heading["section"] == "skills"
    assert skills_heading["section_confidence"] >= 0.85
    assert skills_heading["is_heading"] is True

    skills_line_1 = chunk_map["- Ngôn ngữ: Python, TypeScript, SQL"]
    assert skills_line_1["section"] == "skills"
    assert skills_line_1["is_heading"] is False

    skills_line_2 = chunk_map["- Frameworks: FastAPI, React, Next.js"]
    assert skills_line_2["section"] == "skills"
    assert skills_line_2["is_heading"] is False

    # 3. Education section items
    edu_heading = chunk_map["TRÌNH ĐỘ HỌC VẤN:"]
    assert edu_heading["section"] == "education"
    assert edu_heading["is_heading"] is True

    edu_line_1 = chunk_map["Đại học Bách Khoa Hà Nội (2016 - 2020)"]
    assert edu_line_1["section"] == "education"
    assert edu_line_1["is_heading"] is False


# ==============================================================================
# 2. HEADING MARKING & EXCLUSION DECISION
# ==============================================================================

def test_heading_marked_clearly_with_metadata(detector):
    """Verify that headings are explicitly marked with `is_heading=True` and raw_heading metadata."""
    chunks = TextChunker.chunk_lines(SAMPLE_STRUCTURED_CV, detector=detector)

    heading_chunks = [c for c in chunks if c["is_heading"] is True]
    non_heading_chunks = [c for c in chunks if c["is_heading"] is False]

    # Expect 3 heading lines in sample CV
    assert len(heading_chunks) == 3
    heading_texts = [c["text"].strip() for c in heading_chunks]
    assert "KINH NGHIỆM LÀM VIỆC:" in heading_texts
    assert "KỸ NĂNG CHUYÊN MÔN:" in heading_texts
    assert "TRÌNH ĐỘ HỌC VẤN:" in heading_texts

    for hc in heading_chunks:
        assert hc["metadata"]["is_heading"] is True
        assert hc["metadata"]["raw_heading"] is not None

    for nhc in non_heading_chunks:
        assert nhc["metadata"]["is_heading"] is False


def test_exclude_headings_option_removes_headings_from_content(detector):
    """Verify that setting exclude_headings=True cleanly filters out heading-only chunks."""
    all_chunks = TextChunker.chunk_lines(SAMPLE_STRUCTURED_CV, detector=detector, exclude_headings=False)
    filtered_chunks = TextChunker.chunk_lines(SAMPLE_STRUCTURED_CV, detector=detector, exclude_headings=True)

    # Number of filtered chunks should be total chunks minus 3 headings
    assert len(filtered_chunks) == len(all_chunks) - 3

    # Ensure no heading line exists in filtered chunks
    for c in filtered_chunks:
        assert c["is_heading"] is False
        assert c["text"].strip() not in {"KINH NGHIỆM LÀM VIỆC:", "KỸ NĂNG CHUYÊN MÔN:", "TRÌNH ĐỘ HỌC VẤN:"}
        # Span fidelity must still hold 100%
        assert SAMPLE_STRUCTURED_CV[c["char_start"]:c["char_end"]] == c["text"]


# ==============================================================================
# 3. PRE-HEADING CONTENT (SUMMARY OR UNKNOWN)
# ==============================================================================

def test_pre_heading_content_classified_as_summary(detector):
    """Verify content before the first heading is classified as summary with pre-heading confidence."""
    chunks = TextChunker.chunk_lines(SAMPLE_STRUCTURED_CV, detector=detector)

    pre_heading_line = [c for c in chunks if "Kỹ sư phần mềm hơn 4 năm kinh nghiệm" in c["text"]][0]
    assert pre_heading_line["section"] == "summary"
    assert pre_heading_line["is_heading"] is False
    assert 0.0 < pre_heading_line["section_confidence"] < 0.60


def test_cv_starting_immediately_with_heading_has_no_empty_pre_heading(detector):
    """Verify CV that starts directly on line 0 with a heading does not create false pre-heading chunk."""
    cv_text = (
        "PROFESSIONAL EXPERIENCE:\n"
        "Software Engineer at Acme Corp (2020 - 2024)\n"
        "- Built distributed microservices in Go and Python.\n"
    )

    chunks = TextChunker.chunk_lines(cv_text, detector=detector)
    assert len(chunks) == 3

    # All chunks must belong to experience
    for c in chunks:
        assert c["section"] == "experience"
        assert c["section_confidence"] >= 0.85


# ==============================================================================
# 4. 100% SPAN FIDELITY GUARANTEE ACROSS CHUNK LEVELS
# ==============================================================================

def test_span_fidelity_preserved_across_all_chunk_levels(detector):
    """Verify raw_text[char_start:char_end] == chunk['text'] holds across line, window_30, window_80."""
    chunks = TextChunker.chunk_resume(SAMPLE_STRUCTURED_CV, detector=detector)
    assert len(chunks) > 0

    for c in chunks:
        # Exact slicing check
        sliced_text = SAMPLE_STRUCTURED_CV[c["char_start"]:c["char_end"]]
        assert sliced_text == c["text"], (
            f"Fidelity mismatch in level '{c['chunk_level']}': expected '{c['text']}' got '{sliced_text}'"
        )
        assert c["section"] in {s.value for s in CVSection}
        assert 0.0 <= c["section_confidence"] <= 1.0


# ==============================================================================
# 5. EVIDENCE BLOCK CONVERSION & VALIDATION
# ==============================================================================

def test_chunk_to_evidence_blocks_passes_validator(detector):
    """Verify chunk_to_evidence_blocks creates valid EvidenceBlock instances passing all validation checks."""
    blocks = TextChunker.chunk_to_evidence_blocks(SAMPLE_STRUCTURED_CV, detector=detector)
    assert len(blocks) > 0

    # Ensure all are instances of EvidenceBlock
    for b in blocks:
        assert isinstance(b, EvidenceBlock)
        assert b.block_id.startswith("blk_")
        assert b.section in {s.value for s in CVSection}
        assert b.section_confidence >= 0.0

    # Run comprehensive validator
    valid_blocks, diagnostics = validate_evidence_blocks(SAMPLE_STRUCTURED_CV, blocks)
    assert len(valid_blocks) == len(blocks)
    assert all(d.is_valid for d in diagnostics)
    assert all(len(d.errors) == 0 for d in diagnostics)


# ==============================================================================
# 6. REGRESSION ACROSS ALL 12 CV FIXTURES
# ==============================================================================

def test_all_12_cv_fixtures_integration(detector):
    """Verify integration and span fidelity across all 12 diverse CV fixtures."""
    for cv_key, cv_data in CV_FIXTURES.items():
        raw_text = cv_data["raw_text"]
        blocks = TextChunker.chunk_to_evidence_blocks(raw_text, detector=detector)

        assert len(blocks) > 0, f"No blocks produced for CV '{cv_key}'"

        # Check that sections are grounded
        sections_found = {b.section for b in blocks}
        assert len(sections_found) >= 1, f"No sections identified in '{cv_key}'"

        # Validate span fidelity with zero errors
        valid_blocks, diagnostics = validate_evidence_blocks(raw_text, blocks)
        assert len(valid_blocks) == len(blocks), f"Some blocks invalid in CV '{cv_key}'"
        assert all(d.is_valid for d in diagnostics)
        assert all(len(d.errors) == 0 for d in diagnostics)

