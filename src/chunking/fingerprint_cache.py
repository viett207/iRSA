"""Thread-Safe, Two-Tier Fault-Tolerant Cache for CVFingerprint.

Architecture:
- Tier 1 (Static Cache): For historical CVs with NO ongoing/present jobs. Invariant over time.
  Cache Key: cv_fp:{resume_id}:{parser_version}:{content_hash}:static
  TTL: Long-lived (e.g. 30 days).
- Tier 2 (Dynamic Cache): For active CVs with ongoing/present jobs (is_current=True).
  Cache Key: cv_fp:{resume_id}:{parser_version}:{content_hash}:dynamic:{as_of_ym}
  TTL: Monthly-scoped invalidation (automatically refreshes when calendar month rolls over).

Key guarantees:
1. Multi-JD Optimization: The same CV is parsed once and reused across multiple JDs.
2. Invalidation on text change: Any modification to raw text alters content_hash.
3. Invalidation on parser version change: Updating PARSER_VERSION invalidates prior fingerprints.
4. Two-Tier Invalidation: Separates static past work from time-sensitive active work.
5. Fault tolerance (Resilience): Cache exceptions never crash the pipeline; fallback to direct parsing.
6. Strict Candidate Isolation: Keys namespace by resume_id so different resumes never collide.
7. LRU Eviction & TTL: Memory-safe bounded storage with configurable capacity per tier.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import OrderedDict
from datetime import UTC, datetime, timezone
from typing import Any

from src.chunking.experience_extractor import ExperienceExtractor
from src.chunking.section_detector import SectionDetector
from src.chunking.skill_attachment import SkillBinder
from src.chunking.skill_duration import resolve_as_of_date
from src.chunking.text_chunker import TextChunker
from src.models.cv_fingerprint import (
    PARSER_VERSION,
    POLICY_VERSION,
    CVFingerprint,
    PipelineContext,
    compute_content_hash,
    generate_fingerprint_cache_key,
)

logger = logging.getLogger(__name__)


def slugify_timezone(tz_name: str) -> str:
    """Normalize timezone name into clean slug for cache key namespace."""
    return tz_name.strip().lower().replace("/", "_").replace("-", "_").replace(" ", "_")


class CacheEntry:
    """Internal cache container holding the CVFingerprint and expiration timestamp."""

    __slots__ = ("fingerprint", "expires_at", "created_at", "tier")

    def __init__(
        self,
        fingerprint: CVFingerprint,
        ttl_seconds: int | None = None,
        tier: str = "static",
    ):
        self.fingerprint = fingerprint
        self.created_at = time.time()
        self.expires_at = (self.created_at + ttl_seconds) if ttl_seconds else None
        self.tier = tier

    @property
    def is_expired(self) -> bool:
        """Check if this entry has exceeded its time-to-live."""
        if self.expires_at is None:
            return False
        return time.time() > self.expires_at


class CVFingerprintCache:
    """Bounded, thread-safe Two-Tier LRU Cache for CVFingerprint instances."""

    def __init__(
        self,
        max_size: int = 1000,
        default_ttl_seconds: int | None = None,
        static_ttl_seconds: int | None = 2592000,  # 30 days
        dynamic_ttl_seconds: int | None = 86400,   # 24 hours
        enable_logging: bool = True,
    ):
        self.max_size = max_size
        self.static_ttl = default_ttl_seconds if default_ttl_seconds is not None else static_ttl_seconds
        self.dynamic_ttl = default_ttl_seconds if default_ttl_seconds is not None else dynamic_ttl_seconds
        self.enable_logging = enable_logging

        # Two-tier storage
        self._static_store: OrderedDict[str, CacheEntry] = OrderedDict()
        self._dynamic_store: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()

        # Metrics
        self._hits: int = 0
        self._misses: int = 0
        self._evictions: int = 0
        self._errors: int = 0
        self._static_hits: int = 0
        self._dynamic_hits: int = 0

    def make_static_key(
        self,
        resume_id: str,
        content_hash: str,
        parser_version: str = PARSER_VERSION,
        policy_version: str = POLICY_VERSION,
    ) -> str:
        """Build standard static cache key for historical-only CVs."""
        base_key = generate_fingerprint_cache_key(
            content_hash=content_hash,
            parser_version=parser_version,
            resume_id=resume_id,
        )
        return f"{base_key}:{policy_version}:static"

    def make_dynamic_key(
        self,
        resume_id: str,
        content_hash: str,
        parser_version: str = PARSER_VERSION,
        policy_version: str = POLICY_VERSION,
        as_of_ym: str = "2026-08",
        tz_slug: str = "asia_ho_chi_minh",
    ) -> str:
        """Build standard dynamic cache key for ongoing/present job CVs."""
        base_key = generate_fingerprint_cache_key(
            content_hash=content_hash,
            parser_version=parser_version,
            resume_id=resume_id,
        )
        return f"{base_key}:{policy_version}:dynamic:{as_of_ym}:{tz_slug}"

    def get(
        self,
        resume_id: str,
        content_hash: str,
        parser_version: str = PARSER_VERSION,
        policy_version: str = POLICY_VERSION,
        as_of_date: datetime | str | None = None,
        context: PipelineContext | None = None,
    ) -> CVFingerprint | None:
        """Retrieve a cached CVFingerprint from either Tier 1 (Static) or Tier 2 (Dynamic)."""
        ctx = context or PipelineContext.create(as_of_date_override=as_of_date, policy_version=policy_version)
        as_of_ym = ctx.as_of_ym
        tz_slug = slugify_timezone(ctx.timezone_name)
        pol_ver = ctx.policy_version

        static_key = self.make_static_key(resume_id, content_hash, parser_version, pol_ver)
        dynamic_key = self.make_dynamic_key(resume_id, content_hash, parser_version, pol_ver, as_of_ym, tz_slug)


        try:
            with self._lock:
                # 1. Check Static Tier (Tier 1)
                entry = self._static_store.get(static_key)
                if entry is not None:
                    if entry.is_expired:
                        del self._static_store[static_key]
                    else:
                        self._static_store.move_to_end(static_key)
                        self._hits += 1
                        self._static_hits += 1
                        return entry.fingerprint

                # 2. Check Dynamic Tier (Tier 2)
                entry_dyn = self._dynamic_store.get(dynamic_key)
                if entry_dyn is not None:
                    if entry_dyn.is_expired:
                        del self._dynamic_store[dynamic_key]
                    else:
                        self._dynamic_store.move_to_end(dynamic_key)
                        self._hits += 1
                        self._dynamic_hits += 1
                        return entry_dyn.fingerprint

                self._misses += 1
                return None
        except Exception as e:
            self._errors += 1
            if self.enable_logging:
                logger.warning("CVFingerprintCache.get error for resume %s: %s", resume_id, e)
            return None

    def set(
        self,
        fingerprint: CVFingerprint,
        ttl_seconds: int | None = None,
        as_of_date: datetime | str | None = None,
        context: PipelineContext | None = None,
    ) -> bool:
        """Store a CVFingerprint in the appropriate cache tier based on ongoing status."""
        if not isinstance(fingerprint, CVFingerprint):
            return False

        ctx = context or PipelineContext.create(as_of_date_override=as_of_date)
        as_of_ym = ctx.as_of_ym
        tz_slug = slugify_timezone(ctx.timezone_name)
        pol_ver = ctx.policy_version

        is_ongoing = fingerprint.has_ongoing_experience

        try:
            with self._lock:
                if is_ongoing:
                    # Tier 2: Dynamic Cache
                    key = self.make_dynamic_key(
                        resume_id=fingerprint.resume_id,
                        content_hash=fingerprint.content_hash,
                        parser_version=fingerprint.parser_version,
                        policy_version=pol_ver,
                        as_of_ym=as_of_ym,
                        tz_slug=tz_slug,
                    )
                    ttl = ttl_seconds if ttl_seconds is not None else self.dynamic_ttl
                    target_store = self._dynamic_store
                    tier_name = "dynamic"
                else:
                    # Tier 1: Static Cache
                    key = self.make_static_key(
                        resume_id=fingerprint.resume_id,
                        content_hash=fingerprint.content_hash,
                        parser_version=fingerprint.parser_version,
                        policy_version=pol_ver,
                    )
                    ttl = ttl_seconds if ttl_seconds is not None else self.static_ttl
                    target_store = self._static_store
                    tier_name = "static"

                # If key exists, update and move to end
                if key in target_store:
                    target_store[key] = CacheEntry(fingerprint, ttl_seconds=ttl, tier=tier_name)
                    target_store.move_to_end(key)
                    return True

                # Evict oldest entry if capacity reached
                if len(target_store) >= self.max_size:
                    target_store.popitem(last=False)
                    self._evictions += 1

                target_store[key] = CacheEntry(fingerprint, ttl_seconds=ttl, tier=tier_name)
                return True

        except Exception as e:
            self._errors += 1
            if self.enable_logging:
                logger.warning("CVFingerprintCache.set error for %s: %s", fingerprint.resume_id, e)
            return False

    def contains(
        self,
        resume_id: str,
        content_hash: str,
        parser_version: str = PARSER_VERSION,
        policy_version: str = POLICY_VERSION,
        as_of_date: datetime | str | None = None,
        context: PipelineContext | None = None,
    ) -> bool:
        """Check if an unexpired fingerprint exists in either tier."""
        ctx = context or PipelineContext.create(as_of_date_override=as_of_date, policy_version=policy_version)
        as_of_ym = ctx.as_of_ym
        tz_slug = slugify_timezone(ctx.timezone_name)
        pol_ver = ctx.policy_version

        static_key = self.make_static_key(resume_id, content_hash, parser_version, pol_ver)
        dynamic_key = self.make_dynamic_key(resume_id, content_hash, parser_version, pol_ver, as_of_ym, tz_slug)

        try:
            with self._lock:
                entry = self._static_store.get(static_key)
                if entry and not entry.is_expired:
                    return True
                entry_dyn = self._dynamic_store.get(dynamic_key)
                if entry_dyn and not entry_dyn.is_expired:
                    return True
                return False
        except Exception:
            return False

    def invalidate(
        self,
        resume_id: str | None = None,
        content_hash: str | None = None,
        parser_version: str | None = None,
    ) -> int:
        """Invalidate entries across both static and dynamic tiers."""
        deleted_count = 0
        try:
            with self._lock:
                for store in (self._static_store, self._dynamic_store):
                    keys_to_del: list[str] = []
                    for k in list(store.keys()):
                        parts = k.split(":")
                        if len(parts) >= 4:
                            k_res, k_ver, k_hash = parts[1], parts[2], parts[3]
                            if resume_id and k_res != resume_id:
                                continue
                            if parser_version and k_ver != parser_version:
                                continue
                            if content_hash and k_hash != content_hash:
                                continue
                            keys_to_del.append(k)

                    for k in keys_to_del:
                        del store[k]
                        deleted_count += 1

                return deleted_count
        except Exception as e:
            self._errors += 1
            if self.enable_logging:
                logger.warning("CVFingerprintCache.invalidate error: %s", e)
            return 0

    def clear(self) -> None:
        """Purge all entries from both tiers."""
        try:
            with self._lock:
                self._static_store.clear()
                self._dynamic_store.clear()
        except Exception as e:
            self._errors += 1
            if self.enable_logging:
                logger.warning("CVFingerprintCache.clear error: %s", e)

    def stats(self) -> dict[str, Any]:
        """Return two-tier cache diagnostics."""
        with self._lock:
            total_size = len(self._static_store) + len(self._dynamic_store)
            total_lookups = self._hits + self._misses
            hit_ratio = (self._hits / total_lookups) if total_lookups > 0 else 0.0
            return {
                "size": total_size,
                "static_size": len(self._static_store),
                "dynamic_size": len(self._dynamic_store),
                "max_size": self.max_size,
                "hits": self._hits,
                "static_hits": self._static_hits,
                "dynamic_hits": self._dynamic_hits,
                "misses": self._misses,
                "evictions": self._evictions,
                "errors": self._errors,
                "hit_ratio": round(hit_ratio, 4),
            }

    def __len__(self) -> int:
        with self._lock:
            return len(self._static_store) + len(self._dynamic_store)


# ------------------------------------------------------------------------------
# Global Singleton Cache Instance
# ------------------------------------------------------------------------------
_GLOBAL_CACHE = CVFingerprintCache()


def get_fingerprint_cache() -> CVFingerprintCache:
    """Get the global CVFingerprint cache instance."""
    return _GLOBAL_CACHE


def clear_fingerprint_cache() -> None:
    """Clear the global CVFingerprint cache."""
    _GLOBAL_CACHE.clear()


# ------------------------------------------------------------------------------
# High-Level Factory: Parse or Fetch Cached CVFingerprint
# ------------------------------------------------------------------------------
def create_cv_fingerprint(
    raw_text: str,
    resume_id: str = "doc",
    parser_version: str = PARSER_VERSION,
    as_of_date: datetime | str | None = None,
    scoring_timezone: str | None = None,
    policy_version: str = POLICY_VERSION,
    context: PipelineContext | None = None,
    use_cache: bool = True,
    cache: CVFingerprintCache | None = None,
    detector: SectionDetector | None = None,
) -> CVFingerprint:
    """Extract and build a fully grounded CVFingerprint with Two-Tier Cache & As-Of Date Injection."""
    active_cache = cache if cache is not None else _GLOBAL_CACHE
    c_hash = compute_content_hash(raw_text)

    ctx = context or PipelineContext.create(
        scoring_timezone=scoring_timezone,
        as_of_date_override=as_of_date,
        policy_version=policy_version,
    )

    if use_cache:
        cached_fp = active_cache.get(
            resume_id=resume_id,
            content_hash=c_hash,
            parser_version=parser_version,
            context=ctx,
        )
        if cached_fp is not None:
            return cached_fp

    # --- Cache Miss: Full Deterministic Parsing ---
    sec_detector = detector or SectionDetector()
    blocks = TextChunker.chunk_to_evidence_blocks(raw_text, detector=sec_detector)

    # 1. Experience extraction
    exp_extractor = ExperienceExtractor()
    experience_entries = exp_extractor.extract_entries(raw_text, evidence_blocks=blocks, doc_id=resume_id)

    # 2. Skill extraction & binding
    binder = SkillBinder(detector=sec_detector)
    skill_mentions = binder.extract_skill_mentions(blocks)
    skill_attachments = binder.bind_all(
        skill_mentions=skill_mentions,
        experience_entries=experience_entries,
        evidence_blocks=blocks,
    )

    # 3. Assemble CVFingerprint
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

    # 4. Calculate grounded skill durations (injecting PipelineContext)
    fp.calculate_skill_durations(context=ctx)
    fp.calculated_as_of = ctx.as_of_local_date


    # 5. Store in appropriate cache tier
    if use_cache:
        active_cache.set(fp, context=ctx)

    return fp
