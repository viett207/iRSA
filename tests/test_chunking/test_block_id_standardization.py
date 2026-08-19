"""Unit tests for deterministic block_id generation, process safety, PII protection, and uniqueness."""

import pytest
from src.chunking.text_chunker import TextChunker
from src.models.evidence import generate_block_id
from tests.fixtures.cv_fixtures import CV_FIXTURES


def test_block_id_deterministic_and_stable():
    """Verify that given the same raw_text, version, level, and offsets, block_id is 100% deterministic."""
    raw_text = "Kỹ sư Lập trình Backend Python và FastAPI (3 năm kinh nghiệm)"
    start, end = 0, 42

    id_1 = TextChunker.generate_block_id(raw_text, "line", start, end, parser_version="v1")
    id_2 = TextChunker.generate_block_id(raw_text, "line", start, end, parser_version="v1")
    id_3 = generate_block_id(raw_text, "line", start, end, parser_version="v1")

    assert id_1 == id_2 == id_3
    assert id_1.startswith("blk_")


def test_block_id_does_not_contain_sensitive_pii():
    """Verify block_id never leaks sensitive candidate PII (name, email, phone, salary, address)."""
    raw_text = (
        "HỌ TÊN: Nguyễn Văn Bảo Mật\n"
        "EMAIL: baomat.nguyen@company.com\n"
        "SĐT: 0988776655\n"
        "LƯƠNG HIỆN TẠI: 50.000.000 VNĐ\n"
        "ĐỊA CHỈ: 123 Đường Bảo Mật, Quận 1, TP.HCM"
    )

    block_id = TextChunker.generate_block_id(raw_text, "line", 0, 27)

    # Assert no sensitive values appear inside the ID
    sensitive_fragments = [
        "Nguyễn Văn Bảo Mật",
        "baomat.nguyen",
        "company.com",
        "0988776655",
        "50.000.000",
        "Quận 1",
    ]
    for fragment in sensitive_fragments:
        assert fragment.lower() not in block_id.lower()


def test_two_chunks_different_levels_same_span_have_distinct_ids():
    """Verify that two chunks sharing the EXACT same (char_start, char_end)

    but belonging to different chunk_levels produce distinct, non-colliding block_ids.
    """
    raw_text = "Lập trình viên Python Backend cấp cao."
    start = 0
    end = len(raw_text)

    line_id = TextChunker.generate_block_id(raw_text, "line", start, end)
    win30_id = TextChunker.generate_block_id(raw_text, "window_30", start, end)
    win80_id = TextChunker.generate_block_id(raw_text, "window_80", start, end)
    para_id = TextChunker.generate_block_id(raw_text, "paragraph", start, end)

    # All IDs must be distinct
    all_ids = {line_id, win30_id, win80_id, para_id}
    assert len(all_ids) == 4
    assert "line" in line_id
    assert "window_30" in win30_id
    assert "window_80" in win80_id


def test_block_id_varies_with_parser_version():
    """Verify that changing parser_version produces a distinct block_id for cache invalidation."""
    raw_text = "Sample candidate resume text."
    start, end = 0, 20

    v1_id = TextChunker.generate_block_id(raw_text, "line", start, end, parser_version="v1")
    v2_id = TextChunker.generate_block_id(raw_text, "line", start, end, parser_version="v2")

    assert v1_id != v2_id


def test_all_chunks_in_resume_have_unique_block_ids():
    """Verify that chunk_resume produces strictly unique block_ids across all chunks for every fixture."""
    for cv_key, cv_data in CV_FIXTURES.items():
        raw_text = cv_data["raw_text"]
        chunks = TextChunker.chunk_resume(raw_text)
        assert len(chunks) > 0

        block_ids = [c["block_id"] for c in chunks]
        unique_ids = set(block_ids)

        assert len(block_ids) == len(unique_ids), (
            f"Collision detected in CV '{cv_key}'! {len(block_ids)} total vs {len(unique_ids)} unique"
        )
