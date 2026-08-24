"""Unit tests specific to InMemoryCacheBackend."""

from __future__ import annotations

import asyncio

import pytest

from src.cache.memory import InMemoryCacheBackend


@pytest.mark.asyncio
async def test_in_memory_lru_eviction() -> None:
    backend = InMemoryCacheBackend(max_size=3)

    await backend.set("k1", b"v1")
    await backend.set("k2", b"v2")
    await backend.set("k3", b"v3")

    # Access k1 to make k2 the oldest
    assert await backend.get("k1") == b"v1"

    # Insert k4 -> should evict k2
    await backend.set("k4", b"v4")

    assert await backend.get("k2") is None
    assert await backend.get("k1") == b"v1"
    assert await backend.get("k3") == b"v3"
    assert await backend.get("k4") == b"v4"


@pytest.mark.asyncio
async def test_in_memory_defensive_copy() -> None:
    backend = InMemoryCacheBackend()
    mutable_val = bytearray(b"original_content")

    await backend.set("key_mut", bytes(mutable_val))
    # Mutate source
    mutable_val[0] = ord("X")

    # Cache should be unaffected
    cached = await backend.get("key_mut")
    assert cached == b"original_content"


@pytest.mark.asyncio
async def test_in_memory_concurrency_safety() -> None:
    backend = InMemoryCacheBackend(max_size=500)

    async def worker(worker_id: int) -> None:
        for i in range(20):
            k = f"worker:{worker_id}:{i % 5}"
            val = f"data_{worker_id}_{i}".encode()
            await backend.set(k, val, ttl_seconds=60)
            read_back = await backend.get(k)
            assert read_back is not None

    tasks = [worker(i) for i in range(10)]
    await asyncio.gather(*tasks)
    await backend.close()
