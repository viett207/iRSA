"""Comprehensive tests for decoupled ParseCacheService and DurationCacheService.

Verifies:
1. Parse cache hit vs miss
2. Duration cache hit vs miss
3. Month rollover (as_of_ym change) does NOT trigger CV re-parsing
4. Duration policy version change does NOT trigger CV re-parsing
5. Parser version change invalidates stale parse cache
6. Tenant isolation ensures multi-tenant data segregation
7. Zero PII leakage in Redis cache keys
8. Works consistently across InMemory and Redis backends
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
import pytest_asyncio

from src.cache.base import CacheBackend
from src.cache.duration_cache import DurationCacheService
from src.cache.memory import InMemoryCacheBackend
from src.cache.parse_cache import ParseCacheService
from src.cache.pipeline import get_or_create_cv_fingerprint_async
from src.cache.redis import RedisCacheBackend
from src.chunking.text_chunker import TextChunker
from src.models.cv_fingerprint import (
    PARSER_VERSION,
    PipelineContext,
    compute_content_hash,
)
from tests.fixtures.cv_fixtures import CV_FIXTURES
from tests.test_cache.fake_redis import FakeAsyncRedis

SAMPLE_CV = CV_FIXTURES["python_in_experience_with_date_range"]["raw_text"]

# Active CV with ongoing position
DYNAMIC_CV = """
NGUYỄN VĂN HÙNG
Email: hung.nguyen@example.com
Phone: 0912345678
KINH NGHIỆM:
Công ty ABC (01/2024 - Hiện tại): Senior Python Developer
KỸ NĂNG: Python, FastAPI, Docker
"""


@pytest_asyncio.fixture
async def memory_backend() -> CacheBackend:
    backend = InMemoryCacheBackend()
    yield backend
    await backend.close()


@pytest_asyncio.fixture
async def redis_backend() -> CacheBackend:
    fake_client = FakeAsyncRedis()
    backend = RedisCacheBackend(redis_client=fake_client)  # type: ignore[arg-type]
    yield backend
    await backend.close()


@pytest.fixture(params=["memory", "redis"])
def cache_backend(
    request: pytest.FixtureRequest,
    memory_backend: CacheBackend,
    redis_backend: CacheBackend,
) -> CacheBackend:
    if request.param == "memory":
        return memory_backend
    return redis_backend


# ==============================================================================
# 1. PARSE CACHE HIT & MISS
# ==============================================================================

@pytest.mark.asyncio
async def test_parse_cache_hit_and_miss(cache_backend: CacheBackend) -> None:
    parse_svc = ParseCacheService(backend=cache_backend)
    dur_svc = DurationCacheService(backend=cache_backend)

    # 1. First call -> Parse cache MISS (must parse)
    with patch.object(TextChunker, "chunk_to_evidence_blocks", wraps=TextChunker.chunk_to_evidence_blocks) as mock_chunker:
        fp1 = await get_or_create_cv_fingerprint_async(
            raw_text=SAMPLE_CV,
            resume_id="cand_parse_01",
            tenant_id="tenant_x",
            parse_cache_service=parse_svc,
            duration_cache_service=dur_svc,
        )
        assert mock_chunker.call_count == 1
        assert fp1 is not None

    # 2. Second call -> Parse cache HIT (must NOT parse again)
    with patch.object(TextChunker, "chunk_to_evidence_blocks", wraps=TextChunker.chunk_to_evidence_blocks) as mock_chunker:
        fp2 = await get_or_create_cv_fingerprint_async(
            raw_text=SAMPLE_CV,
            resume_id="cand_parse_01",
            tenant_id="tenant_x",
            parse_cache_service=parse_svc,
            duration_cache_service=dur_svc,
        )
        assert mock_chunker.call_count == 0  # 0 parsing!
        assert fp2.content_hash == fp1.content_hash


# ==============================================================================
# 2. DURATION CACHE HIT & MISS
# ==============================================================================

@pytest.mark.asyncio
async def test_duration_cache_hit_and_miss(cache_backend: CacheBackend) -> None:
    parse_svc = ParseCacheService(backend=cache_backend)
    dur_svc = DurationCacheService(backend=cache_backend)

    c_hash = compute_content_hash(DYNAMIC_CV)
    ctx = PipelineContext.create(as_of_date_override="2026-08-15")

    # 1. Before evaluation: Duration cache is empty (MISS)
    cached_dur = await dur_svc.get_durations(fingerprint_hash=c_hash, duration_policy_version=ctx.policy_version, as_of_ym=ctx.as_of_ym)
    assert cached_dur is None

    # 2. First evaluation: calculates and caches duration
    fp1 = await get_or_create_cv_fingerprint_async(
        raw_text=DYNAMIC_CV,
        resume_id="cand_dur_01",
        context=ctx,
        parse_cache_service=parse_svc,
        duration_cache_service=dur_svc,
    )
    assert fp1.get_skill_duration("Python") is not None

    # 3. After evaluation: Duration cache is populated (HIT)
    cached_dur_after = await dur_svc.get_durations(fingerprint_hash=c_hash, duration_policy_version=ctx.policy_version, as_of_ym=ctx.as_of_ym)
    assert cached_dur_after is not None
    assert "Python" in cached_dur_after


# ==============================================================================
# 3. MONTH ROLLOVER (NO RE-PARSING)
# ==============================================================================

@pytest.mark.asyncio
async def test_month_rollover_does_not_reparse_cv(cache_backend: CacheBackend) -> None:
    """When calendar month rolls over, duration is recalculated but CV is NEVER re-parsed."""
    parse_svc = ParseCacheService(backend=cache_backend)
    dur_svc = DurationCacheService(backend=cache_backend)

    ctx_aug = PipelineContext.create(as_of_date_override="2026-08-15")
    ctx_sep = PipelineContext.create(as_of_date_override="2026-09-15")

    # Month 1 (August 2026): Parse CV and calculate duration
    with patch.object(TextChunker, "chunk_to_evidence_blocks", wraps=TextChunker.chunk_to_evidence_blocks) as mock_chunker:
        fp_aug = await get_or_create_cv_fingerprint_async(
            raw_text=DYNAMIC_CV,
            resume_id="cand_rollover",
            context=ctx_aug,
            parse_cache_service=parse_svc,
            duration_cache_service=dur_svc,
        )
        assert mock_chunker.call_count == 1
        py_aug = fp_aug.get_skill_duration("Python")
        assert py_aug is not None
        # 01/2024 to 08/2026 = 32 months
        assert py_aug.verified_duration_months == 32

    # Month 2 (September 2026): Duration rolls over to 33 months, but TextChunker is NEVER called!
    with patch.object(TextChunker, "chunk_to_evidence_blocks", wraps=TextChunker.chunk_to_evidence_blocks) as mock_chunker:
        fp_sep = await get_or_create_cv_fingerprint_async(
            raw_text=DYNAMIC_CV,
            resume_id="cand_rollover",
            context=ctx_sep,
            parse_cache_service=parse_svc,
            duration_cache_service=dur_svc,
        )
        # CRITICAL ASSERTION: Zero re-parsing occurred!
        assert mock_chunker.call_count == 0

        py_sep = fp_sep.get_skill_duration("Python")
        assert py_sep is not None
        # 01/2024 to 09/2026 = 33 months
        assert py_sep.verified_duration_months == 33


# ==============================================================================
# 4. DURATION POLICY VERSION CHANGE (NO RE-PARSING)
# ==============================================================================

@pytest.mark.asyncio
async def test_duration_policy_change_does_not_reparse_cv(cache_backend: CacheBackend) -> None:
    """When duration_policy_version changes, duration is updated but CV parse cache is reused."""
    parse_svc = ParseCacheService(backend=cache_backend)
    dur_svc = DurationCacheService(backend=cache_backend)

    ctx_v1 = PipelineContext.create(as_of_date_override="2026-08-15", policy_version="v1")
    ctx_v2 = PipelineContext.create(as_of_date_override="2026-08-15", policy_version="v2_strict")

    # Policy v1 evaluation (Parse CV + Calculate v1 duration)
    with patch.object(TextChunker, "chunk_to_evidence_blocks", wraps=TextChunker.chunk_to_evidence_blocks) as mock_chunker:
        fp1 = await get_or_create_cv_fingerprint_async(
            raw_text=SAMPLE_CV,
            resume_id="cand_policy_test",
            context=ctx_v1,
            parse_cache_service=parse_svc,
            duration_cache_service=dur_svc,
        )
        assert mock_chunker.call_count == 1

    # Policy v2 evaluation (Reuses cached parse, calculates v2 duration, 0 parsing!)
    with patch.object(TextChunker, "chunk_to_evidence_blocks", wraps=TextChunker.chunk_to_evidence_blocks) as mock_chunker:
        fp2 = await get_or_create_cv_fingerprint_async(
            raw_text=SAMPLE_CV,
            resume_id="cand_policy_test",
            context=ctx_v2,
            parse_cache_service=parse_svc,
            duration_cache_service=dur_svc,
        )
        assert mock_chunker.call_count == 0  # Zero re-parsing
        assert fp2.content_hash == fp1.content_hash


# ==============================================================================
# 5. PARSER VERSION CHANGE INVALIDATES PARSE CACHE
# ==============================================================================

@pytest.mark.asyncio
async def test_parser_version_change_triggers_reparsing(cache_backend: CacheBackend) -> None:
    """When parser_version changes, stale parse cache is bypassed and fresh parsing runs."""
    parse_svc = ParseCacheService(backend=cache_backend)
    dur_svc = DurationCacheService(backend=cache_backend)

    # 1. Parse with parser version v1
    with patch.object(TextChunker, "chunk_to_evidence_blocks", wraps=TextChunker.chunk_to_evidence_blocks) as mock_chunker:
        fp_v1 = await get_or_create_cv_fingerprint_async(
            raw_text=SAMPLE_CV,
            resume_id="cand_pver_01",
            parser_version="v1",
            parse_cache_service=parse_svc,
            duration_cache_service=dur_svc,
        )
        assert mock_chunker.call_count == 1
        assert fp_v1.parser_version == "v1"

    # 2. Query with parser version v2 -> must NOT hit v1 parse cache, must trigger fresh parse
    with patch.object(TextChunker, "chunk_to_evidence_blocks", wraps=TextChunker.chunk_to_evidence_blocks) as mock_chunker:
        fp_v2 = await get_or_create_cv_fingerprint_async(
            raw_text=SAMPLE_CV,
            resume_id="cand_pver_01",
            parser_version="v2",
            parse_cache_service=parse_svc,
            duration_cache_service=dur_svc,
        )
        assert mock_chunker.call_count == 1
        assert fp_v2.parser_version == "v2"


# ==============================================================================
# 6. TENANT ISOLATION
# ==============================================================================

@pytest.mark.asyncio
async def test_tenant_isolation_on_identical_cv(cache_backend: CacheBackend) -> None:
    """Two different tenants uploading identical CVs have completely isolated parse cache entries."""
    parse_svc = ParseCacheService(backend=cache_backend)
    dur_svc = DurationCacheService(backend=cache_backend)

    # Tenant A parses CV
    fp_a = await get_or_create_cv_fingerprint_async(
        raw_text=SAMPLE_CV,
        resume_id="doc_a",
        tenant_id="tenant_alpha",
        parse_cache_service=parse_svc,
        duration_cache_service=dur_svc,
    )
    assert fp_a is not None

    # Tenant B parses identical CV
    fp_b = await get_or_create_cv_fingerprint_async(
        raw_text=SAMPLE_CV,
        resume_id="doc_b",
        tenant_id="tenant_beta",
        parse_cache_service=parse_svc,
        duration_cache_service=dur_svc,
    )
    assert fp_b is not None

    # Invalidate Tenant A's parse cache
    c_hash = compute_content_hash(SAMPLE_CV)
    await parse_svc.delete_parsed(resume_hash=c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_alpha")

    # Tenant A is now a MISS
    assert await parse_svc.get_parsed(c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_alpha") is None

    # Tenant B remains a HIT (isolated)
    cached_b = await parse_svc.get_parsed(c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_beta")
    assert cached_b is not None
    assert cached_b.content_hash == c_hash


# ==============================================================================
# 7. ZERO PII IN CACHE KEYS
# ==============================================================================

def test_no_pii_in_cache_keys() -> None:
    """Ensure candidate PII (names, emails, phones) is NEVER part of cache keys."""
    parse_svc = ParseCacheService()
    dur_svc = DurationCacheService()

    raw_text_with_pii = """
    NGUYỄN VĂN HÙNG
    Email: hung.nguyen@example.com
    Phone: 0912345678
    KINH NGHIỆM: Python Developer
    """
    c_hash = compute_content_hash(raw_text_with_pii)

    parse_key = parse_svc.build_key(resume_hash=c_hash, parser_version="v1", tenant_id="company_101")
    dur_key = dur_svc.build_key(fingerprint_hash=c_hash, duration_policy_version="v1", as_of_ym="2026-08")

    # Check key formats exactly match specification
    assert parse_key == f"cv_parse:company_101:{c_hash}:v1"
    assert dur_key == f"skill_duration:{c_hash}:v1:2026-08"

    # Verify absence of PII
    for pii in ["hung", "nguyen", "0912345678", "example.com"]:
        assert pii not in parse_key.lower()
        assert pii not in dur_key.lower()
