"""Comprehensive tests for Distributed Single-Flight cache stampede protection."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio

from src.cache.base import CacheBackend
from src.cache.duration_cache import DurationCacheService
from src.cache.memory import InMemoryCacheBackend
from src.cache.parse_cache import ParseCacheService
from src.cache.pipeline import get_or_create_cv_fingerprint_async
from src.cache.redis import RedisCacheBackend
from src.chunking.fingerprint_cache import create_cv_fingerprint
from src.models.cv_fingerprint import CVFingerprint
from tests.fixtures.cv_fixtures import CV_FIXTURES
from tests.test_cache.fake_redis import FakeAsyncRedis

SAMPLE_CV = CV_FIXTURES["python_in_experience_with_date_range"]["raw_text"]
SAMPLE_CV_2 = CV_FIXTURES["python_in_skills_only"]["raw_text"]
SAMPLE_CV_3 = CV_FIXTURES["overlapping_jobs_cv"]["raw_text"]


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
# 1. CRUCIAL TEST: N CONCURRENT WORKERS -> PARSER CALLED EXACTLY 1 TIME
# ==============================================================================

@pytest.mark.asyncio
async def test_single_flight_thundering_herd_parses_exactly_once(cache_backend: CacheBackend) -> None:
    """N concurrent coroutines request the same uncached CV simultaneously.

    Assert:
    - Parser is executed EXACTLY 1 time.
    - All N requests receive the identical parsed CVFingerprint.
    """
    parse_svc = ParseCacheService(backend=cache_backend, retry_interval_ms=10, lock_ttl_ms=5000)
    dur_svc = DurationCacheService(backend=cache_backend)

    parse_call_count = 0

    def instrumented_parse() -> CVFingerprint:
        nonlocal parse_call_count
        parse_call_count += 1
        return create_cv_fingerprint(
            raw_text=SAMPLE_CV,
            resume_id="cand_single_flight_01",
            use_cache=False,
        )

    num_concurrent_workers = 25

    async def worker(worker_idx: int) -> CVFingerprint:
        # Small stagger to simulate real network concurrency
        await asyncio.sleep(0.001 * (worker_idx % 5))
        return await get_or_create_cv_fingerprint_async(
            raw_text=SAMPLE_CV,
            resume_id="cand_single_flight_01",
            tenant_id="tenant_sf",
            parse_cache_service=parse_svc,
            duration_cache_service=dur_svc,
            parse_fn=instrumented_parse,
        )

    # Launch all N coroutines concurrently
    tasks = [worker(i) for i in range(num_concurrent_workers)]
    results = await asyncio.gather(*tasks)

    # 1. CRITICAL ASSERTION: Parser was called EXACTLY 1 time!
    assert parse_call_count == 1, f"Expected parse_call_count == 1, but got {parse_call_count}"

    # 2. All N results are identical and valid
    assert len(results) == num_concurrent_workers
    first_hash = results[0].content_hash
    for fp in results:
        assert fp is not None
        assert fp.content_hash == first_hash
        assert len(fp.experience_entries) == len(results[0].experience_entries)


# ==============================================================================
# 2. LOCK OWNER RELEASE & PREVENT RELEASING ANOTHER WORKER'S LOCK
# ==============================================================================

@pytest.mark.asyncio
async def test_lock_release_only_by_owner(cache_backend: CacheBackend) -> None:
    """Ensure a worker cannot release or delete another worker's lock."""
    lock_key = "lock:cv_parse:tenant_sec:hash_123:v1"
    token_worker_1 = "token_worker_1"
    token_worker_2 = "token_worker_2"

    # Worker 1 acquires lock
    acquired_1 = await cache_backend.acquire_lock(lock_key, token_worker_1, ttl_ms=5000)
    assert acquired_1 is True

    # Worker 2 attempts to acquire -> rejected
    acquired_2 = await cache_backend.acquire_lock(lock_key, token_worker_2, ttl_ms=5000)
    assert acquired_2 is False

    # Worker 2 attempts to release Worker 1's lock -> MUST FAIL
    released_by_2 = await cache_backend.release_lock(lock_key, token_worker_2)
    assert released_by_2 is False

    # Lock must STILL be held (Worker 2 cannot acquire)
    assert await cache_backend.acquire_lock(lock_key, token_worker_2, ttl_ms=5000) is False

    # Worker 1 releases its own lock -> SUCCEEDS
    released_by_1 = await cache_backend.release_lock(lock_key, token_worker_1)
    assert released_by_1 is True

    # Now Worker 2 can acquire lock
    assert await cache_backend.acquire_lock(lock_key, token_worker_2, ttl_ms=5000) is True
    await cache_backend.release_lock(lock_key, token_worker_2)


# ==============================================================================
# 3. WORKER CRASH / LOCK EXPIRATION RECOVERY
# ==============================================================================

@pytest.mark.asyncio
async def test_worker_crash_and_lock_expiry_recovery(cache_backend: CacheBackend) -> None:
    """When lock owner crashes without releasing or setting cache, waiting worker takes over."""
    parse_svc = ParseCacheService(
        backend=cache_backend,
        lock_ttl_ms=80,       # Short 80ms TTL for test speed
        retry_interval_ms=15, # 15ms poll interval
        max_wait_ms=3000,
    )
    dur_svc = DurationCacheService(backend=cache_backend)

    cache_key = parse_svc.build_key(
        resume_hash=create_cv_fingerprint(SAMPLE_CV).content_hash,
        tenant_id="tenant_crash",
    )
    lock_key = f"lock:{cache_key}"

    # Simulate crashed worker acquiring lock and then disappearing
    crashed_token = "crashed_worker_token"
    await cache_backend.acquire_lock(lock_key, crashed_token, ttl_ms=80)

    # Worker 2 attempts to get_or_parse -> waits until 80ms lock expires -> acquires lock and completes parse
    fp = await get_or_create_cv_fingerprint_async(
        raw_text=SAMPLE_CV,
        resume_id="cand_recovery",
        tenant_id="tenant_crash",
        parse_cache_service=parse_svc,
        duration_cache_service=dur_svc,
    )

    assert fp is not None
    assert fp.resume_id == "cand_recovery"
    # Verify parse cache is now populated
    cached_fp = await parse_svc.get_parsed(
        resume_hash=fp.content_hash,
        tenant_id="tenant_crash",
    )
    assert cached_fp is not None


# ==============================================================================
# 4. CONCURRENT CACHE MISS ACROSS DISTINCT CVS (NO CROSS-BLOCKING)
# ==============================================================================

@pytest.mark.asyncio
async def test_concurrent_cache_miss_distinct_cvs(cache_backend: CacheBackend) -> None:
    """30 workers querying 3 distinct CVs concurrently parse each distinct CV exactly 1 time."""
    parse_svc = ParseCacheService(backend=cache_backend, retry_interval_ms=10)
    dur_svc = DurationCacheService(backend=cache_backend)

    cv_sources = [SAMPLE_CV, SAMPLE_CV_2, SAMPLE_CV_3]
    parse_counts = [0, 0, 0]

    def make_parse_fn(idx: int):
        def _parse():
            parse_counts[idx] += 1
            return create_cv_fingerprint(cv_sources[idx], resume_id=f"cand_multi_{idx}", use_cache=False)
        return _parse

    tasks = []
    # 10 workers for each of the 3 CVs
    for cv_idx in range(3):
        p_fn = make_parse_fn(cv_idx)
        for worker_idx in range(10):
            t = get_or_create_cv_fingerprint_async(
                raw_text=cv_sources[cv_idx],
                resume_id=f"cand_multi_{cv_idx}",
                tenant_id="tenant_multi",
                parse_cache_service=parse_svc,
                duration_cache_service=dur_svc,
                parse_fn=p_fn,
            )
            tasks.append(t)

    results = await asyncio.gather(*tasks)
    assert len(results) == 30

    # Each CV was parsed EXACTLY 1 time
    assert parse_counts == [1, 1, 1], f"Expected parse counts [1, 1, 1], got {parse_counts}"


# ==============================================================================
# 5. CACHE POPULATED WHILE WAITING (DOUBLE-CHECKED LOCKING)
# ==============================================================================

@pytest.mark.asyncio
async def test_cache_populated_while_waiting(cache_backend: CacheBackend) -> None:
    """Worker in wait loop picks up cache populated by another worker on next tick."""
    parse_svc = ParseCacheService(backend=cache_backend, retry_interval_ms=20, lock_ttl_ms=5000)

    c_hash = create_cv_fingerprint(SAMPLE_CV).content_hash
    lock_key = f"lock:{parse_svc.build_key(resume_hash=c_hash, tenant_id='tenant_pop')}"

    # Lock acquired by Worker 1
    w1_token = "worker_1_token"
    await cache_backend.acquire_lock(lock_key, w1_token, ttl_ms=5000)

    # Worker 1 simulates writing to cache after 40ms
    async def simulate_worker_1_writer():
        await asyncio.sleep(0.04)
        fp1 = create_cv_fingerprint(SAMPLE_CV, resume_id="cand_w1", use_cache=False)
        await parse_svc.set_parsed(fp1, tenant_id="tenant_pop")
        await cache_backend.release_lock(lock_key, w1_token)

    worker_2_parse_count = 0

    def worker_2_parse():
        nonlocal worker_2_parse_count
        worker_2_parse_count += 1
        return create_cv_fingerprint(SAMPLE_CV, resume_id="cand_w2", use_cache=False)

    async def worker_2_reader():
        return await parse_svc.get_or_parse(
            raw_text=SAMPLE_CV,
            resume_id="cand_w2",
            tenant_id="tenant_pop",
            parse_fn=worker_2_parse,
        )

    w1_task = asyncio.create_task(simulate_worker_1_writer())
    w2_task = asyncio.create_task(worker_2_reader())

    await asyncio.gather(w1_task, w2_task)
    fp_result = w2_task.result()

    assert fp_result is not None
    # Worker 2 must NOT have parsed because it picked up Worker 1's cached result
    assert worker_2_parse_count == 0


# ==============================================================================
# 6. REDIS ERROR RESILIENCE (GRACEFUL FALLBACK)
# ==============================================================================

@pytest.mark.asyncio
async def test_redis_error_graceful_fallback() -> None:
    """When Redis errors occur during acquire_lock, system falls back to direct parse safely."""
    failing_backend = AsyncMock(spec=CacheBackend)
    failing_backend.get.return_value = None
    failing_backend.acquire_lock.side_effect = RuntimeError("Redis connection timeout simulated")
    failing_backend.set_parsed = AsyncMock()

    parse_svc = ParseCacheService(backend=failing_backend)

    parse_called = False

    def custom_parse() -> CVFingerprint:
        nonlocal parse_called
        parse_called = True
        return create_cv_fingerprint(SAMPLE_CV, resume_id="cand_resilient", use_cache=False)

    fp = await parse_svc.get_or_parse(
        raw_text=SAMPLE_CV,
        resume_id="cand_resilient",
        parse_fn=custom_parse,
    )

    assert fp is not None
    assert parse_called is True
    assert fp.resume_id == "cand_resilient"
