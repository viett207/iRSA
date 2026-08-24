"""Asynchronous CV Fingerprint extraction & evaluation pipeline with decoupled Parse and Duration caching and Distributed Single-Flight."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime
from typing import TYPE_CHECKING, Any

from src.cache.duration_cache import DurationCacheService
from src.cache.parse_cache import ParseCacheService
from src.models.cv_fingerprint import (
    PARSER_VERSION,
    POLICY_VERSION,
    CVFingerprint,
    PipelineContext,
    compute_content_hash,
)

if TYPE_CHECKING:
    from src.chunking.section_detector import SectionDetector

logger = logging.getLogger(__name__)


async def get_or_create_cv_fingerprint_async(
    raw_text: str,
    resume_id: str = "doc",
    tenant_id: str = "default",
    parser_version: str = PARSER_VERSION,
    as_of_date: datetime | str | None = None,
    scoring_timezone: str | None = None,
    policy_version: str = POLICY_VERSION,
    context: PipelineContext | None = None,
    parse_cache_service: ParseCacheService | None = None,
    duration_cache_service: DurationCacheService | None = None,
    use_cache: bool = True,
    detector: SectionDetector | None = None,
    parse_fn: Callable[[], CVFingerprint] | None = None,
) -> CVFingerprint:
    """Extract and build CVFingerprint using decoupled Parse Cache and Duration Cache with Distributed Single-Flight.

    Guarantees:
    1. Parse Cache with Distributed Single-Flight:
       Keyed by `cv_parse:{tenant_id}:{resume_hash}:{parser_version}`.
       Prevents cache stampede / thundering herd when concurrent requests miss cache for the same CV.
    2. Duration Cache:
       Keyed by `skill_duration:{fingerprint_hash}:{duration_policy_version}:{as_of_ym}`.
       Stores only calculated duration metrics. Recalculated only when month rolls over or policy changes.
    3. Changing parser_version automatically bypasses stale parse cache.
    4. Tenant Isolation: Distinct tenant IDs never collide or share cached parse data.
    """
    ctx = context or PipelineContext.create(
        scoring_timezone=scoring_timezone,
        as_of_date_override=as_of_date,
        policy_version=policy_version,
    )

    c_hash = compute_content_hash(raw_text)
    parse_svc = parse_cache_service or ParseCacheService()
    dur_svc = duration_cache_service or DurationCacheService()

    # --------------------------------------------------------------------------
    # Step 1: Parse Cache Layer (Protected by Distributed Single-Flight)
    # --------------------------------------------------------------------------
    if use_cache:
        fp = await parse_svc.get_or_parse(
            raw_text=raw_text,
            resume_id=resume_id,
            tenant_id=tenant_id,
            parser_version=parser_version,
            parse_fn=parse_fn,
            detector=detector,
        )
    else:
        if parse_fn is not None:
            fp = parse_fn()
        else:
            from src.chunking.experience_extractor import ExperienceExtractor
            from src.chunking.section_detector import SectionDetector as SecDetector
            from src.chunking.skill_attachment import SkillBinder
            from src.chunking.text_chunker import TextChunker

            sec_detector = detector or SecDetector()
            blocks = TextChunker.chunk_to_evidence_blocks(raw_text, detector=sec_detector)
            exp_extractor = ExperienceExtractor()
            experience_entries = exp_extractor.extract_entries(raw_text, evidence_blocks=blocks, doc_id=resume_id)
            binder = SkillBinder(detector=sec_detector)
            skill_mentions = binder.extract_skill_mentions(blocks)
            skill_attachments = binder.bind_all(
                skill_mentions=skill_mentions,
                experience_entries=experience_entries,
                evidence_blocks=blocks,
            )
            fp = CVFingerprint(
                resume_id=resume_id,
                content_hash=c_hash,
                parser_version=parser_version,
                raw_text_length=len(raw_text),
                evidence_blocks=blocks,
                experience_entries=experience_entries,
                normalized_skill_mentions=skill_mentions,
                skill_attachments=skill_attachments,
            )

    # --------------------------------------------------------------------------
    # Step 2: Duration Cache Layer (Decoupled from Parse)
    # --------------------------------------------------------------------------
    durations: dict[str, Any] | None = None
    if use_cache:
        durations = await dur_svc.get_durations(
            fingerprint_hash=c_hash,
            duration_policy_version=ctx.policy_version,
            as_of_ym=ctx.as_of_ym,
        )

    if durations is not None:
        # Duration Cache Hit: reuse cached calculations directly
        fp.skill_durations = durations
        fp.calculated_as_of = ctx.as_of_local_date
    else:
        # Duration Cache Miss: compute duration without re-parsing CV
        fp.calculate_skill_durations(context=ctx)
        fp.calculated_as_of = ctx.as_of_local_date

        if use_cache:
            await dur_svc.set_durations(
                fingerprint_hash=c_hash,
                durations=fp.skill_durations,
                duration_policy_version=ctx.policy_version,
                as_of_ym=ctx.as_of_ym,
            )

    return fp
