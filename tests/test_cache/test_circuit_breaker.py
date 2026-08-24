"""Comprehensive reliability, Circuit Breaker, and Redis failure fallback tests.

Verifies:
1. Redis operation timeout does not hang the request.
2. Redis connection failure triggers fallback to InMemory.
3. Circuit breaker transitions: CLOSED -> OPEN after consecutive failures.
4. Circuit OPEN immediately bypasses Redis without waiting.
5. Circuit transitions to HALF_OPEN after recovery timeout.
6. Successful probe in HALF_OPEN recovers circuit to CLOSED.
7. Failed probe in HALF_OPEN reopens circuit to OPEN.
8. Pipeline availability: CV evaluation completes successfully even when Redis is down.
9. Zero PII stored in metrics.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

import pytest

from src.cache.circuit_breaker import CircuitBreaker, CircuitState
from src.cache.duration_cache import DurationCacheService
from src.cache.metrics import get_cache_metrics, reset_cache_metrics
from src.cache.parse_cache import ParseCacheService
from src.cache.pipeline import get_or_create_cv_fingerprint_async
from src.cache.redis import RedisCacheBackend
from tests.fixtures.cv_fixtures import CV_FIXTURES
from tests.test_cache.fake_redis import FakeAsyncRedis

SAMPLE_CV = CV_FIXTURES["python_in_experience_with_date_range"]["raw_text"]


@pytest.fixture(autouse=True)
def clean_metrics() -> None:
    reset_cache_metrics()


# ==============================================================================
# 1. REDIS OPERATION TIMEOUT
# ==============================================================================

@pytest.mark.asyncio
async def test_redis_operation_timeout_fallback() -> None:
    """A hanging Redis call is aborted after op_timeout and falls back to InMemory."""
    mock_redis = AsyncMock()

    # Simulate hanging Redis operation (sleeps 5 seconds)
    async def hanging_get(key: str) -> bytes | None:
        await asyncio.sleep(5.0)
        return b"slow_data"

    mock_redis.get.side_effect = hanging_get

    cb = CircuitBreaker(failure_threshold=3, recovery_timeout_seconds=2.0)
    backend = RedisCacheBackend(
        redis_client=mock_redis,
        op_timeout=0.05,  # 50ms short timeout
        circuit_breaker=cb,
    )

    # Should not wait 5 seconds; should timeout in ~50ms and return None from fallback
    start_t = asyncio.get_event_loop().time()
    val = await backend.get("test:timeout:key")
    elapsed = asyncio.get_event_loop().time() - start_t

    assert val is None
    assert elapsed < 0.5  # Bounded fast failure
    assert cb._consecutive_failures == 1
    metrics = get_cache_metrics()
    assert metrics.redis_error == 1
    assert metrics.redis_fallback_count == 1

    await backend.close()


# ==============================================================================
# 2. CIRCUIT BREAKER TRANSITIONS: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
# ==============================================================================

@pytest.mark.asyncio
async def test_circuit_breaker_full_lifecycle() -> None:
    """Test state machine: CLOSED -> OPEN -> HALF_OPEN -> CLOSED on recovery."""
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout_seconds=0.1, success_threshold=1)

    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True

    # 1. Record 2 failures -> remains CLOSED
    cb.record_failure(RuntimeError("fail 1"))
    cb.record_failure(RuntimeError("fail 2"))
    assert cb.state == CircuitState.CLOSED

    # 2. 3rd failure -> trips to OPEN
    cb.record_failure(RuntimeError("fail 3"))
    assert cb.state == CircuitState.OPEN
    assert cb.can_execute() is False

    # 3. Wait for recovery timeout (100ms)
    await asyncio.sleep(0.12)
    assert cb.state == CircuitState.HALF_OPEN
    assert cb.can_execute() is True

    # 4. Probe succeeds -> recovers to CLOSED
    cb.record_success()
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True


@pytest.mark.asyncio
async def test_circuit_breaker_half_open_probe_failure_reopens() -> None:
    """When a probe in HALF_OPEN fails, circuit immediately returns to OPEN."""
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout_seconds=0.05)

    cb.record_failure(RuntimeError("err 1"))
    cb.record_failure(RuntimeError("err 2"))
    assert cb.state == CircuitState.OPEN

    await asyncio.sleep(0.06)
    assert cb.state == CircuitState.HALF_OPEN

    # Probe fails -> immediately OPEN again
    cb.record_failure(RuntimeError("probe failed"))
    assert cb.state == CircuitState.OPEN
    assert cb.can_execute() is False


# ==============================================================================
# 3. CIRCUIT OPEN BYPASSES REDIS
# ==============================================================================

@pytest.mark.asyncio
async def test_circuit_open_bypasses_redis_calls() -> None:
    """When circuit is OPEN, Redis client is not called on subsequent operations."""
    mock_redis = AsyncMock()
    mock_redis.get.side_effect = RuntimeError("Redis down")

    cb = CircuitBreaker(failure_threshold=2, recovery_timeout_seconds=10.0)
    backend = RedisCacheBackend(redis_client=mock_redis, op_timeout=0.1, circuit_breaker=cb)

    # 2 failures trip circuit to OPEN
    await backend.get("key1")
    await backend.get("key2")
    assert cb.state == CircuitState.OPEN
    assert mock_redis.get.call_count == 2

    # 3rd get when OPEN -> Redis client is NOT called at all
    val = await backend.get("key3")
    assert val is None
    assert mock_redis.get.call_count == 2  # No new calls to Redis

    await backend.close()


# ==============================================================================
# 4. PIPELINE AVAILABILITY DURING REDIS OUTAGE
# ==============================================================================

@pytest.mark.asyncio
async def test_pipeline_runs_seamlessly_when_redis_is_down() -> None:
    """CV evaluation pipeline continues to operate correctly when Redis fails completely."""
    failing_redis = AsyncMock()
    failing_redis.get.side_effect = ConnectionRefusedError("Connection to Redis refused")
    failing_redis.set.side_effect = ConnectionRefusedError("Connection to Redis refused")
    failing_redis.eval.side_effect = ConnectionRefusedError("Connection to Redis refused")

    cb = CircuitBreaker(failure_threshold=2, recovery_timeout_seconds=5.0)
    backend = RedisCacheBackend(
        redis_client=failing_redis,
        op_timeout=0.05,
        circuit_breaker=cb,
    )

    parse_svc = ParseCacheService(backend=backend)
    dur_svc = DurationCacheService(backend=backend)

    # Evaluation 1: Redis is failing, pipeline parses and uses in-memory fallback
    fp1 = await get_or_create_cv_fingerprint_async(
        raw_text=SAMPLE_CV,
        resume_id="cand_redis_down_01",
        tenant_id="tenant_outage",
        parse_cache_service=parse_svc,
        duration_cache_service=dur_svc,
    )

    assert fp1 is not None
    assert fp1.resume_id == "cand_redis_down_01"
    assert cb.state == CircuitState.OPEN

    # Evaluation 2: Circuit is OPEN, pipeline serves from in-memory fallback smoothly
    fp2 = await get_or_create_cv_fingerprint_async(
        raw_text=SAMPLE_CV,
        resume_id="cand_redis_down_02",
        tenant_id="tenant_outage",
        parse_cache_service=parse_svc,
        duration_cache_service=dur_svc,
    )

    assert fp2 is not None
    assert fp2.content_hash == fp1.content_hash

    metrics = get_cache_metrics()
    assert metrics.redis_error >= 1
    assert metrics.redis_fallback_count >= 1
    assert metrics.parse_count == 1  # 1st evaluation parsed, 2nd hit in-memory fallback

    await backend.close()


# ==============================================================================
# 5. METRICS AND PRIVACY (ZERO PII)
# ==============================================================================

def test_metrics_zero_pii() -> None:
    """Verify metrics dictionary contains strictly operational stats without PII."""
    metrics = get_cache_metrics()
    metrics.increment("cache_hit", 10)
    metrics.increment("cache_miss", 2)
    metrics.increment("redis_error", 1)
    metrics.increment("redis_fallback_count", 1)
    metrics.increment("lock_acquired", 2)
    metrics.increment("lock_wait", 1)
    metrics.increment("parse_count", 2)
    metrics.record_redis_latency(15.5)

    data = metrics.to_dict()
    assert data["cache_hit"] == 10
    assert data["cache_miss"] == 2
    assert data["redis_error"] == 1
    assert data["redis_fallback_count"] == 1
    assert data["lock_acquired"] == 2
    assert data["lock_wait"] == 1
    assert data["parse_count"] == 2
    assert data["avg_redis_latency_ms"] == 15.5

    # Check key types and structure
    for key, value in data.items():
        assert isinstance(key, str)
        assert isinstance(value, (int, float))


# ==============================================================================
# 6. AUTO WRITE-THROUGH SYNC AFTER RECOVERY
# ==============================================================================

@pytest.mark.asyncio
async def test_auto_write_through_sync_after_recovery() -> None:
    """When Redis recovers, reading an item written to fallback during outage syncs it to Redis."""
    fake_redis = FakeAsyncRedis()
    cb = CircuitBreaker(failure_threshold=1, recovery_timeout_seconds=0.05)
    backend = RedisCacheBackend(redis_client=fake_redis, circuit_breaker=cb)  # type: ignore[arg-type]

    key = "sync_test_key"
    payload = b"persisted_during_outage"

    # 1. Simulate outage: write directly to local fallback
    await backend._fallback_backend.set(key, payload)

    # Redis store is currently empty
    assert await fake_redis.get(key) is None

    # 2. Redis is healthy (Circuit CLOSED). Reading key should fetch from fallback AND write to Redis
    res = await backend.get(key)
    assert res == payload

    # 3. Redis is now populated via write-through sync!
    assert await fake_redis.get(key) == payload

    await backend.close()
