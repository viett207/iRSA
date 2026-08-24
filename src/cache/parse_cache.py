"""ParseCacheService for storing and retrieving deterministic CVFingerprint parse results with envelope and Two-Level Single-Flight."""

from __future__ import annotations

import asyncio
import logging
import random
import time
import uuid
from collections.abc import Callable
from typing import TYPE_CHECKING

from src.cache.base import CacheBackend
from src.cache.envelope import (
    CURRENT_SCHEMA_VERSION,
    DEFAULT_COMPRESSION_THRESHOLD_BYTES,
    CacheEnvelope,
    CacheEnvelopeError,
)
from src.cache.manager import get_cache_backend
from src.cache.metrics import get_cache_metrics
from src.models.cv_fingerprint import (
    PARSER_VERSION,
    CVFingerprint,
    compute_content_hash,
)

if TYPE_CHECKING:
    from src.chunking.section_detector import SectionDetector

logger = logging.getLogger(__name__)

# Default TTL: 30 days (2,592,000 seconds)
# Rationale: Raw text parse results are deterministic and immutable for a given content hash and parser version.
DEFAULT_PARSE_TTL_SECONDS = 2592000

# Default Distributed Lock settings
DEFAULT_LOCK_TTL_MS = 15000       # 15 seconds (ample time for CV parse ~50-500ms; auto-recovers if worker dies)
DEFAULT_RETRY_INTERVAL_MS = 50    # 50 ms poll interval
DEFAULT_MAX_WAIT_MS = 20000       # 20 seconds maximum wait time before fallback


class ParseCacheService:
    """Service managing parse cache layer with tenant isolation, PII-free keys, envelope validation, and Two-Level Single-Flight.

    Two-Level Single-Flight:
    1. In-Process Single-Flight: Deduplicates concurrent coroutines within the same worker via asyncio.Future (0 network load).
    2. Distributed Single-Flight: Coordinates across multiple workers via Redis Distributed Lock with Lua release.

    Key structure:
    `cv_parse:{tenant_id}:{resume_hash}:{parser_version}`
    Lock key:
    `lock:cv_parse:{tenant_id}:{resume_hash}:{parser_version}`
    """

    def __init__(
        self,
        backend: CacheBackend | None = None,
        default_ttl_seconds: int = DEFAULT_PARSE_TTL_SECONDS,
        default_tenant_id: str = "default",
        lock_ttl_ms: int = DEFAULT_LOCK_TTL_MS,
        retry_interval_ms: int = DEFAULT_RETRY_INTERVAL_MS,
        max_wait_ms: int = DEFAULT_MAX_WAIT_MS,
        compression_threshold_bytes: int = DEFAULT_COMPRESSION_THRESHOLD_BYTES,
    ) -> None:
        self._backend = backend
        self.default_ttl_seconds = default_ttl_seconds
        self.default_tenant_id = default_tenant_id
        self.lock_ttl_ms = lock_ttl_ms
        self.retry_interval_ms = retry_interval_ms
        self.max_wait_ms = max_wait_ms
        self.compression_threshold_bytes = compression_threshold_bytes
        self._metrics = get_cache_metrics()

        # In-process single-flight map to deduplicate coroutines within the active worker process
        self._in_flight: dict[str, asyncio.Future[CVFingerprint]] = {}
        self._in_flight_lock: asyncio.Lock | None = None

    def _get_in_flight_lock(self) -> asyncio.Lock:
        if self._in_flight_lock is None:
            self._in_flight_lock = asyncio.Lock()
        return self._in_flight_lock

    def get_backend(self) -> CacheBackend:
        """Get the configured CacheBackend or default to active worker backend."""
        if self._backend is not None:
            return self._backend
        return get_cache_backend()

    def build_key(
        self,
        resume_hash: str,
        parser_version: str = PARSER_VERSION,
        tenant_id: str | None = None,
    ) -> str:
        """Generate privacy-safe parse cache key without candidate PII.

        Format: `cv_parse:{tenant_id}:{resume_hash}:{parser_version}`
        """
        t_id = (tenant_id or self.default_tenant_id).strip().lower().replace(":", "_")
        r_hash = resume_hash.strip().lower()
        p_ver = (parser_version or PARSER_VERSION).strip()
        return f"cv_parse:{t_id}:{r_hash}:{p_ver}"

    async def get_parsed(
        self,
        resume_hash: str,
        parser_version: str = PARSER_VERSION,
        tenant_id: str | None = None,
    ) -> CVFingerprint | None:
        """Retrieve cached CVFingerprint from parse cache with envelope and schema validation.

        Returns:
            CVFingerprint instance if cache HIT and valid, else None.
            If corrupt or mismatched, deletes the key automatically for clean re-parse.
        """
        key = self.build_key(resume_hash=resume_hash, parser_version=parser_version, tenant_id=tenant_id)
        backend = self.get_backend()
        try:
            raw_bytes = await backend.get(key)
            if raw_bytes is None:
                return None
            return CacheEnvelope.unwrap_fingerprint(
                raw_bytes=raw_bytes,
                expected_parser_version=parser_version,
                expected_schema_version=CURRENT_SCHEMA_VERSION,
            )
        except CacheEnvelopeError as exc:
            logger.warning("Invalid/corrupt cache envelope for key %s (%s). Deleting key for re-parsing.", key, exc)
            try:
                await backend.delete(key)
            except Exception as del_exc:
                logger.warning("Failed to delete corrupt cache key %s: %s", key, del_exc)
            return None
        except Exception as exc:
            logger.warning("ParseCacheService.get_parsed failed for key %s: %s", key, exc)
            return None

    async def set_parsed(
        self,
        fingerprint: CVFingerprint,
        tenant_id: str | None = None,
        ttl_seconds: int | None = None,
    ) -> bool:
        """Store parsed CVFingerprint into parse cache wrapped in versioned & compressed CacheEnvelope.

        Args:
            fingerprint: Parsed CVFingerprint instance.
            tenant_id: Optional tenant identifier for tenant isolation.
            ttl_seconds: Optional expiration override in seconds.
        """
        if not isinstance(fingerprint, CVFingerprint):
            raise TypeError(f"Expected CVFingerprint, got {type(fingerprint).__name__}")

        key = self.build_key(
            resume_hash=fingerprint.content_hash,
            parser_version=fingerprint.parser_version,
            tenant_id=tenant_id,
        )
        backend = self.get_backend()
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        try:
            envelope_bytes = CacheEnvelope.wrap_fingerprint(
                fingerprint=fingerprint,
                schema_version=CURRENT_SCHEMA_VERSION,
                parser_version=fingerprint.parser_version,
                compression_threshold_bytes=self.compression_threshold_bytes,
            )
            await backend.set(key, envelope_bytes, ttl_seconds=ttl)
            return True
        except Exception as exc:
            logger.warning("ParseCacheService.set_parsed failed for key %s: %s", key, exc)
            return False

    async def delete_parsed(
        self,
        resume_hash: str,
        parser_version: str = PARSER_VERSION,
        tenant_id: str | None = None,
    ) -> None:
        """Delete cached parse result."""
        key = self.build_key(resume_hash=resume_hash, parser_version=parser_version, tenant_id=tenant_id)
        backend = self.get_backend()
        try:
            await backend.delete(key)
        except Exception as exc:
            logger.warning("ParseCacheService.delete_parsed failed for key %s: %s", key, exc)

    async def get_or_parse(
        self,
        raw_text: str,
        resume_id: str = "doc",
        tenant_id: str | None = None,
        parser_version: str = PARSER_VERSION,
        lock_ttl_ms: int | None = None,
        retry_interval_ms: int | None = None,
        max_wait_ms: int | None = None,
        parse_fn: Callable[[], CVFingerprint] | None = None,
        detector: SectionDetector | None = None,
    ) -> CVFingerprint:
        """Retrieve CVFingerprint with Two-Level Single-Flight protection against cache stampede."""
        c_hash = compute_content_hash(raw_text)
        t_id = (tenant_id or self.default_tenant_id).strip().lower().replace(":", "_")
        p_ver = (parser_version or PARSER_VERSION).strip()
        cache_key = self.build_key(resume_hash=c_hash, parser_version=p_ver, tenant_id=t_id)

        # Step 1: First GET cache (Fast path)
        cached_fp = await self.get_parsed(resume_hash=c_hash, parser_version=p_ver, tenant_id=t_id)
        if cached_fp is not None:
            self._metrics.increment("cache_hit")
            fp_result = cached_fp.model_copy(deep=True)
            fp_result.resume_id = resume_id
            return fp_result

        # Step 2: In-Process Single-Flight (Deduplicate concurrent coroutines inside this worker)
        loop = asyncio.get_running_loop()
        is_leader = False
        async with self._get_in_flight_lock():
            if cache_key in self._in_flight:
                future = self._in_flight[cache_key]
            else:
                future = loop.create_future()
                self._in_flight[cache_key] = future
                is_leader = True

        if not is_leader:
            # Follower coroutine: wait for the in-process leader to finish
            fp = await future
            fp_result = fp.model_copy(deep=True)
            fp_result.resume_id = resume_id
            return fp_result

        # Leader coroutine: coordinates distributed single-flight across the cluster
        try:
            fp = await self._execute_distributed_single_flight(
                raw_text=raw_text,
                resume_id=resume_id,
                tenant_id=t_id,
                parser_version=p_ver,
                c_hash=c_hash,
                cache_key=cache_key,
                lock_ttl_ms=lock_ttl_ms,
                retry_interval_ms=retry_interval_ms,
                max_wait_ms=max_wait_ms,
                parse_fn=parse_fn,
                detector=detector,
            )
            if not future.done():
                future.set_result(fp)
            return fp
        except Exception as exc:
            if not future.done():
                future.set_exception(exc)
            raise
        finally:
            async with self._get_in_flight_lock():
                self._in_flight.pop(cache_key, None)

    async def _execute_distributed_single_flight(
        self,
        raw_text: str,
        resume_id: str,
        tenant_id: str,
        parser_version: str,
        c_hash: str,
        cache_key: str,
        lock_ttl_ms: int | None,
        retry_interval_ms: int | None,
        max_wait_ms: int | None,
        parse_fn: Callable[[], CVFingerprint] | None,
        detector: SectionDetector | None,
    ) -> CVFingerprint:
        """Distributed Single-Flight Mutex across worker processes."""
        self._metrics.increment("cache_miss")

        def _do_parse() -> CVFingerprint:
            self._metrics.increment("parse_count")
            if parse_fn is not None:
                return parse_fn()

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
            return CVFingerprint(
                resume_id=resume_id,
                content_hash=c_hash,
                parser_version=parser_version,
                raw_text_length=len(raw_text),
                evidence_blocks=blocks,
                experience_entries=experience_entries,
                normalized_skill_mentions=skill_mentions,
                skill_attachments=skill_attachments,
            )

        lock_key = f"lock:{cache_key}"
        owner_token = uuid.uuid4().hex

        ttl_ms = lock_ttl_ms if lock_ttl_ms is not None else self.lock_ttl_ms
        retry_ms = retry_interval_ms if retry_interval_ms is not None else self.retry_interval_ms
        max_ms = max_wait_ms if max_wait_ms is not None else self.max_wait_ms

        backend = self.get_backend()
        start_time = time.monotonic()

        while True:
            # Attempt to acquire distributed lock
            acquired = False
            try:
                acquired = await backend.acquire_lock(lock_key, owner_token, ttl_ms=ttl_ms)
            except Exception as exc:
                logger.warning("Error acquiring distributed lock %s: %s. Falling back to parse.", lock_key, exc)
                return _do_parse()

            if acquired:
                self._metrics.increment("lock_acquired")
                try:
                    # Double-Checked Locking: GET cache 2nd time
                    cached_fp_2 = await self.get_parsed(resume_hash=c_hash, parser_version=parser_version, tenant_id=tenant_id)
                    if cached_fp_2 is not None:
                        self._metrics.increment("cache_hit")
                        fp_result = cached_fp_2.model_copy(deep=True)
                        fp_result.resume_id = resume_id
                        return fp_result

                    # Still MISS -> execute parse
                    fp = _do_parse()

                    # SET cache
                    await self.set_parsed(fp, tenant_id=tenant_id)
                    return fp
                finally:
                    # Atomic release lock using owner_token
                    try:
                        await backend.release_lock(lock_key, owner_token)
                    except Exception as exc:
                        logger.warning("Error releasing distributed lock %s: %s", lock_key, exc)
            else:
                self._metrics.increment("lock_wait")
                # Lock not acquired -> another worker is parsing
                elapsed_ms = (time.monotonic() - start_time) * 1000
                if elapsed_ms >= max_ms:
                    logger.warning("Max wait %d ms exceeded for %s. Fallback to direct parse.", max_ms, lock_key)
                    fp = _do_parse()
                    await self.set_parsed(fp, tenant_id=tenant_id)
                    return fp

                # Sleep with random jitter
                jitter = random.uniform(0.8, 1.2)
                sleep_seconds = max(0.01, (retry_ms * jitter) / 1000.0)
                await asyncio.sleep(sleep_seconds)

                # GET cache again
                cached_fp_retry = await self.get_parsed(resume_hash=c_hash, parser_version=parser_version, tenant_id=tenant_id)
                if cached_fp_retry is not None:
                    self._metrics.increment("cache_hit")
                    fp_result = cached_fp_retry.model_copy(deep=True)
                    fp_result.resume_id = resume_id
                    return fp_result

                # If still not in cache, loop back to try acquiring lock again (handles dead owner or expired lock)
