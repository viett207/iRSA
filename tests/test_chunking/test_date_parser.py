"""Unit & boundary tests for deterministic DateRangeParser (Vietnamese & English CVs).

Verifies:
1. MM/YYYY – MM/YYYY (01/2022–06/2024, 01.2022 - 06.2024, 1/2022 to 6/2024).
2. YYYY-MM to YYYY-MM (2022-01 to 2024-06, 2022/01 - 2024/06).
3. MonthName YYYY – MonthName YYYY (Jan 2022 – Jun 2024, Tháng 01/2022 - Tháng 06/2024).
4. MM/YYYY – Hiện tại / Present (01/2022 – Hiện tại, 01/2022 - nay, 01/2022 - present).
5. YYYY đến nay / to present (2022 đến nay, 2022 to present, 2022 - nay).
6. Year-only ranges (2018 - 2022) & Single year (2022).
7. Evidence ID grounding and span offset tracking.
8. Boundary & edge cases (inverted ranges, non-date numbers, multiple ranges in paragraph).
"""

from datetime import UTC, datetime

import pytest

from src.chunking.date_parser import (
    DateRangeParser,
    extract_date_ranges,
    parse_date_range,
)

# Fixed reference date: 2026-08-01 for deterministic duration testing
REF_DATE = datetime(2026, 8, 1, tzinfo=UTC)


@pytest.fixture
def parser():
    return DateRangeParser(reference_date=REF_DATE)


# ==============================================================================
# 1. MM/YYYY – MM/YYYY (01/2022 - 06/2024)
# ==============================================================================

@pytest.mark.parametrize(
    "text",
    [
        "01/2022 - 06/2024",
        "01/2022–06/2024",
        "01/2022—06/2024",
        "01.2022 - 06.2024",
        "1/2022 to 6/2024",
        "Từ 01/2022 đến 06/2024",
        "(01/2022 - 06/2024): Kỹ sư backend",
    ],
)
def test_parse_mm_yyyy_to_mm_yyyy(parser, text):
    """Verify MM/YYYY to MM/YYYY parses into exact 30 months (2.5 years)."""
    res = parser.parse(text, evidence_id="blk_01")
    assert res is not None
    assert res.start.year == 2022
    assert res.start.month == 1
    assert res.start.iso_str == "2022-01"
    assert res.end.year == 2024
    assert res.end.month == 6
    assert res.end.iso_str == "2024-06"
    assert res.duration_months == 30
    assert res.duration_years == 2.5
    assert res.precision == "month"
    assert res.confidence == 1.0
    assert res.evidence_id == "blk_01"


# ==============================================================================
# 2. YYYY-MM to YYYY-MM (2022-01 to 2024-06)
# ==============================================================================

@pytest.mark.parametrize(
    "text",
    [
        "2022-01 to 2024-06",
        "2022/01 - 2024/06",
        "2022.01 – 2024.06",
        "2022-01 đến 2024-06",
    ],
)
def test_parse_yyyy_mm_to_yyyy_mm(parser, text):
    """Verify YYYY-MM to YYYY-MM parses with ISO strings and month precision."""
    res = parser.parse(text)
    assert res is not None
    assert res.start.year == 2022
    assert res.start.month == 1
    assert res.start.iso_str == "2022-01"
    assert res.end.year == 2024
    assert res.end.month == 6
    assert res.end.iso_str == "2024-06"
    assert res.duration_months == 30
    assert res.duration_years == 2.5
    assert res.precision == "month"


# ==============================================================================
# 3. MONTH NAME YYYY – MONTH NAME YYYY (EN & VI)
# ==============================================================================

@pytest.mark.parametrize(
    "text",
    [
        "Jan 2022 – Jun 2024",
        "January 2022 to June 2024",
        "Jan 2022 - June 2024",
        "Tháng 01/2022 - Tháng 06/2024",
        "Thg 1 2022 - Thg 6 2024",
        "Tháng 1 2022 đến Tháng 6 2024",
    ],
)
def test_parse_month_name_to_month_name(parser, text):
    """Verify textual month names in English and Vietnamese parse correctly."""
    res = parser.parse(text)
    assert res is not None
    assert res.start.year == 2022
    assert res.start.month == 1
    assert res.end.year == 2024
    assert res.end.month == 6
    assert res.duration_months == 30
    assert res.duration_years == 2.5
    assert res.confidence >= 0.95


# ==============================================================================
# 4. MM/YYYY – HIỆN TẠI / PRESENT
# ==============================================================================

@pytest.mark.parametrize(
    "text",
    [
        "01/2022 – Hiện tại",
        "01/2022 - nay",
        "01/2022 - present",
        "01/2022 - now",
        "01/2022 - Current",
        "01/2022 to Present",
        "Tháng 1/2022 - Đến nay",
    ],
)
def test_parse_mm_yyyy_to_present(parser, text):
    """Verify MM/YYYY to Present properly flags is_present=True and computes up to ref date."""
    res = parser.parse(text, evidence_id="blk_curr")
    assert res is not None
    assert res.start.year == 2022
    assert res.start.month == 1
    assert res.end.is_present is True
    assert res.end.iso_str == "present"
    # From 2022-01 to 2026-08 (REF_DATE) = (2026-2022)*12 + (8-1) + 1 = 48 + 8 = 56 months
    assert res.duration_months == 56
    assert res.duration_years == round(56 / 12.0, 2)
    assert res.evidence_id == "blk_curr"
    assert res.confidence >= 0.95


# ==============================================================================
# 5. YYYY ĐẾN NAY / TO PRESENT (YEAR LEVEL)
# ==============================================================================

@pytest.mark.parametrize(
    "text",
    [
        "2022 đến nay",
        "2022 - nay",
        "2022 to present",
        "2022 - Hiện tại",
        "2022 - Ongoing",
    ],
)
def test_parse_year_to_present(parser, text):
    """Verify YYYY to Present parses with year precision and is_present=True."""
    res = parser.parse(text)
    assert res is not None
    assert res.start.year == 2022
    assert res.start.precision == "year"
    assert res.end.is_present is True
    assert res.end.iso_str == "present"
    assert res.confidence >= 0.85


# ==============================================================================
# 6. YEAR-ONLY RANGES & SINGLE YEAR
# ==============================================================================

def test_parse_year_only_range(parser):
    """Verify YYYY - YYYY parses into exact years (e.g. 2018 - 2022 -> 4 years / 48 months)."""
    res = parser.parse("Đại học Bách Khoa Hà Nội (2018 - 2022)")
    assert res is not None
    assert res.start.year == 2018
    assert res.start.precision == "year"
    assert res.end.year == 2022
    assert res.end.precision == "year"
    assert res.duration_years == 4.0
    assert res.duration_months == 48
    assert res.precision == "year"
    assert res.confidence == 0.85


def test_parse_single_year(parser):
    """Verify standalone single year (e.g. 2023) parses as a point date."""
    res = parser.parse("Chứng chỉ AWS Solution Architect (2023)")
    assert res is not None
    assert res.start.year == 2023
    assert res.end.year == 2023
    assert res.precision == "year"
    assert res.metadata.get("single_year") is True


# ==============================================================================
# 7. MULTIPLE RANGES IN A SINGLE PARAGRAPH
# ==============================================================================

def test_extract_multiple_date_ranges_in_text(parser):
    """Verify extract_date_ranges extracts all non-overlapping date spans in text."""
    text = (
        "Công ty A (01/2020 - 12/2021): Backend Developer.\n"
        "Công ty B (01/2022 – Hiện tại): Senior Engineer."
    )
    ranges = parser.extract_all(text, evidence_id="blk_multi")
    assert len(ranges) == 2

    # First range: 01/2020 - 12/2021 (24 months)
    assert ranges[0].start.year == 2020
    assert ranges[0].end.year == 2021
    assert ranges[0].duration_months == 24

    # Second range: 01/2022 - present (56 months up to 2026-08)
    assert ranges[1].start.year == 2022
    assert ranges[1].end.is_present is True
    assert ranges[1].duration_months == 56


# ==============================================================================
# 8. BOUNDARY & EDGE CASE TESTS
# ==============================================================================

def test_inverted_date_range_detection(parser):
    """Verify inverted date range (start > end, e.g. 2024 - 2022) is detected and flagged."""
    res = parser.parse("06/2024 - 01/2022")
    assert res is not None
    assert res.start.year == 2024
    assert res.end.year == 2022
    assert res.duration_months is None
    assert res.metadata.get("inverted") is True
    assert res.confidence < 0.50


def test_text_without_dates_returns_none(parser):
    """Verify text with no date patterns returns None or empty list."""
    assert parser.parse("Kỹ năng: Python, FastAPI, Docker, Kubernetes") is None
    assert parser.extract_all("Lập trình viên nhiệt tình và có trách nhiệm cao.") == []


def test_non_date_numbers_not_misparsed(parser):
    """Verify salary and phone numbers are not falsely parsed as dates."""
    text = "Mức lương mong muốn: 30.000.000 VNĐ | Số điện thoại: 0912345678"
    assert parser.parse(text) is None


def test_convenience_global_functions():
    """Verify parse_date_range and extract_date_ranges module-level functions."""
    res = parse_date_range("03/2021 - 09/2023", evidence_id="blk_top")
    assert res is not None
    assert res.start.month == 3
    assert res.start.year == 2021
    assert res.end.month == 9
    assert res.end.year == 2023
    assert res.duration_months == 31
    assert res.evidence_id == "blk_top"

    multi = extract_date_ranges("2018 - 2020 và 2021 - 2023")
    assert len(multi) == 2

