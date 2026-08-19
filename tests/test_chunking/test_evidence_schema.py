"""Unit tests for EvidenceBlock, CVSection, and chunk schemas."""

import pytest
from pydantic import ValidationError

from src.models.evidence import (
    CVSection,
    ChunkLevel,
    EvidenceSource,
    EvidenceBlock,
)


def test_evidence_block_valid_initialization():
    """Verify standard valid creation of EvidenceBlock with enums and literals."""
    block = EvidenceBlock(
        block_id="blk_001",
        text="Lập trình viên Backend Python và FastAPI với 3 năm kinh nghiệm.",
        char_start=150,
        char_end=217,
        section=CVSection.EXPERIENCE,
        section_confidence=95.5,
        chunk_level=ChunkLevel.LINE,
        source=EvidenceSource.RESUME_RAW_TEXT,
        metadata={"line_num": 12, "detected_skills": ["Python", "FastAPI"]},
    )

    assert block.block_id == "blk_001"
    assert block.char_start == 150
    assert block.char_end == 217
    assert block.section == "experience"
    assert block.section_confidence == 95.5
    assert block.chunk_level == "line"
    assert block.source == "resume_raw_text"
    assert block.metadata["line_num"] == 12


def test_evidence_block_with_string_literals():
    """Verify EvidenceBlock accepts raw string literals matching enum values."""
    block = EvidenceBlock(
        block_id="blk_002",
        text="Kỹ năng: PostgreSQL, Redis, Docker",
        char_start=50,
        char_end=84,
        section="skills",
        chunk_level="window_30",
        source="resume_pdf",
    )

    assert block.section == "skills"
    assert block.chunk_level == "window_30"
    assert block.source == "resume_pdf"


def test_evidence_block_rejects_negative_char_start():
    """Verify char_start < 0 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        EvidenceBlock(
            block_id="blk_neg",
            text="Some text",
            char_start=-1,
            char_end=10,
            section="experience",
        )
    assert "greater than or equal to 0" in str(exc_info.value)


def test_evidence_block_rejects_char_end_less_than_or_equal_to_start():
    """Verify char_end <= char_start raises ValidationError."""
    # Case 1: char_end == char_start
    with pytest.raises(ValidationError) as exc_1:
        EvidenceBlock(
            block_id="blk_equal",
            text="Some text",
            char_start=50,
            char_end=50,
            section="skills",
        )
    assert "char_end (50) must be strictly greater than char_start (50)" in str(exc_1.value)

    # Case 2: char_end < char_start
    with pytest.raises(ValidationError) as exc_2:
        EvidenceBlock(
            block_id="blk_inverted",
            text="Some text",
            char_start=100,
            char_end=80,
            section="skills",
        )
    assert "char_end (80) must be strictly greater than char_start (100)" in str(exc_2.value)


def test_evidence_block_rejects_empty_or_whitespace_text():
    """Verify empty text or pure whitespace raises ValidationError."""
    with pytest.raises(ValidationError) as exc_1:
        EvidenceBlock(
            block_id="blk_empty",
            text="",
            char_start=0,
            char_end=10,
        )
    assert "String should have at least 1 character" in str(exc_1.value)

    with pytest.raises(ValidationError) as exc_2:
        EvidenceBlock(
            block_id="blk_ws",
            text="   \n\t  ",
            char_start=0,
            char_end=10,
        )
    assert "EvidenceBlock text must not be empty or purely whitespace" in str(exc_2.value)


def test_evidence_block_rejects_out_of_bound_confidence():
    """Verify section_confidence outside [0.0, 100.0] raises ValidationError."""
    with pytest.raises(ValidationError):
        EvidenceBlock(
            block_id="blk_conf_high",
            text="Valid text",
            char_start=0,
            char_end=10,
            section_confidence=105.0,
        )

    with pytest.raises(ValidationError):
        EvidenceBlock(
            block_id="blk_conf_low",
            text="Valid text",
            char_start=0,
            char_end=10,
            section_confidence=-5.0,
        )


def test_vietnamese_unicode_compatibility_and_slicing():
    """Verify EvidenceBlock handles complex Vietnamese diacritics and character offsets accurately."""
    raw_cv = (
        "HỌ VÀ TÊN: NGUYỄN VĂN ĐẠT\n"
        "KINH NGHIỆM LÀM VIỆC:\n"
        "Công ty Cổ phần Giải pháp Công nghệ Tiên Phong (01/2021 - 12/2023)\n"
        "Vị trí: Kỹ sư Lập trình Backend Python & FastAPI cấp cao.\n"
        "- Thiết kế kiến trúc vi dịch vụ (Microservices) chịu tải 10.000 req/s.\n"
        "TRÌNH ĐỘ HỌC VẤN:\n"
        "Trường Đại học Bách Khoa Hà Nội — Cử nhân Công nghệ Thông tin."
    )

    # Slice a specific Vietnamese line
    target_snippet = "Vị trí: Kỹ sư Lập trình Backend Python & FastAPI cấp cao."
    char_start = raw_cv.index(target_snippet)
    char_end = char_start + len(target_snippet)

    block = EvidenceBlock(
        block_id="blk_vn_01",
        text=target_snippet,
        char_start=char_start,
        char_end=char_end,
        section=CVSection.EXPERIENCE,
        chunk_level=ChunkLevel.LINE,
    )

    # Verify slicing integrity
    assert block.verify_against_raw_text(raw_cv) is True
    assert raw_cv[block.char_start:block.char_end] == target_snippet


def test_create_from_slice_factory_method():
    """Verify EvidenceBlock.create_from_slice builds valid block from raw text slice."""
    raw_cv = "MỤC TIÊU: Trở thành chuyên gia Trí tuệ Nhân tạo tại Việt Nam."
    start = 10
    end = 60
    expected_text = raw_cv[start:end]

    block = EvidenceBlock.create_from_slice(
        block_id="blk_slice_01",
        raw_text=raw_cv,
        char_start=start,
        char_end=end,
        section=CVSection.SUMMARY,
        chunk_level=ChunkLevel.SENTENCE,
    )

    assert block.text == expected_text
    assert block.char_start == start
    assert block.char_end == end
    assert block.section == "summary"
    assert block.verify_against_raw_text(raw_cv) is True


def test_create_from_slice_invalid_bounds_raises_value_error():
    """Verify invalid slice bounds raise ValueError in factory method."""
    raw_cv = "Short text"

    # Out of bounds
    with pytest.raises(ValueError, match="Invalid slice bounds"):
        EvidenceBlock.create_from_slice(raw_text=raw_cv, char_start=0, char_end=50, block_id="blk_err")

    # Inverted bounds
    with pytest.raises(ValueError, match="Invalid slice bounds"):
        EvidenceBlock.create_from_slice(raw_text=raw_cv, char_start=8, char_end=3, block_id="blk_err")



def test_evidence_block_serialization_json():
    """Verify EvidenceBlock serializes to and deserializes from JSON cleanly."""
    original = EvidenceBlock(
        block_id="blk_json",
        text="Chứng chỉ AWS Solutions Architect",
        char_start=10,
        char_end=44,
        section=CVSection.CERTIFICATIONS,
        chunk_level=ChunkLevel.LINE,
        source=EvidenceSource.RESUME_RAW_TEXT,
    )

    json_data = original.model_dump_json()
    reconstructed = EvidenceBlock.model_validate_json(json_data)

    assert reconstructed.block_id == original.block_id
    assert reconstructed.text == original.text
    assert reconstructed.section == original.section
    assert reconstructed.char_start == original.char_start
    assert reconstructed.char_end == original.char_end
