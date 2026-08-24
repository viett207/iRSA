"""Unit tests for Grounded Skill Duration Calculation with Interval Merging & Claim Separation.

Verifies:
1. Interval merging: overlapping and parallel job dates are unified without double-counting.
2. Verified duration is calculated strictly from credible Experience and Project entries.
3. Self-declared durations in Summary and Skills sections are kept strictly separate.
4. Detection of duration discrepancies (e.g. claimed 5 years vs verified 2 years).
5. Undated projects do not fabricate unverified duration.
6. Strict preservation of evidence_block_ids on all calculation results.
7. Fixture-based regression coverage across CV-01, CV-02, CV-04, CV-08, CV-09.
8. CVFingerprint integration methods and JSON roundtrip serialization.
"""

import json
import pytest

from src.chunking.experience_extractor import ExperienceExtractor
from src.chunking.skill_attachment import SkillBinder
from src.chunking.skill_duration import (
    SkillDurationCalculator,
    calculate_all_skill_durations,
    calculate_skill_duration,
    merge_month_intervals,
    month_index_to_str,
    parse_date_string_to_month_index,
)
from src.models.cv_fingerprint import (
    CVFingerprint,
    ExperienceEntry,
    ProjectEntry,
    SkillAttachment,
    SkillDurationResult,
    SkillMention,
)
from src.models.evidence import ChunkLevel, CVSection, EvidenceBlock
from tests.fixtures.cv_fixtures import CV_FIXTURES


@pytest.fixture
def calculator():
    return SkillDurationCalculator(reference_year=2026, reference_month=8)


# ==============================================================================
# 1. INTERVAL MERGING & PARSING UNIT TESTS
# ==============================================================================

def test_parse_date_string_to_month_index():
    """Verify month index and precision parsing across different date formats."""
    # YYYY-MM
    idx, prec = parse_date_string_to_month_index("2022-06")
    assert idx == 2022 * 12 + 6 and prec == "month"
    # MM/YYYY
    idx, prec = parse_date_string_to_month_index("01/2020")
    assert idx == 2020 * 12 + 1 and prec == "month"
    # YYYY alone
    idx, prec = parse_date_string_to_month_index("2023", default_month=1)
    assert idx == 2023 * 12 + 1 and prec == "year"
    idx, prec = parse_date_string_to_month_index("2023", default_month=12)
    assert idx == 2023 * 12 + 12 and prec == "year"
    # Present / Current keywords
    idx, prec = parse_date_string_to_month_index("Present", ref_year=2026, ref_month=8)
    assert idx == 2026 * 12 + 8 and prec == "month"
    idx, prec = parse_date_string_to_month_index("Hiện tại", ref_year=2026, ref_month=8)
    assert idx == 2026 * 12 + 8 and prec == "month"
    # Invalid / empty
    idx, prec = parse_date_string_to_month_index("")
    assert idx is None and prec == "unknown"
    idx, prec = parse_date_string_to_month_index(None)
    assert idx is None and prec == "unknown"



def test_merge_month_intervals_overlapping():
    """Verify overlapping parallel intervals are merged without double-counting.

    Interval 1: 01/2022 -> 12/2023 (24 months)
    Interval 2: 06/2022 -> 06/2023 (13 months, overlapping entirely with Interval 1)
    Merged: 01/2022 -> 12/2023 (24 months, NOT 37 months).
    """
    i1 = (2022 * 12 + 1, 2023 * 12 + 12)  # Jan 2022 - Dec 2023
    i2 = (2022 * 12 + 6, 2023 * 12 + 6)   # Jun 2022 - Jun 2023

    merged = merge_month_intervals([i1, i2])
    assert len(merged) == 1
    assert merged[0] == (2022 * 12 + 1, 2023 * 12 + 12)

    total_months = sum(e - s + 1 for s, e in merged)
    assert total_months == 24


def test_merge_month_intervals_disjoint_and_adjacent():
    """Verify contiguous and disjoint intervals."""
    # Adjacent: 2020-01 to 2021-12 and 2022-01 to 2023-12
    i1 = (2020 * 12 + 1, 2021 * 12 + 12)
    i2 = (2022 * 12 + 1, 2023 * 12 + 12)
    merged_adj = merge_month_intervals([i1, i2])
    assert len(merged_adj) == 1
    assert sum(e - s + 1 for s, e in merged_adj) == 48

    # Disjoint with gap: 2019-01 to 2019-12 (12m) and 2022-01 to 2022-12 (12m)
    i3 = (2019 * 12 + 1, 2019 * 12 + 12)
    i4 = (2022 * 12 + 1, 2022 * 12 + 12)
    merged_gap = merge_month_intervals([i3, i4])
    assert len(merged_gap) == 2
    assert sum(e - s + 1 for s, e in merged_gap) == 24


# ==============================================================================
# 2. SKILL DURATION FROM EXPERIENCE & PROJECTS
# ==============================================================================

def test_skill_duration_single_experience(calculator):
    """Verify single job experience duration calculation."""
    blocks = [
        EvidenceBlock(
            block_id="blk_01",
            text="Công ty ABC (01/2022 - 12/2023): Backend FastAPI",
            char_start=0,
            char_end=48,
            section=CVSection.EXPERIENCE,
        )
    ]
    exp = ExperienceEntry(
        entry_id="exp_01",
        company="Công ty ABC",
        start_date="2022-01",
        end_date="2023-12",
        technologies=["FastAPI", "Python"],
        evidence_block_ids=["blk_01"],
    )

    res = calculator.calculate_skill_duration(
        skill_name="FastAPI",
        experience_entries=[exp],
        evidence_blocks=blocks,
    )

    assert res.skill_name == "FastAPI"
    assert res.verified_duration_months == 24
    assert res.verified_duration_years == 2.0
    assert res.declared_duration_months is None
    assert res.has_discrepancy is False
    assert res.contributing_entry_ids == ["exp_01"]
    assert res.merged_intervals == [("2022-01", "2023-12")]
    assert "blk_01" in res.evidence_block_ids


def test_parallel_jobs_not_double_counted(calculator):
    """Verify two parallel jobs with Python do not double count overlapping months."""
    blocks = [
        EvidenceBlock(
            block_id="blk_alpha",
            text="Công ty Alpha (01/2022 - 12/2023) - Python Developer",
            char_start=0,
            char_end=53,
            section=CVSection.EXPERIENCE,
        ),
        EvidenceBlock(
            block_id="blk_beta",
            text="Công ty Beta (06/2022 - 06/2023) - Python Automation",
            char_start=55,
            char_end=108,
            section=CVSection.EXPERIENCE,
        ),
    ]

    exp_alpha = ExperienceEntry(
        entry_id="exp_alpha",
        company="Alpha",
        start_date="2022-01",
        end_date="2023-12",
        technologies=["Python", "FastAPI"],
        evidence_block_ids=["blk_alpha"],
    )
    exp_beta = ExperienceEntry(
        entry_id="exp_beta",
        company="Beta",
        start_date="2022-06",
        end_date="2023-06",
        technologies=["Python", "Selenium"],
        evidence_block_ids=["blk_beta"],
    )

    # 1. Python is in both Alpha (24m) and Beta (13m) -> Total merged must be 24m (2.0y)
    res_python = calculator.calculate_skill_duration(
        skill_name="Python",
        experience_entries=[exp_alpha, exp_beta],
        evidence_blocks=blocks,
    )
    assert res_python.verified_duration_months == 24
    assert res_python.verified_duration_years == 2.0
    assert len(res_python.contributing_entry_ids) == 2
    assert res_python.merged_intervals == [("2022-01", "2023-12")]

    # 2. Selenium is ONLY in Beta (13m) -> Total verified is 13m (1.1y)
    res_selenium = calculator.calculate_skill_duration(
        skill_name="Selenium",
        experience_entries=[exp_alpha, exp_beta],
        evidence_blocks=blocks,
    )
    assert res_selenium.verified_duration_months == 13
    assert res_selenium.verified_duration_years == 1.1
    assert res_selenium.contributing_entry_ids == ["exp_beta"]


# ==============================================================================
# 3. SEPARATION OF DECLARED VS VERIFIED DURATION
# ==============================================================================

def test_summary_exaggeration_separated_from_verified(calculator):
    """Verify declared duration from Summary (5 years) is separated from verified history (2 years)."""
    blocks = [
        EvidenceBlock(
            block_id="blk_sum",
            text="TÓM TẮT: Kỹ sư backend với 5 năm kinh nghiệm Python.",
            char_start=0,
            char_end=52,
            section=CVSection.SUMMARY,
        ),
        EvidenceBlock(
            block_id="blk_job",
            text="Công ty X (01/2022 - 01/2024): Python Developer",
            char_start=55,
            char_end=102,
            section=CVSection.EXPERIENCE,
        ),
    ]

    exp = ExperienceEntry(
        entry_id="exp_01",
        company="Công ty X",
        start_date="2022-01",
        end_date="2024-01",
        technologies=["Python"],
        evidence_block_ids=["blk_job"],
    )

    res = calculator.calculate_skill_duration(
        skill_name="Python",
        experience_entries=[exp],
        evidence_blocks=blocks,
    )

    # Verified duration must strictly come from job (25 months = ~2.1 years)
    assert res.verified_duration_months == 25
    assert res.verified_duration_years == 2.1

    # Declared duration must be 5.0 years (60 months)
    assert res.declared_duration_years == 5.0
    assert res.declared_duration_months == 60

    # Discrepancy flagged
    assert res.has_discrepancy is True
    assert res.discrepancy_months == 35


def test_skills_section_does_not_count_as_verified_duration(calculator):
    """Verify skills listed only in Skills section yield 0 verified months."""
    blocks = [
        EvidenceBlock(
            block_id="blk_sk",
            text="KỸ NĂNG: Python (4 năm), Docker, Kubernetes",
            char_start=0,
            char_end=43,
            section=CVSection.SKILLS,
        ),
        EvidenceBlock(
            block_id="blk_exp",
            text="Công ty PHP ABC (01/2022 - 12/2023): PHP Laravel Developer",
            char_start=45,
            char_end=103,
            section=CVSection.EXPERIENCE,
        ),
    ]

    exp_php = ExperienceEntry(
        entry_id="exp_php",
        company="PHP ABC",
        start_date="2022-01",
        end_date="2023-12",
        technologies=["PHP", "Laravel"],
        evidence_block_ids=["blk_exp"],
    )

    mentions = [
        SkillMention(
            skill_name="Python",
            years_experience=4.0,
            evidence_block_ids=["blk_sk"],
        ),
        SkillMention(
            skill_name="PHP",
            evidence_block_ids=["blk_exp"],
        ),
    ]

    # Python
    res_python = calculator.calculate_skill_duration(
        skill_name="Python",
        experience_entries=[exp_php],
        skill_mentions=mentions,
        evidence_blocks=blocks,
    )
    assert res_python.verified_duration_months == 0
    assert res_python.verified_duration_years == 0.0
    assert res_python.declared_duration_years == 4.0
    assert res_python.is_verified is False

    # PHP
    res_php = calculator.calculate_skill_duration(
        skill_name="PHP",
        experience_entries=[exp_php],
        skill_mentions=mentions,
        evidence_blocks=blocks,
    )
    assert res_php.verified_duration_months == 24
    assert res_php.verified_duration_years == 2.0
    assert res_php.is_verified is True


# ==============================================================================
# 4. UNDATED PROJECTS & SPECIAL CASES
# ==============================================================================

def test_undated_project_does_not_add_unverified_duration(calculator):
    """Verify project without dates does not fabricate duration."""
    blocks = [
        EvidenceBlock(
            block_id="blk_proj",
            text="Dự án cá nhân E-Commerce (Không có ngày tháng) - Python, FastAPI",
            char_start=0,
            char_end=65,
            section=CVSection.PROJECTS,
        )
    ]
    proj = ProjectEntry(
        project_id="proj_01",
        project_name="E-Commerce",
        start_date=None,
        end_date=None,
        technologies=["Python", "FastAPI"],
        evidence_block_ids=["blk_proj"],
    )

    res = calculator.calculate_skill_duration(
        skill_name="Python",
        project_entries=[proj],
        evidence_blocks=blocks,
    )

    assert res.verified_duration_months == 0
    assert res.verified_duration_years == 0.0
    assert len(res.contributing_entry_ids) == 0


def test_dated_project_contributes_to_verified_duration(calculator):
    """Verify project with credible dates contributes to verified duration."""
    blocks = [
        EvidenceBlock(
            block_id="blk_proj_dated",
            text="Dự án Microservices (01/2023 - 06/2023) - Golang, Kafka",
            char_start=0,
            char_end=56,
            section=CVSection.PROJECTS,
        )
    ]
    proj = ProjectEntry(
        project_id="proj_dated",
        project_name="Microservices",
        start_date="2023-01",
        end_date="2023-06",
        technologies=["Golang", "Kafka"],
        evidence_block_ids=["blk_proj_dated"],
    )

    res = calculator.calculate_skill_duration(
        skill_name="Golang",
        project_entries=[proj],
        evidence_blocks=blocks,
    )

    assert res.verified_duration_months == 6
    assert res.verified_duration_years == 0.5
    assert res.contributing_entry_ids == ["proj_dated"]


# ==============================================================================
# 5. REAL CV FIXTURE REGRESSIONS
# ==============================================================================

def test_fixture_cv08_overlapping_jobs_duration():
    """Verify CV-08 overlapping jobs produces exactly 2.0 years verified Python, not 3.0 years."""
    fixture = CV_FIXTURES["overlapping_jobs_cv"]
    raw_text = fixture["raw_text"]

    extractor = ExperienceExtractor()
    exp_entries = extractor.extract_entries(raw_text, doc_id="cv08")
    assert len(exp_entries) == 2

    binder = SkillBinder()
    mentions = binder.extract_skill_mentions(raw_text)
    binder.bind_all(mentions, experience_entries=exp_entries)

    calc = SkillDurationCalculator()
    res = calc.calculate_skill_duration(
        skill_name="Python",
        experience_entries=exp_entries,
        skill_mentions=mentions,
        raw_text=raw_text,
    )

    assert res.verified_duration_months == 24
    assert res.verified_duration_years == 2.0
    assert len(res.contributing_entry_ids) == 2


def test_fixture_cv04_summary_exaggeration_duration():
    """Verify CV-04 detects declared 5.0 years vs verified 2.1 years."""
    fixture = CV_FIXTURES["summary_claims_5y_history_proves_2y"]
    raw_text = fixture["raw_text"]

    extractor = ExperienceExtractor()
    exp_entries = extractor.extract_entries(raw_text, doc_id="cv04")
    assert len(exp_entries) == 1

    binder = SkillBinder()
    mentions = binder.extract_skill_mentions(raw_text)
    binder.bind_all(mentions, experience_entries=exp_entries)

    calc = SkillDurationCalculator()
    res = calc.calculate_skill_duration(
        skill_name="Python",
        experience_entries=exp_entries,
        skill_mentions=mentions,
        raw_text=raw_text,
    )

    assert res.verified_duration_years == 2.1
    assert res.declared_duration_years == 5.0
    assert res.has_discrepancy is True


def test_fixture_cv01_skills_only_zero_python_duration():
    """Verify CV-01 produces 0.0 verified years for Python and 2.1 verified years for PHP."""
    fixture = CV_FIXTURES["python_in_skills_only"]
    raw_text = fixture["raw_text"]

    extractor = ExperienceExtractor()
    exp_entries = extractor.extract_entries(raw_text, doc_id="cv01")

    binder = SkillBinder()
    mentions = binder.extract_skill_mentions(raw_text)
    binder.bind_all(mentions, experience_entries=exp_entries)

    calc = SkillDurationCalculator()
    durations = calc.calculate_all_skill_durations(
        skill_mentions=mentions,
        experience_entries=exp_entries,
        raw_text=raw_text,
    )

    # Python in skills only -> 0 verified months
    assert durations["Python"].verified_duration_months == 0
    assert durations["Python"].verified_duration_years == 0.0

    # PHP in experience -> 25 months (2.1 years)
    assert durations["PHP"].verified_duration_months == 25
    assert durations["PHP"].verified_duration_years == 2.1


# ==============================================================================
# 6. CVFINGERPRINT INTEGRATION
# ==============================================================================

def test_cv_fingerprint_calculate_durations():
    """Verify CVFingerprint.calculate_skill_durations() and get_skill_duration()."""
    block_exp = EvidenceBlock(
        block_id="blk_e1",
        text="Alpha Corp (01/2021 - 12/2023): Python Engineer",
        char_start=0,
        char_end=48,
        section=CVSection.EXPERIENCE,
    )
    fp = CVFingerprint(
        resume_id="cv_fp_dur_001",
        content_hash="abcdef0123456789",
        raw_text_length=100,
        evidence_blocks=[block_exp],
        experience_entries=[
            ExperienceEntry(
                entry_id="exp_01",
                company="Alpha Corp",
                start_date="2021-01",
                end_date="2023-12",
                technologies=["Python"],
                evidence_block_ids=["blk_e1"],
            )
        ],
        normalized_skill_mentions=[
            SkillMention(skill_name="Python", evidence_block_ids=["blk_e1"])
        ],
    )

    durations = fp.calculate_skill_durations()
    assert "Python" in durations
    assert durations["Python"].verified_duration_months == 36
    assert durations["Python"].verified_duration_years == 3.0

    # Test get_skill_duration query helper
    py_dur = fp.get_skill_duration("Python")
    assert py_dur is not None
    assert py_dur.verified_duration_months == 36

    # Test JSON roundtrip fidelity
    json_str = fp.model_dump_json()
    restored = CVFingerprint.model_validate_json(json_str)
    assert "Python" in restored.skill_durations
    assert restored.skill_durations["Python"].verified_duration_months == 36


# ==============================================================================
# 7. SOLUTION 1 & 2: DATE PRECISION, CONFIDENCE PENALTY & AS-OF DATE INJECTION
# ==============================================================================

def test_as_of_date_injection_ongoing_job_scales():
    """Verify as_of_date context dynamically shifts ongoing job calculation in a deterministic way."""
    blocks = [
        EvidenceBlock(
            block_id="blk_curr",
            text="FPT Software (01/2024 - Hiện tại): Senior Python Engineer",
            char_start=0,
            char_end=58,
            section=CVSection.EXPERIENCE,
        )
    ]
    exp = ExperienceEntry(
        entry_id="exp_curr",
        company="FPT Software",
        start_date="2024-01",
        end_date="Hiện tại",
        is_current=True,
        technologies=["Python"],
        evidence_block_ids=["blk_curr"],
    )

    # 1. As of August 2026 (32 months)
    calc_aug = SkillDurationCalculator(as_of_date="2026-08-15")
    res_aug = calc_aug.calculate_skill_duration(
        skill_name="Python",
        experience_entries=[exp],
        evidence_blocks=blocks,
    )
    assert res_aug.verified_duration_months == 32
    assert res_aug.calculated_as_of.startswith("2026-08")
    assert res_aug.metadata["as_of_year"] == 2026
    assert res_aug.metadata["as_of_month"] == 8

    # 2. As of December 2026 (36 months)
    calc_dec = SkillDurationCalculator(as_of_date="2026-12-01")
    res_dec = calc_dec.calculate_skill_duration(
        skill_name="Python",
        experience_entries=[exp],
        evidence_blocks=blocks,
    )
    assert res_dec.verified_duration_months == 36
    assert res_dec.calculated_as_of.startswith("2026-12")


def test_date_precision_year_only_bounds_and_confidence():
    """Verify year-only entries are marked with precision='year', confidence=0.85 and explicit assumptions."""
    blocks = [
        EvidenceBlock(
            block_id="blk_yr",
            text="VNG Corp (2021 - 2023): Backend Golang Developer",
            char_start=0,
            char_end=50,
            section=CVSection.EXPERIENCE,
        )
    ]
    exp_year = ExperienceEntry(
        entry_id="exp_yr",
        company="VNG Corp",
        start_date="2021",
        end_date="2023",
        technologies=["Golang"],
        evidence_block_ids=["blk_yr"],
    )

    res = calculate_skill_duration(
        skill_name="Golang",
        experience_entries=[exp_year],
        evidence_blocks=blocks,
        as_of_date="2026-08-01",
    )

    assert res.date_precision == "year"
    assert res.confidence == 0.85
    assert len(res.assumptions) >= 1
    assert "assumed_full_year_bounds_for_VNG Corp" in res.assumptions
    assert res.verified_duration_months == 36  # 01/2021 to 12/2023
