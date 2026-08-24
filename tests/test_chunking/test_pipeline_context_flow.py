"""Unit tests for the Standard PipelineContext Flow with Timezone Normalization and Audit Traceability.

Flow Steps Verified:
1. API Entrypoint: Capture request_time_utc immediately.
2. Resolve Timezone: Look up scoring_timezone (e.g. Asia/Ho_Chi_Minh, America/New_York, UTC).
3. Date Normalization: Convert UTC to local working date (as_of_local_date) and month bucket (as_of_ym).
4. Freeze Context: Immutable snapshot (PipelineContext).
5. Execution: Extract skills from cache/CV, compute grounded skill duration using as_of_local_date.
6. Cache & Return: Cache key namespaced by as_of_ym + policy_version + timezone, with full Audit Metadata.
"""

from datetime import datetime, timezone
import pytest
from zoneinfo import ZoneInfo

from src.chunking.fingerprint_cache import CVFingerprintCache, create_cv_fingerprint, slugify_timezone
from src.chunking.skill_duration import SkillDurationCalculator, calculate_skill_duration
from src.models.cv_fingerprint import (
    PARSER_VERSION,
    POLICY_VERSION,
    CVFingerprint,
    ExperienceEntry,
    PipelineContext,
    SkillDurationResult,
    SkillMention,
)
from src.models.evidence import CVSection, EvidenceBlock


# ==============================================================================
# 1. TIMEZONE RESOLUTION & DATE NORMALIZATION
# ==============================================================================

def test_pipeline_context_rollover_utc_vs_vietnam():
    """Verify rollover behavior when it is already Sept 1st in VN but still Aug 31st in UTC."""
    # 2026-08-31 17:30:00 UTC == 2026-09-01 00:30:00 in Asia/Ho_Chi_Minh (UTC+7)
    utc_cutoff = datetime(2026, 8, 31, 17, 30, 0, tzinfo=timezone.utc)

    # 1. Vietnam Context (UTC+7)
    ctx_vn = PipelineContext.create(
        request_time_utc=utc_cutoff,
        scoring_timezone="Asia/Ho_Chi_Minh",
        policy_version="v1",
    )
    assert ctx_vn.timezone_name == "Asia/Ho_Chi_Minh"
    assert ctx_vn.as_of_local_date == "2026-09-01"
    assert ctx_vn.as_of_ym == "2026-09"
    assert ctx_vn.local_as_of.year == 2026
    assert ctx_vn.local_as_of.month == 9
    assert ctx_vn.local_as_of.day == 1

    # 2. UTC Context (UTC+0)
    ctx_utc = PipelineContext.create(
        request_time_utc=utc_cutoff,
        scoring_timezone="UTC",
        policy_version="v1",
    )
    assert ctx_utc.timezone_name == "UTC"
    assert ctx_utc.as_of_local_date == "2026-08-31"
    assert ctx_utc.as_of_ym == "2026-08"

    # 3. New York Context (UTC-4 in summer DST) -> 2026-08-31 13:30:00
    ctx_ny = PipelineContext.create(
        request_time_utc=utc_cutoff,
        scoring_timezone="America/New_York",
        policy_version="v1",
    )
    assert ctx_ny.as_of_local_date == "2026-08-31"
    assert ctx_ny.as_of_ym == "2026-08"


def test_pipeline_context_immutability():
    """Verify that PipelineContext is frozen and cannot be modified at runtime."""
    ctx = PipelineContext.create(scoring_timezone="Asia/Ho_Chi_Minh")
    with pytest.raises(Exception):  # FrozenInstanceError / AttributeError
        ctx.as_of_ym = "2099-12"


def test_pipeline_context_audit_metadata():
    """Verify to_audit_metadata() outputs complete, traceable auditing dictionary."""
    utc_time = datetime(2026, 8, 23, 14, 30, 0, tzinfo=timezone.utc)
    ctx = PipelineContext.create(
        request_time_utc=utc_time,
        scoring_timezone="Asia/Ho_Chi_Minh",
        policy_version="v2",
    )
    meta = ctx.to_audit_metadata()

    assert meta["request_time_utc"] == "2026-08-23T14:30:00+00:00"
    assert meta["scoring_timezone"] == "Asia/Ho_Chi_Minh"
    assert meta["as_of_local_date"] == "2026-08-23"
    assert meta["as_of_ym"] == "2026-08"
    assert meta["policy_version"] == "v2"
    assert "+07:00" in meta["calculated_at_iso"]


# ==============================================================================
# 2. EXECUTION: SKILL DURATION COMPUTATION WITH PIPELINECONTEXT
# ==============================================================================

def test_skill_duration_calculation_with_timezone_context():
    """Verify that ongoing job duration reflects local calendar month from context."""
    # Ongoing position starting 01/2024
    blocks = [
        EvidenceBlock(
            block_id="blk_curr",
            text="Công ty VNG (01/2024 - Hiện tại): Backend Golang Engineer",
            char_start=0,
            char_end=58,
            section=CVSection.EXPERIENCE,
        )
    ]
    exp = ExperienceEntry(
        entry_id="exp_01",
        company="VNG",
        start_date="2024-01",
        end_date="Hiện tại",
        is_current=True,
        technologies=["Golang"],
        evidence_block_ids=["blk_curr"],
    )

    utc_time = datetime(2026, 8, 31, 17, 30, 0, tzinfo=timezone.utc)

    # In VN: It is 09/2026 (01/2024 to 09/2026 = 33 months)
    ctx_vn = PipelineContext.create(
        request_time_utc=utc_time,
        scoring_timezone="Asia/Ho_Chi_Minh",
    )
    calc_vn = SkillDurationCalculator(context=ctx_vn)
    res_vn = calc_vn.calculate_skill_duration("Golang", experience_entries=[exp], evidence_blocks=blocks)

    assert res_vn.verified_duration_months == 33
    assert res_vn.scoring_timezone == "Asia/Ho_Chi_Minh"
    assert res_vn.as_of_local_date == "2026-09-01"
    assert res_vn.as_of_ym == "2026-09"
    assert res_vn.audit_metadata["scoring_timezone"] == "Asia/Ho_Chi_Minh"

    # In UTC: It is still 08/2026 (01/2024 to 08/2026 = 32 months)
    ctx_utc = PipelineContext.create(
        request_time_utc=utc_time,
        scoring_timezone="UTC",
    )
    calc_utc = SkillDurationCalculator(context=ctx_utc)
    res_utc = calc_utc.calculate_skill_duration("Golang", experience_entries=[exp], evidence_blocks=blocks)

    assert res_utc.verified_duration_months == 32
    assert res_utc.scoring_timezone == "UTC"
    assert res_utc.as_of_local_date == "2026-08-31"
    assert res_utc.as_of_ym == "2026-08"


# ==============================================================================
# 3. CACHE NAMESPACING BY (AS_OF_YM + POLICY_VERSION + TIMEZONE)
# ==============================================================================

def test_two_tier_cache_namespacing_with_context():
    """Verify that dynamic tier isolates different timezones and policy versions."""
    cache = CVFingerprintCache(max_size=20)
    raw_text = """
    LÊ MINH ĐỨC
    KINH NGHIỆM:
    Tập đoàn FPT (01/2024 - Hiện tại): Python Developer
    KỸ NĂNG: Python, Docker
    """

    utc_time = datetime(2026, 8, 31, 17, 30, 0, tzinfo=timezone.utc)

    # 1. Request from VN (creates month 2026-09 entry)
    ctx_vn = PipelineContext.create(
        request_time_utc=utc_time,
        scoring_timezone="Asia/Ho_Chi_Minh",
        policy_version="v1",
    )
    fp_vn = create_cv_fingerprint(
        raw_text=raw_text,
        resume_id="cand_tz_01",
        context=ctx_vn,
        cache=cache,
    )
    assert fp_vn.get_skill_duration("Python").verified_duration_months == 33
    assert cache.stats()["dynamic_size"] == 1

    # 2. Request from UTC (month 2026-08 entry -> cache miss & creates new entry)
    ctx_utc = PipelineContext.create(
        request_time_utc=utc_time,
        scoring_timezone="UTC",
        policy_version="v1",
    )
    fp_utc = create_cv_fingerprint(
        raw_text=raw_text,
        resume_id="cand_tz_01",
        context=ctx_utc,
        cache=cache,
    )
    assert fp_utc.get_skill_duration("Python").verified_duration_months == 32
    assert cache.stats()["dynamic_size"] == 2

    # 3. Second request from VN with same context -> Cache HIT
    fp_vn_hit = create_cv_fingerprint(
        raw_text=raw_text,
        resume_id="cand_tz_01",
        context=ctx_vn,
        cache=cache,
    )
    assert cache.stats()["dynamic_hits"] == 1
    assert fp_vn_hit.get_skill_duration("Python").verified_duration_months == 33

    # 4. Policy version upgrade (v1 -> v2) -> Invalidates/Misses and caches v2
    ctx_vn_v2 = PipelineContext.create(
        request_time_utc=utc_time,
        scoring_timezone="Asia/Ho_Chi_Minh",
        policy_version="v2",
    )
    fp_vn_v2 = create_cv_fingerprint(
        raw_text=raw_text,
        resume_id="cand_tz_01",
        context=ctx_vn_v2,
        cache=cache,
    )
    assert cache.stats()["dynamic_size"] == 3


# ==============================================================================
# 4. TIMEZONE ALIAS MAPPING & SAFE FALLBACK (NO CRASH GUARANTEE)
# ==============================================================================

def test_timezone_alias_resolution():
    """Verify informal names, typos, and common aliases map to valid IANA canonical names."""
    # 1. VN/Hanoi -> Asia/Ho_Chi_Minh
    ctx1 = PipelineContext.create(scoring_timezone="VN/Hanoi")
    assert ctx1.timezone_name == "Asia/Ho_Chi_Minh"
    assert ctx1.requested_timezone == "VN/Hanoi"
    assert ctx1.timezone_fallback_applied is False

    # 2. Vietnam / Saigon / Ha Noi / GMT+7
    for alias in ["vietnam", "Saigon", "ha noi", "ICT", "GMT+7", "UTC+7", "+07:00"]:
        ctx = PipelineContext.create(scoring_timezone=alias)
        assert ctx.timezone_name == "Asia/Ho_Chi_Minh"
        assert ctx.timezone_fallback_applied is False

    # 3. US / APAC aliases
    ctx_us = PipelineContext.create(scoring_timezone="US/Pacific")
    assert ctx_us.timezone_name == "America/Los_Angeles"

    ctx_jp = PipelineContext.create(scoring_timezone="tokyo")
    assert ctx_jp.timezone_name == "Asia/Tokyo"


def test_invalid_timezone_safe_fallback_no_crash():
    """Verify that malformed or non-existent timezones safely fallback without crashing the pipeline."""
    bad_timezones = [
        "Invalid/NonExistent_Zone",
        "gibberish_12345!@#$",
        "VN/UnknownCity",
        "Moon/Base_Alpha",
        "",
        None,
    ]

    for bad_tz in bad_timezones:
        ctx = PipelineContext.create(
            request_time_utc=datetime(2026, 8, 23, 12, 0, 0, tzinfo=timezone.utc),
            scoring_timezone=bad_tz,
        )
        assert ctx.timezone_name == "Asia/Ho_Chi_Minh"
        if bad_tz and bad_tz not in ("", None):
            assert ctx.timezone_fallback_applied is True
            assert ctx.requested_timezone == bad_tz
        assert ctx.as_of_local_date == "2026-08-23"

        # Verify CV parsing and duration calculation run cleanly
        fp = create_cv_fingerprint(
            raw_text="PHẠM HOÀNG\nKINH NGHIỆM:\nCông ty ABC (2022 - 2024): Java\nKỸ NĂNG: Java",
            resume_id="cand_safe_fallback",
            context=ctx,
            use_cache=False,
        )
        assert fp is not None
        java_dur = fp.get_skill_duration("Java")
        assert java_dur is not None
        assert java_dur.scoring_timezone == "Asia/Ho_Chi_Minh"
        assert java_dur.audit_metadata["timezone_fallback_applied"] == ctx.timezone_fallback_applied
