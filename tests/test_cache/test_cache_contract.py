"""Contract test suite for CacheBackend implementations.

Ensures that InMemoryCacheBackend and RedisCacheBackend fulfill the exact same
interface semantics and behavior guarantees.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio

from src.cache.base import CacheBackend
from src.cache.memory import InMemoryCacheBackend
from src.cache.redis import RedisCacheBackend
from src.models.cv_fingerprint import CVFingerprint
from tests.fixtures.cv_fixtures import CV_FIXTURES
from tests.test_cache.fake_redis import FakeAsyncRedis


@pytest_asyncio.fixture
async def memory_backend() -> AsyncGenerator[CacheBackend, None]:
    backend = InMemoryCacheBackend()
    yield backend
    await backend.close()


@pytest_asyncio.fixture
async def redis_backend() -> AsyncGenerator[CacheBackend, None]:
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


@pytest.mark.asyncio
async def test_get_missing_key_returns_none(cache_backend: CacheBackend) -> None:
    result = await cache_backend.get("non_existent_key_12345")
    assert result is None


@pytest.mark.asyncio
async def test_set_and_get_bytes(cache_backend: CacheBackend) -> None:
    key = "test:key:1"
    val = b"hello world payload"

    await cache_backend.set(key, val)
    result = await cache_backend.get(key)

    assert result == val
    assert isinstance(result, bytes)


@pytest.mark.asyncio
async def test_set_overwrites_existing_key(cache_backend: CacheBackend) -> None:
    key = "test:key:overwrite"
    val1 = b"first_value"
    val2 = b"second_value"

    await cache_backend.set(key, val1)
    assert await cache_backend.get(key) == val1

    await cache_backend.set(key, val2)
    assert await cache_backend.get(key) == val2


@pytest.mark.asyncio
async def test_delete_existing_key(cache_backend: CacheBackend) -> None:
    key = "test:key:to_delete"
    val = b"temporary_data"

    await cache_backend.set(key, val)
    assert await cache_backend.get(key) == val

    await cache_backend.delete(key)
    assert await cache_backend.get(key) is None


@pytest.mark.asyncio
async def test_delete_non_existent_key_does_not_fail(cache_backend: CacheBackend) -> None:
    # Deleting a non-existent key must succeed without exception
    await cache_backend.delete("key_that_does_not_exist")
    assert await cache_backend.get("key_that_does_not_exist") is None


@pytest.mark.asyncio
async def test_set_with_ttl_expiration(cache_backend: CacheBackend) -> None:
    key = "test:key:ttl"
    val = b"short_lived_data"

    # Set with 1 second TTL
    await cache_backend.set(key, val, ttl_seconds=1)
    assert await cache_backend.get(key) == val

    # Wait for expiration
    await asyncio.sleep(1.1)
    assert await cache_backend.get(key) is None


@pytest.mark.asyncio
async def test_set_with_zero_or_negative_ttl(cache_backend: CacheBackend) -> None:
    key = "test:key:expired_immediate"
    val = b"immediate_expiry"

    await cache_backend.set(key, val, ttl_seconds=0)
    assert await cache_backend.get(key) is None


@pytest.mark.asyncio
async def test_set_if_absent_on_missing_key(cache_backend: CacheBackend) -> None:
    key = "test:nx:missing"
    val = b"first_claim"

    success = await cache_backend.set_if_absent(key, val, ttl_seconds=60)
    assert success is True
    assert await cache_backend.get(key) == val


@pytest.mark.asyncio
async def test_set_if_absent_on_existing_key(cache_backend: CacheBackend) -> None:
    key = "test:nx:existing"
    val1 = b"original_value"
    val2 = b"competing_value"

    await cache_backend.set(key, val1)

    success = await cache_backend.set_if_absent(key, val2, ttl_seconds=60)
    assert success is False
    assert await cache_backend.get(key) == val1


@pytest.mark.asyncio
async def test_set_if_absent_on_expired_key(cache_backend: CacheBackend) -> None:
    key = "test:nx:expired"
    val1 = b"initial"
    val2 = b"renewed"

    await cache_backend.set(key, val1, ttl_seconds=1)
    await asyncio.sleep(1.1)

    # Key is expired -> set_if_absent should succeed
    success = await cache_backend.set_if_absent(key, val2, ttl_seconds=60)
    assert success is True
    assert await cache_backend.get(key) == val2


@pytest.mark.asyncio
async def test_binary_safety_empty_bytes(cache_backend: CacheBackend) -> None:
    key = "test:binary:empty"
    val = b""

    await cache_backend.set(key, val)
    result = await cache_backend.get(key)
    assert result == b""
    assert result is not None


@pytest.mark.asyncio
async def test_binary_safety_arbitrary_bytes(cache_backend: CacheBackend) -> None:
    key = "test:binary:special"
    val = b"\x00\x01\x02\xff\xfe\xfd\x00\xaa\x55"

    await cache_backend.set(key, val)
    result = await cache_backend.get(key)
    assert result == val


@pytest.mark.asyncio
async def test_utf8_multibyte_json_payload(cache_backend: CacheBackend) -> None:
    key = "test:utf8:diacritics"
    text = '{"name": "Nguyễn Văn Hùng", "skills": ["Phát triển Backend", "Trí tuệ nhân tạo"]}'
    val = text.encode("utf-8")

    await cache_backend.set(key, val)
    result = await cache_backend.get(key)
    assert result == val
    assert result.decode("utf-8") == text


@pytest.mark.asyncio
async def test_cv_fingerprint_serialization_roundtrip(cache_backend: CacheBackend) -> None:
    from src.chunking.fingerprint_cache import create_cv_fingerprint

    raw_text = CV_FIXTURES["python_in_experience_with_date_range"]["raw_text"]
    resume_id = "cand_contract_test_01"
    fp = create_cv_fingerprint(raw_text=raw_text, resume_id=resume_id)

    key = f"cv_fp:{fp.resume_id}:{fp.parser_version}:{fp.content_hash}"
    serialized_bytes = fp.model_dump_json().encode("utf-8")

    await cache_backend.set(key, serialized_bytes, ttl_seconds=3600)
    cached_bytes = await cache_backend.get(key)

    assert cached_bytes is not None
    fp_deserialized = CVFingerprint.model_validate_json(cached_bytes)

    assert fp_deserialized.resume_id == fp.resume_id
    assert fp_deserialized.content_hash == fp.content_hash
    assert len(fp_deserialized.evidence_blocks) == len(fp.evidence_blocks)
    assert len(fp_deserialized.experience_entries) == len(fp.experience_entries)
    assert len(fp_deserialized.normalized_skill_mentions) == len(fp.normalized_skill_mentions)


@pytest.mark.asyncio
async def test_type_error_on_non_bytes_value(cache_backend: CacheBackend) -> None:
    with pytest.raises(TypeError):
        await cache_backend.set("invalid_type_key", "string_not_bytes")  # type: ignore[arg-type]

    with pytest.raises(TypeError):
        await cache_backend.set_if_absent("invalid_type_key", 12345)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_acquire_and_release_lock_contract(cache_backend: CacheBackend) -> None:
    lock_key = "lock:test:contract_1"
    token_a = "worker_token_alpha"
    token_b = "worker_token_beta"
    token_c = "worker_token_gamma"

    # 1. Token A acquires lock
    assert await cache_backend.acquire_lock(lock_key, token_a, ttl_ms=5000) is True

    # 2. Token B cannot acquire lock while held by Token A
    assert await cache_backend.acquire_lock(lock_key, token_b, ttl_ms=5000) is False

    # 3. Token B cannot release Token A's lock
    assert await cache_backend.release_lock(lock_key, token_b) is False

    # 4. Lock is still held by Token A
    assert await cache_backend.acquire_lock(lock_key, token_c, ttl_ms=5000) is False

    # 5. Token A releases its own lock
    assert await cache_backend.release_lock(lock_key, token_a) is True

    # 6. Lock is now free for Token C to acquire
    assert await cache_backend.acquire_lock(lock_key, token_c, ttl_ms=5000) is True
    await cache_backend.release_lock(lock_key, token_c)


@pytest.mark.asyncio
async def test_lock_auto_expiry_contract(cache_backend: CacheBackend) -> None:
    lock_key = "lock:test:expiry"
    token_a = "worker_token_a"
    token_b = "worker_token_b"

    # Acquire with short TTL (50ms)
    assert await cache_backend.acquire_lock(lock_key, token_a, ttl_ms=50) is True

    # Cannot acquire immediately
    assert await cache_backend.acquire_lock(lock_key, token_b, ttl_ms=5000) is False

    # Wait for TTL to expire
    await asyncio.sleep(0.08)

    # After expiry, Token B can acquire
    assert await cache_backend.acquire_lock(lock_key, token_b, ttl_ms=5000) is True
    await cache_backend.release_lock(lock_key, token_b)


@pytest.mark.asyncio
async def test_close_backend(cache_backend: CacheBackend) -> None:
    await cache_backend.close()
