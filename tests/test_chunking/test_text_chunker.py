"""Unit tests for TextChunker offset tracking, line extraction, and multi-level word-window chunking."""

import re
import pytest
from src.chunking.text_chunker import TextChunker
from tests.fixtures.cv_fixtures import get_cv_fixture, CV_FIXTURES


def test_chunk_lines_exact_offset_guarantee():
    """Verify that for every line chunk, raw_text[char_start:char_end] == block['text']."""
    raw_text = (
        "HỌ VÀ TÊN: NGUYỄN VĂN A\n"
        "Email: nguyen.a@example.com\n"
        "KINH NGHIỆM LÀM VIỆC:\n"
        "Công ty ABC (2021 - 2023)\n"
        "- Lập trình Python, FastAPI, Docker."
    )

    line_chunks = TextChunker.chunk_lines(raw_text)
    assert len(line_chunks) == 5

    for chunk in line_chunks:
        start = chunk["char_start"]
        end = chunk["char_end"]
        text = chunk["text"]
        assert raw_text[start:end] == text, (
            f"Offset mismatch! Expected '{text}', got '{raw_text[start:end]}'"
        )
        assert chunk["chunk_level"] == "line"
        assert chunk["level"] == "line"
        assert chunk["block_id"].startswith("blk_")
        assert "_line_" in chunk["block_id"]



def test_chunk_lines_crlf_windows_newlines_support():
    """Verify exact offset slicing works on Windows CRLF (\\r\\n) text."""
    raw_text = (
        "DÒNG 1: Tiêu đề CV\r\n"
        "DÒNG 2: Thông tin liên hệ\r\n"
        "DÒNG 3: Kỹ năng chuyên môn Python\r\n"
    )

    line_chunks = TextChunker.chunk_lines(raw_text)
    assert len(line_chunks) == 3

    for chunk in line_chunks:
        start = chunk["char_start"]
        end = chunk["char_end"]
        text = chunk["text"]
        assert raw_text[start:end] == text
        assert "\r" not in text
        assert "\n" not in text


def test_chunk_lines_leading_whitespace_preservation():
    """Verify that leading whitespace (indentation) is preserved and offsets reflect the leading spaces."""
    raw_text = (
        "KỸ NĂNG:\n"
        "   - Python 3.11\n"
        "      * FastAPI & Asynchronous programming\n"
        "\t- PostgreSQL\n"
    )

    line_chunks = TextChunker.chunk_lines(raw_text)
    assert len(line_chunks) == 4

    assert line_chunks[1]["text"] == "   - Python 3.11"
    assert line_chunks[2]["text"] == "      * FastAPI & Asynchronous programming"
    assert line_chunks[3]["text"] == "\t- PostgreSQL"

    for chunk in line_chunks:
        assert raw_text[chunk["char_start"]:chunk["char_end"]] == chunk["text"]


def test_chunk_lines_stable_block_id():
    """Verify block_id is deterministic and stable across multiple calls."""
    raw_text = "Dòng thứ nhất\nDòng thứ hai\nDòng thứ ba"

    run1 = TextChunker.chunk_lines(raw_text)
    run2 = TextChunker.chunk_lines(raw_text)

    assert len(run1) == len(run2)
    for c1, c2 in zip(run1, run2):
        assert c1["block_id"] == c2["block_id"]
        assert c1["char_start"] == c2["char_start"]
        assert c1["char_end"] == c2["char_end"]


def test_chunk_windows_exact_offset_guarantee():
    """Verify that for every window chunk, raw_text[char_start:char_end] == chunk['text']."""
    raw_text = (
        "Kỹ sư Backend với 3 năm kinh nghiệm thực chiến phát triển API và microservices bằng Python và FastAPI.\n\n"
        "Xây dựng hơn 40 RESTful API cho ứng dụng thanh toán trực tuyến, phục vụ 100.000 người dùng mỗi ngày.\n"
        "Quản lý cơ sở dữ liệu PostgreSQL, viết complex queries và tối ưu hóa index."
    )

    # Test small window (30 words)
    win30_chunks = TextChunker.chunk_windows(raw_text, window_size=30, stride=15)
    assert len(win30_chunks) > 0

    for chunk in win30_chunks:
        start = chunk["char_start"]
        end = chunk["char_end"]
        text = chunk["text"]
        assert raw_text[start:end] == text, (
            f"Window offset mismatch! Expected '{text}', got '{raw_text[start:end]}'"
        )
        assert chunk["chunk_level"] == "window_30"
        assert chunk["level"] == "small_window"
        assert chunk["char_length"] == len(text)
        assert chunk["block_id"].startswith("blk_")
        assert "_window_30_" in chunk["block_id"]



def test_chunk_windows_preserves_internal_whitespace_and_newlines():
    """Verify that multiple spaces, tabs, and newlines inside a window are preserved as-is without flattening."""
    raw_text = (
        "Từ_khóa_1      Từ_khóa_2\n\n\n"
        "Từ_khóa_3\t\t\tTừ_khóa_4   \n   "
        "Từ_khóa_5   Từ_khóa_6"
    )

    chunks = TextChunker.chunk_windows(raw_text, window_size=4, stride=2)
    assert len(chunks) > 0

    # Chunk 0 covers Từ_khóa_1 through Từ_khóa_4
    c0 = chunks[0]
    assert raw_text[c0["char_start"]:c0["char_end"]] == c0["text"]
    assert "      " in c0["text"]  # 6 spaces
    assert "\n\n\n" in c0["text"]  # 3 newlines
    assert "\t\t\t" in c0["text"]  # 3 tabs


def test_chunk_windows_token_boundary_accuracy():
    """Verify char_start starts at the first non-whitespace char of token 0

    and char_end ends at the last char of the final token in the window.
    """
    raw_text = "   \n\n   BẮT_ĐẦU từ_1 từ_2 từ_3 KẾT_THÚC   \n\n   "

    # Single window spanning all 5 tokens
    chunks = TextChunker.chunk_windows(raw_text, window_size=5, stride=5)
    assert len(chunks) == 1

    c = chunks[0]
    assert c["text"] == "BẮT_ĐẦU từ_1 từ_2 từ_3 KẾT_THÚC"
    assert raw_text[c["char_start"]:c["char_end"]] == c["text"]
    # char_start must match index of 'B' in BẮT_ĐẦU
    assert raw_text[c["char_start"]] == "B"
    # char_end must match index immediately after 'C' in KẾT_THÚC
    assert raw_text[c["char_end"] - 1] == "C"


def test_chunk_windows_50_percent_overlap():
    """Verify 50% overlap step (stride = window_size // 2)."""
    words = [f"word_{i:02d}" for i in range(40)]
    raw_text = " ".join(words)

    # window_size = 10 -> stride = 5 (50% overlap)
    # range(0, 40, 5) -> 8 chunks: 0..9, 5..14, 10..19, 15..24, 20..29, 25..34, 30..39, 35..39
    chunks = TextChunker.chunk_windows(raw_text, window_size=10, stride=5)
    assert len(chunks) == 8

    # Window 0: word_00 to word_09
    assert chunks[0]["text"].startswith("word_00")
    assert chunks[0]["text"].endswith("word_09")

    # Window 1: word_05 to word_14 (overlaps with Window 0 on word_05..word_09)
    assert chunks[1]["text"].startswith("word_05")
    assert chunks[1]["text"].endswith("word_14")

    # Window 2: word_10 to word_19 (overlaps with Window 1 on word_10..word_14)
    assert chunks[2]["text"].startswith("word_10")
    assert chunks[2]["text"].endswith("word_19")

    for c in chunks:
        assert raw_text[c["char_start"]:c["char_end"]] == c["text"]


def test_chunk_windows_complex_unicode_and_punctuation():
    """Verify window chunking works on Vietnamese diacritics, em-dashes, and special symbols."""
    raw_text = (
        "HỌC VẤN: Trường Đại học Bách Khoa Hà Nội — Cử nhân Kỹ thuật Điều khiển & Tự động hóa (2016-2020).\n"
        "KỸ NĂNG: Python 3.11+, FastAPI (REST API/WebSocket), PostgreSQL, Redis Cache, Docker/K8s.\n"
        "THÀNH TÍCH: Đạt giải Nhất cuộc thi Nghiên cứu Khoa học sinh viên năm 2019 (GPA: 3.65/4.00)."
    )

    chunks = TextChunker.chunk_windows(raw_text, window_size=15, stride=7)
    assert len(chunks) > 0

    for c in chunks:
        assert raw_text[c["char_start"]:c["char_end"]] == c["text"]


def test_chunk_resume_all_chunks_have_valid_offsets_on_all_fixtures():
    """Verify that every chunk produced by chunk_resume across ALL 12 fixtures

    satisfies raw_text[char_start:char_end] == chunk['text'].
    """
    for cv_key, cv_data in CV_FIXTURES.items():
        raw_text = cv_data["raw_text"]
        chunks = TextChunker.chunk_resume(raw_text)
        assert len(chunks) > 0, f"CV {cv_key} produced zero chunks"

        for idx, chunk in enumerate(chunks):
            assert "char_start" in chunk, f"Chunk {idx} in {cv_key} missing char_start"
            assert "char_end" in chunk, f"Chunk {idx} in {cv_key} missing char_end"

            s = chunk["char_start"]
            e = chunk["char_end"]
            t = chunk["text"]
            assert raw_text[s:e] == t, (
                f"Slicing mismatch in CV '{cv_key}', chunk level '{chunk.get('chunk_level')}': "
                f"raw_text[{s}:{e}] != '{t}'"
            )
