"""Unit tests for TextChunker chunk deduplication based on (span + level)."""

import pytest
from src.chunking.text_chunker import TextChunker
from tests.fixtures.cv_fixtures import CV_FIXTURES


def test_no_duplicate_chunks_with_same_span_and_level():
    """Verify that chunk_resume never outputs multiple chunks with the exact same (chunk_level, char_start, char_end)."""
    raw_text = (
        "HỌ VÀ TÊN: NGUYỄN VĂN A\n"
        "KỸ NĂNG: Python, FastAPI, PostgreSQL, Docker\n"
        "KINH NGHIỆM: 3 năm lập trình backend tại Công ty ABC\n"
    )

    chunks = TextChunker.chunk_resume(raw_text)
    assert len(chunks) > 0

    span_level_keys = [(c["chunk_level"], c["char_start"], c["char_end"]) for c in chunks]
    unique_keys = set(span_level_keys)

    assert len(span_level_keys) == len(unique_keys), (
        f"Duplicate (level, span) detected! Total: {len(span_level_keys)}, Unique: {len(unique_keys)}"
    )


def test_identical_text_at_different_positions_are_both_preserved():
    """Verify that two identical text snippets appearing at different locations in the CV

    are BOTH preserved (not dropped by naive text-only deduplication).
    """
    repeated_phrase = "Kỹ năng chính: Python, FastAPI, Redis"

    raw_text = (
        "PHẦN 1: MỤC TIÊU\n"
        f"{repeated_phrase}\n"
        "Một số thông tin mô tả ở giữa tài liệu dài hơn...\n"
        "PHẦN 2: TỔNG KẾT\n"
        f"{repeated_phrase}\n"
    )

    chunks = TextChunker.chunk_lines(raw_text)

    # Find line chunks with repeated_phrase
    matching_chunks = [c for c in chunks if c["text"] == repeated_phrase]

    assert len(matching_chunks) == 2, (
        f"Expected exactly 2 chunks for repeated phrase at different positions, got {len(matching_chunks)}"
    )

    c1, c2 = matching_chunks[0], matching_chunks[1]
    assert c1["char_start"] != c2["char_start"]
    assert c1["char_end"] != c2["char_end"]
    assert c1["block_id"] != c2["block_id"]
    assert raw_text[c1["char_start"]:c1["char_end"]] == repeated_phrase
    assert raw_text[c2["char_start"]:c2["char_end"]] == repeated_phrase


def test_same_span_different_levels_both_preserved():
    """Verify that chunks sharing the EXACT same (char_start, char_end)

    but having different chunk_levels (e.g. 'line' vs 'window_30') are BOTH kept.
    """
    raw_text = "Lập trình viên Backend Python và FastAPI."

    chunks = TextChunker.chunk_resume(raw_text)

    line_chunks = [c for c in chunks if c["chunk_level"] == "line"]
    win_chunks = [c for c in chunks if c["chunk_level"] == "window_30"]

    assert len(line_chunks) == 1
    assert len(win_chunks) == 1

    lc = line_chunks[0]
    wc = win_chunks[0]

    # Both cover the entire short text span
    assert (lc["char_start"], lc["char_end"]) == (0, len(raw_text))
    assert (wc["char_start"], wc["char_end"]) == (0, len(raw_text))

    # Distinct levels and distinct block IDs
    assert lc["chunk_level"] == "line"
    assert wc["chunk_level"] == "window_30"
    assert lc["block_id"] != wc["block_id"]


def test_short_text_trailing_window_does_not_create_duplicate_spans():
    """Verify sliding window chunking on short text does not create redundant identical trailing spans."""
    # Text with 12 tokens
    raw_text = "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"

    win_chunks = TextChunker.chunk_windows(raw_text, window_size=30, stride=15)

    assert len(win_chunks) == 1  # 12 < 30 tokens, should produce exactly 1 window
    spans = [(c["char_start"], c["char_end"]) for c in win_chunks]
    assert len(spans) == len(set(spans))


def test_deduplication_integrity_across_all_12_cv_fixtures():
    """Verify no duplicate (level, span) exists across all 12 regression CV fixtures."""
    for cv_key, cv_data in CV_FIXTURES.items():
        raw_text = cv_data["raw_text"]
        chunks = TextChunker.chunk_resume(raw_text)
        assert len(chunks) > 0

        keys = [(c["chunk_level"], c["char_start"], c["char_end"]) for c in chunks]
        unique_keys = set(keys)

        assert len(keys) == len(unique_keys), (
            f"CV fixture '{cv_key}' contains duplicate chunk spans! Total: {len(keys)}, Unique: {len(unique_keys)}"
        )
