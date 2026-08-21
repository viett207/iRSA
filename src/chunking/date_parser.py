"""Deterministic Date-Range Parser for Vietnamese & English CVs (Rule & Regex-based, No LLM).

Supports:
- MM/YYYY – MM/YYYY (e.g. "01/2022–06/2024", "01.2022 - 06.2024")
- YYYY-MM to YYYY-MM (e.g. "2022-01 to 2024-06", "2022/01 - 2024/06")
- MonthName YYYY – MonthName YYYY (e.g. "Jan 2022 – Jun 2024", "Tháng 01/2022 - Tháng 06/2024")
- MM/YYYY – Hiện tại / Present (e.g. "01/2022 – Hiện tại", "01/2022 - Nay", "01/2022 - Present")
- YYYY đến nay / to present (e.g. "2022 đến nay", "2022 to present", "2022 - nay")
- Year only ranges & single years (e.g. "2018 - 2022", "2022")

Outputs:
- start, end, duration_months, duration_years, precision ("month", "year", "day"),
  confidence, evidence_id grounding, and diagnostic metadata.
"""

import re
import unicodedata
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from src.chunking.section_detector import strip_accents


class DatePrecision(StrEnum):
    """Granularity of extracted date."""
    YEAR = "year"
    MONTH = "month"
    DAY = "day"
    MIXED = "mixed"


class ParsedDate(BaseModel):
    """Structured endpoint of a date range (start or end)."""
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    raw_text: str
    year: int
    month: int | None = None
    day: int | None = None
    is_present: bool = False
    precision: Literal["year", "month", "day", "mixed"] = "year"

    @property
    def iso_str(self) -> str:
        """Return standardized ISO date string representation."""
        if self.is_present:
            return "present"
        if self.month is not None and self.day is not None:
            return f"{self.year:04d}-{self.month:02d}-{self.day:02d}"
        if self.month is not None:
            return f"{self.year:04d}-{self.month:02d}"
        return f"{self.year:04d}"

    def to_comparable_tuple(self, reference_year: int = 2026, reference_month: int = 8) -> tuple[int, int, int]:
        """Return (year, month, day) tuple for ordering and arithmetic."""
        if self.is_present:
            return (reference_year, reference_month, 28)
        return (self.year, self.month or 1, self.day or 1)


class ParsedDateRange(BaseModel):
    """Structured representation of a parsed CV date range."""
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    raw_text: str
    start: ParsedDate
    end: ParsedDate
    duration_months: int | None = Field(default=None, ge=0)
    duration_years: float | None = Field(default=None, ge=0.0)
    precision: Literal["year", "month", "day", "mixed"] = "month"
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_id: str | None = None
    char_start: int | None = None
    char_end: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# MONTH & PRESENT ALIAS MAPPINGS
# ==============================================================================

MONTH_MAP: dict[str, int] = {
    # English full
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    # English short
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
    # Vietnamese with "thang"
    "thang 1": 1, "thang 2": 2, "thang 3": 3, "thang 4": 4, "thang 5": 5, "thang 6": 6,
    "thang 7": 7, "thang 8": 8, "thang 9": 9, "thang 10": 10, "thang 11": 11, "thang 12": 12,
    "thang 01": 1, "thang 02": 2, "thang 03": 3, "thang 04": 4, "thang 05": 5, "thang 06": 6,
    "thang 07": 7, "thang 08": 8, "thang 09": 9,
    # Vietnamese abbreviations "thg"
    "thg 1": 1, "thg 2": 2, "thg 3": 3, "thg 4": 4, "thg 5": 5, "thg 6": 6,
    "thg 7": 7, "thg 8": 8, "thg 9": 9, "thg 10": 10, "thg 11": 11, "thg 12": 12,
    "thg 01": 1, "thg 02": 2, "thg 03": 3, "thg 04": 4, "thg 05": 5, "thg 06": 6,
    "thg 07": 7, "thg 08": 8, "thg 09": 9,
    # Vietnamese short "t1".."t12"
    "t1": 1, "t2": 2, "t3": 3, "t4": 4, "t5": 5, "t6": 6, "t7": 7, "t8": 8, "t9": 9, "t10": 10, "t11": 11, "t12": 12,
    "t01": 1, "t02": 2, "t03": 3, "t04": 4, "t05": 5, "t06": 6, "t07": 7, "t08": 8, "t09": 9,
    # Word numbers
    "thang mot": 1, "thang hai": 2, "thang ba": 3, "thang tu": 4, "thang bon": 4,
    "thang nam": 5, "thang sau": 6, "thang bay": 7, "thang tam": 8, "thang chin": 9,
    "thang muoi": 10, "thang muoi mot": 11, "thang muoi hai": 12,
}

PRESENT_KEYWORDS = [
    "hien tai", "hien nay", "nay", "den nay", "toi nay", "tu do den nay",
    "present", "now", "current", "ongoing", "today", "currently",
]

# Separators: hyphen, en-dash, em-dash, tilde, to, den, toi, slash
SEP_REGEX = r"(?:\s*(?:[-–—~]|-->|->|\.{2,3}|to|đến|den|tới|toi)\s*)"


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def _clean_text(text: str) -> str:
    """Normalize unicode and spaces."""
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    # Replace non-standard dashes with standard en-dash
    return text.strip()


def _is_present_text(text: str) -> bool:
    """Check if token indicates present / ongoing employment."""
    normalized = strip_accents(text).lower().strip(" .:,;()[]")
    return any(normalized == p or normalized.startswith(p) for p in PRESENT_KEYWORDS)


def _parse_month_str(month_str: str) -> int | None:
    """Parse numeric or textual month string into integer 1-12."""
    clean = strip_accents(month_str).lower().strip(" .:,;()[]")
    if clean.isdigit():
        val = int(clean)
        return val if 1 <= val <= 12 else None
    return MONTH_MAP.get(clean)


def _compute_duration(
    start: ParsedDate,
    end: ParsedDate,
    reference_year: int = 2026,
    reference_month: int = 8,
) -> tuple[int | None, float | None]:
    """Compute duration in months and years between start and end date endpoints."""
    start_y, start_m, _ = start.to_comparable_tuple(reference_year, reference_month)
    end_y, end_m, _ = end.to_comparable_tuple(reference_year, reference_month)

    # Inverted check
    if (end_y < start_y) or (end_y == start_y and end_m < start_m):
        return None, None

    if start.precision == "year" and end.precision == "year" and not end.is_present:
        # Year only: e.g. 2020 - 2024 is 4 years (48 months)
        diff_years = end_y - start_y
        diff_months = diff_years * 12
        return diff_months, round(float(diff_years), 2)

    # Month level (inclusive): 01/2022 to 06/2024 -> (2024 - 2022)*12 + (6 - 1) + 1 = 30 months
    diff_months = (end_y - start_y) * 12 + (end_m - start_m) + 1
    diff_months = max(1, diff_months)
    diff_years = round(diff_months / 12.0, 2)
    return diff_months, diff_years


# ==============================================================================
# DATE RANGE PARSER
# ==============================================================================

class DateRangeParser:
    """Fast, deterministic date-range extractor for Vietnamese and English CVs."""

    def __init__(self, reference_date: datetime | None = None):
        ref = reference_date or datetime.now(UTC)
        self.reference_year = ref.year
        self.reference_month = ref.month

    def parse(self, text: str, evidence_id: str | None = None) -> ParsedDateRange | None:
        """Parse the primary date range from a text snippet."""
        ranges = self.extract_all(text, evidence_id=evidence_id)
        if not ranges:
            return None
        # Prefer full ranges with higher confidence and duration over single point dates
        sorted_ranges = sorted(
            ranges,
            key=lambda r: (
                r.confidence,
                1 if (r.end.is_present or (r.duration_months and r.duration_months > 1)) else 0,
                r.duration_months or 0,
            ),
            reverse=True,
        )
        return sorted_ranges[0]

    def extract_all(self, text: str, evidence_id: str | None = None) -> list[ParsedDateRange]:
        """Extract all candidate date ranges found in the given text snippet."""
        if not text or not text.strip():
            return []

        results: list[ParsedDateRange] = []
        cleaned = _clean_text(text)

        # ----------------------------------------------------------------------
        # PATTERN 1: MM/YYYY or MM.YYYY or MM-YYYY to MM/YYYY or MM.YYYY or Present
        # e.g., "01/2022 - 06/2024", "01.2022–06.2024", "01/2022 - Hiện tại", "1/2022 to Present"
        # ----------------------------------------------------------------------
        p1 = re.compile(
            r"(?:(?:tháng|thg|t)\s*)?(0?[1-9]|1[0-2])[\/\.-](19\d\d|20\d\d)"
            r"(?:" + SEP_REGEX + r"((?:(?:tháng|thg|t)\s*)?(?:0?[1-9]|1[0-2])[\/\.-](?:19\d\d|20\d\d)|[A-Za-zÀ-ỹ\s]+))?",
            re.IGNORECASE | re.UNICODE,
        )
        for m in p1.finditer(cleaned):
            start_m, start_y = int(m.group(1)), int(m.group(2))
            end_group = m.group(3)

            start_date = ParsedDate(
                raw_text=f"{start_m:02d}/{start_y}",
                year=start_y,
                month=start_m,
                precision="month",
            )

            if not end_group:
                # Single MM/YYYY point
                dur_m, dur_y = 1, 0.08
                results.append(
                    ParsedDateRange(
                        raw_text=m.group(0).strip(),
                        start=start_date,
                        end=start_date,
                        duration_months=dur_m,
                        duration_years=dur_y,
                        precision="month",
                        confidence=0.90,
                        evidence_id=evidence_id,
                        char_start=m.start(),
                        char_end=m.end(),
                    )
                )
                continue

            end_clean = end_group.strip()
            if _is_present_text(end_clean):
                end_date = ParsedDate(
                    raw_text=end_clean,
                    year=self.reference_year,
                    month=self.reference_month,
                    is_present=True,
                    precision="month",
                )
                dur_m, dur_y = _compute_duration(start_date, end_date, self.reference_year, self.reference_month)
                results.append(
                    ParsedDateRange(
                        raw_text=m.group(0).strip(),
                        start=start_date,
                        end=end_date,
                        duration_months=dur_m,
                        duration_years=dur_y,
                        precision="month",
                        confidence=0.98,
                        evidence_id=evidence_id,
                        char_start=m.start(),
                        char_end=m.end(),
                    )
                )
            else:
                sub_m = re.search(r"(0?[1-9]|1[0-2])[\/\.-](19\d\d|20\d\d)", end_clean, re.IGNORECASE)
                if sub_m:
                    end_m_val, end_y_val = int(sub_m.group(1)), int(sub_m.group(2))
                    end_date = ParsedDate(
                        raw_text=f"{end_m_val:02d}/{end_y_val}",
                        year=end_y_val,
                        month=end_m_val,
                        precision="month",
                    )
                    dur_m, dur_y = _compute_duration(start_date, end_date, self.reference_year, self.reference_month)
                    conf = 1.0 if dur_m is not None else 0.40
                    results.append(
                        ParsedDateRange(
                            raw_text=m.group(0).strip(),
                            start=start_date,
                            end=end_date,
                            duration_months=dur_m,
                            duration_years=dur_y,
                            precision="month",
                            confidence=conf,
                            evidence_id=evidence_id,
                            char_start=m.start(),
                            char_end=m.end(),
                            metadata={"inverted": dur_m is None},
                        )
                    )

        # ----------------------------------------------------------------------
        # PATTERN 2: YYYY-MM or YYYY/MM to YYYY-MM or Present
        # e.g., "2022-01 to 2024-06", "2022/01 - 2024/06", "2022-01 - Nay"
        # ----------------------------------------------------------------------
        p2 = re.compile(
            r"\b(19\d\d|20\d\d)[-\/.](0?[1-9]|1[0-2])"
            r"(?:" + SEP_REGEX + r"((?:19\d\d|20\d\d)[-\/.](?:0?[1-9]|1[0-2])|[A-Za-zÀ-ỹ\s]+))?",
            re.IGNORECASE | re.UNICODE,
        )
        for m in p2.finditer(cleaned):
            start_y, start_m = int(m.group(1)), int(m.group(2))
            end_group = m.group(3)

            start_date = ParsedDate(
                raw_text=f"{start_y}-{start_m:02d}",
                year=start_y,
                month=start_m,
                precision="month",
            )

            if not end_group:
                continue

            end_clean = end_group.strip()
            if _is_present_text(end_clean):
                end_date = ParsedDate(
                    raw_text=end_clean,
                    year=self.reference_year,
                    month=self.reference_month,
                    is_present=True,
                    precision="month",
                )
                dur_m, dur_y = _compute_duration(start_date, end_date, self.reference_year, self.reference_month)
                results.append(
                    ParsedDateRange(
                        raw_text=m.group(0).strip(),
                        start=start_date,
                        end=end_date,
                        duration_months=dur_m,
                        duration_years=dur_y,
                        precision="month",
                        confidence=0.98,
                        evidence_id=evidence_id,
                        char_start=m.start(),
                        char_end=m.end(),
                    )
                )
            else:
                sub_m = re.match(r"(19\d\d|20\d\d)[-\/.](0?[1-9]|1[0-2])", end_clean)
                if sub_m:
                    end_y_val, end_m_val = int(sub_m.group(1)), int(sub_m.group(2))
                    end_date = ParsedDate(
                        raw_text=f"{end_y_val}-{end_m_val:02d}",
                        year=end_y_val,
                        month=end_m_val,
                        precision="month",
                    )
                    dur_m, dur_y = _compute_duration(start_date, end_date, self.reference_year, self.reference_month)
                    conf = 1.0 if dur_m is not None else 0.40
                    results.append(
                        ParsedDateRange(
                            raw_text=m.group(0).strip(),
                            start=start_date,
                            end=end_date,
                            duration_months=dur_m,
                            duration_years=dur_y,
                            precision="month",
                            confidence=conf,
                            evidence_id=evidence_id,
                            char_start=m.start(),
                            char_end=m.end(),
                            metadata={"inverted": dur_m is None},
                        )
                    )

        # ----------------------------------------------------------------------
        # PATTERN 3: MonthName YYYY to MonthName YYYY / Present
        # e.g., "Jan 2022 – Jun 2024", "January 2022 to June 2024",
        # "Tháng 01/2022 - Tháng 06/2024", "Tháng 1 2022 - Hiện tại"
        # ----------------------------------------------------------------------
        month_names_pattern = r"(?:(?:tháng|thg|t)\s*\d{1,2}|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
        p3 = re.compile(
            rf"\b({month_names_pattern})[\s\/\.-]+(19\d\d|20\d\d)"
            rf"(?:" + SEP_REGEX + rf"({month_names_pattern}[\s\/\.-]+(?:19\d\d|20\d\d)|[A-Za-zÀ-ỹ\s]+))?",
            re.IGNORECASE | re.UNICODE,
        )
        for m in p3.finditer(cleaned):
            start_m_str, start_y_str = m.group(1), m.group(2)
            month_val = _parse_month_str(start_m_str)
            if not month_val:
                continue
            start_y = int(start_y_str)

            start_date = ParsedDate(
                raw_text=f"{start_m_str} {start_y}",
                year=start_y,
                month=month_val,
                precision="month",
            )

            end_group = m.group(3)
            if not end_group:
                continue

            end_clean = end_group.strip()
            if _is_present_text(end_clean):
                end_date = ParsedDate(
                    raw_text=end_clean,
                    year=self.reference_year,
                    month=self.reference_month,
                    is_present=True,
                    precision="month",
                )
                dur_m, dur_y = _compute_duration(start_date, end_date, self.reference_year, self.reference_month)
                results.append(
                    ParsedDateRange(
                        raw_text=m.group(0).strip(),
                        start=start_date,
                        end=end_date,
                        duration_months=dur_m,
                        duration_years=dur_y,
                        precision="month",
                        confidence=0.98,
                        evidence_id=evidence_id,
                        char_start=m.start(),
                        char_end=m.end(),
                    )
                )
            else:
                sub_m = re.search(rf"({month_names_pattern})[\s\/\.-]+(19\d\d|20\d\d)", end_clean, re.IGNORECASE)
                if sub_m:
                    end_m_val = _parse_month_str(sub_m.group(1))
                    end_y_val = int(sub_m.group(2))
                    if end_m_val:
                        end_date = ParsedDate(
                            raw_text=f"{sub_m.group(1)} {end_y_val}",
                            year=end_y_val,
                            month=end_m_val,
                            precision="month",
                        )
                        dur_m, dur_y = _compute_duration(start_date, end_date, self.reference_year, self.reference_month)
                        conf = 0.98 if dur_m is not None else 0.40
                        results.append(
                            ParsedDateRange(
                                raw_text=m.group(0).strip(),
                                start=start_date,
                                end=end_date,
                                duration_months=dur_m,
                                duration_years=dur_y,
                                precision="month",
                                confidence=conf,
                                evidence_id=evidence_id,
                                char_start=m.start(),
                                char_end=m.end(),
                                metadata={"inverted": dur_m is None},
                            )
                        )

        # ----------------------------------------------------------------------
        # PATTERN 4: YYYY to YYYY or Present (Year Only)
        # e.g., "2018 - 2022", "2022 đến nay", "2022 to present", "2020 – 2023"
        # ----------------------------------------------------------------------
        p4 = re.compile(
            r"\b(19\d\d|20\d\d)" + SEP_REGEX + r"(19\d\d|20\d\d|[A-Za-zÀ-ỹ\s]+)\b",
            re.IGNORECASE | re.UNICODE,
        )
        for m in p4.finditer(cleaned):
            # Exclude if already matched in higher precision patterns
            m_start, m_end = m.start(), m.end()
            if any(r.char_start is not None and r.char_start <= m_start and m_end <= r.char_end for r in results):
                continue

            start_y = int(m.group(1))
            end_group = m.group(2).strip()

            start_date = ParsedDate(
                raw_text=str(start_y),
                year=start_y,
                precision="year",
            )

            if _is_present_text(end_group):
                end_date = ParsedDate(
                    raw_text=end_group,
                    year=self.reference_year,
                    month=self.reference_month,
                    is_present=True,
                    precision="year",
                )
                dur_m, dur_y = _compute_duration(start_date, end_date, self.reference_year, self.reference_month)
                results.append(
                    ParsedDateRange(
                        raw_text=m.group(0).strip(),
                        start=start_date,
                        end=end_date,
                        duration_months=dur_m,
                        duration_years=dur_y,
                        precision="year",
                        confidence=0.88,
                        evidence_id=evidence_id,
                        char_start=m_start,
                        char_end=m_end,
                    )
                )
            elif end_group.isdigit() and len(end_group) == 4:
                end_y = int(end_group)
                end_date = ParsedDate(
                    raw_text=str(end_y),
                    year=end_y,
                    precision="year",
                )
                dur_m, dur_y = _compute_duration(start_date, end_date, self.reference_year, self.reference_month)
                conf = 0.85 if dur_m is not None else 0.35
                results.append(
                    ParsedDateRange(
                        raw_text=m.group(0).strip(),
                        start=start_date,
                        end=end_date,
                        duration_months=dur_m,
                        duration_years=dur_y,
                        precision="year",
                        confidence=conf,
                        evidence_id=evidence_id,
                        char_start=m_start,
                        char_end=m_end,
                        metadata={"inverted": dur_m is None},
                    )
                )

        # ----------------------------------------------------------------------
        # PATTERN 5: Standalone Single Year
        # e.g., "(2022)", "Năm 2023", "tốt nghiệp 2020"
        # ----------------------------------------------------------------------
        if not results:
            p5 = re.compile(r"\b(19[7-9]\d|20[0-4]\d)\b")
            for m in p5.finditer(cleaned):
                single_y = int(m.group(1))
                single_date = ParsedDate(
                    raw_text=str(single_y),
                    year=single_y,
                    precision="year",
                )
                results.append(
                    ParsedDateRange(
                        raw_text=str(single_y),
                        start=single_date,
                        end=single_date,
                        duration_months=12,
                        duration_years=1.0,
                        precision="year",
                        confidence=0.75,
                        evidence_id=evidence_id,
                        char_start=m.start(),
                        char_end=m.end(),
                        metadata={"single_year": True},
                    )
                )

        # Deduplicate and sort by position
        unique_results: list[ParsedDateRange] = []
        seen_spans = set()
        for r in results:
            span = (r.char_start, r.char_end)
            if span not in seen_spans:
                seen_spans.add(span)
                unique_results.append(r)

        return unique_results


# Global default instance
_default_parser = DateRangeParser()


def parse_date_range(
    text: str,
    evidence_id: str | None = None,
    reference_date: datetime | None = None,
) -> ParsedDateRange | None:
    """Parse primary date range from text snippet without LLM."""
    parser = DateRangeParser(reference_date=reference_date) if reference_date else _default_parser
    return parser.parse(text, evidence_id=evidence_id)


def extract_date_ranges(
    text: str,
    evidence_id: str | None = None,
    reference_date: datetime | None = None,
) -> list[ParsedDateRange]:
    """Extract all date ranges from text snippet without LLM."""
    parser = DateRangeParser(reference_date=reference_date) if reference_date else _default_parser
    return parser.extract_all(text, evidence_id=evidence_id)

