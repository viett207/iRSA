"""Unit tests for span fidelity validator and diagnostic reporting."""

import pytest
from src.chunking.validator import (
    validate_evidence_block,
    validate_evidence_blocks,
    ValidationStatus,
    ValidationSeverity,
)
from src.models.evidence import CVSection, EvidenceBlock
from src.chunking.text_chunker import TextChunker
from tests.fixtures.cv_fixtures import CV_FIXTURES


def test_validate_perfect_block():
    """Verify perfectly matched block passes with status VALID and no errors or warnings."""
    raw_text = "HỌ VÀ TÊN: NGUYỄN VĂN A\nKỸ NĂNG: Python, FastAPI, Docker"
    start = raw_text.index("KỸ NĂNG: Python, FastAPI, Docker")
    end = start + len("KỸ NĂNG: Python, FastAPI, Docker")

    block = {
        "block_id": "blk_001",
        "text": "KỸ NĂNG: Python, FastAPI, Docker",
        "char_start": start,
        "char_end": end,
        "section": "skills",
        "confidence": 0.95,
    }

    result = validate_evidence_block(raw_text, block)

    assert result.is_valid is True
    assert result.status == ValidationStatus.VALID
    assert len(result.errors) == 0
    assert len(result.warnings) == 0
    assert result.exact_match is True
    assert result.normalized_confidence == 0.95


def test_validate_hard_error_offsets_out_of_bounds():
    """Verify char_end exceeding raw_text length results in HARD ERROR and status INVALID."""
    raw_text = "Short resume text."
    block = {
        "block_id": "blk_oob",
        "text": "Short resume text.",
        "char_start": 0,
        "char_end": 100,  # Exceeds len(raw_text) = 18
        "section": "summary",
    }

    result = validate_evidence_block(raw_text, block)

    assert result.is_valid is False
    assert result.status == ValidationStatus.INVALID
    assert any(e.code == "OFFSET_OUT_OF_BOUNDS" for e in result.errors)


def test_validate_hard_error_text_mismatch_hallucination():
    """Verify fabricated / mismatched text against raw_text slice produces TEXT_MISMATCH hard error."""
    raw_text = "Ứng viên làm lập trình viên PHP tại ABC."
    start = 0
    end = len(raw_text)

    # Hallucinated block text that does not match the actual slice
    block = {
        "block_id": "blk_hal",
        "text": "Ứng viên làm Giám đốc Python tại Google.",
        "char_start": start,
        "char_end": end,
        "section": "experience",
    }

    result = validate_evidence_block(raw_text, block)

    assert result.is_valid is False
    assert result.status == ValidationStatus.INVALID
    assert any(e.code == "TEXT_MISMATCH" for e in result.errors)


def test_validate_hard_error_missing_block_id_and_empty_text():
    """Verify missing block_id or empty text triggers HARD ERRORS."""
    raw_text = "Sample text."
    block = {
        "block_id": "",
        "text": "   ",
        "char_start": 0,
        "char_end": 5,
    }

    result = validate_evidence_block(raw_text, block)

    assert result.is_valid is False
    assert any(e.code == "MISSING_BLOCK_ID" for e in result.errors)
    assert any(e.code == "EMPTY_TEXT" for e in result.errors)


def test_validate_warning_confidence_100_scale_auto_normalized():
    """Verify confidence in 0-100 scale (e.g. 95.0) triggers a WARNING and is normalized to [0, 1]."""
    raw_text = "Python Developer with 3 years experience."
    block = {
        "block_id": "blk_scale",
        "text": "Python Developer",
        "char_start": 0,
        "char_end": 16,
        "section": "experience",
        "confidence": 95.0,  # 100-scale instead of [0, 1]
    }

    result = validate_evidence_block(raw_text, block)

    assert result.is_valid is True
    assert result.status == ValidationStatus.WARNING
    assert result.normalized_confidence == 0.95
    assert any(w.code == "CONFIDENCE_SCALE_CONVERTED" for w in result.warnings)


def test_validate_warning_unknown_or_unrecognized_section():
    """Verify unrecognized or unknown section generates WARNING without invalidating block."""
    raw_text = "Hành trình chinh phục thực tế của ứng viên."
    block = {
        "block_id": "blk_sec",
        "text": "Hành trình chinh phục",
        "char_start": 0,
        "char_end": 21,
        "section": "kho_vu_khi_tuy_chinh",  # Custom non-standard section
        "confidence": 0.8,
    }

    result = validate_evidence_block(raw_text, block)

    assert result.is_valid is True
    assert result.status == ValidationStatus.WARNING
    assert any(w.code == "UNRECOGNIZED_SECTION" for w in result.warnings)


def test_validate_warning_low_confidence():
    """Verify low confidence score (< 0.5) generates LOW_CONFIDENCE warning."""
    raw_text = "Dòng thông tin phụ."
    block = {
        "block_id": "blk_low",
        "text": "Dòng thông tin phụ.",
        "char_start": 0,
        "char_end": 19,
        "section": "other",
        "confidence": 0.3,
    }

    result = validate_evidence_block(raw_text, block)

    assert result.is_valid is True
    assert result.status == ValidationStatus.WARNING
    assert any(w.code == "LOW_CONFIDENCE" for w in result.warnings)


def test_validate_evidence_blocks_batch_filtering():
    """Verify batch validation filters out invalid blocks without crashing the pipeline."""
    raw_text = "DÒNG 1: Python Developer\nDÒNG 2: Java Engineer"

    blocks = [
        # Block 1: Valid
        {
            "block_id": "blk_1",
            "text": "DÒNG 1: Python Developer",
            "char_start": 0,
            "char_end": 24,
            "section": "experience",
            "confidence": 0.9,
        },
        # Block 2: Hard Error (out of bounds)
        {
            "block_id": "blk_2",
            "text": "Fake",
            "char_start": 50,
            "char_end": 100,
            "section": "experience",
        },
        # Block 3: Valid with warning (100-scale confidence)
        {
            "block_id": "blk_3",
            "text": "DÒNG 2: Java Engineer",
            "char_start": 25,
            "char_end": 46,
            "section": "experience",
            "confidence": 85.0,
        },
    ]

    valid_blocks, diagnostics = validate_evidence_blocks(raw_text, blocks)

    # Hard-invalid block 2 is filtered out; blocks 1 and 3 are retained
    assert len(valid_blocks) == 2
    assert len(diagnostics) == 3
    assert diagnostics[0].is_valid is True
    assert diagnostics[1].is_valid is False
    assert diagnostics[2].is_valid is True


def test_validate_all_chunks_across_regression_fixtures():
    """Verify all chunks extracted by TextChunker pass validation on all 12 regression CV fixtures."""
    for cv_key, cv_data in CV_FIXTURES.items():
        raw_text = cv_data["raw_text"]
        chunks = TextChunker.chunk_resume(raw_text)
        assert len(chunks) > 0

        valid_blocks, diagnostics = validate_evidence_blocks(raw_text, chunks)

        assert len(valid_blocks) == len(chunks), (
            f"Some chunks in CV '{cv_key}' failed validation!"
        )
        for d in diagnostics:
            assert d.is_valid is True
            assert d.exact_match is True
