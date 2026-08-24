"""Unit tests specific to RedisCacheBackend."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from src.cache.redis import RedisCacheBackend
from tests.test_cache.fake_redis import FakeAsyncRedis


def test_redis_backend_lazy_initialization() -> None:
    """Ensure no ConnectionPool or Redis connection is created at __init__ time."""
    backend = RedisCacheBackend(redis_url="redis://localhost:6379/0")
    assert backend._client is None
    assert backend._pool is None


@pytest.mark.asyncio
async def test_redis_backend_custom_client_injection() -> None:
    fake_client = FakeAsyncRedis()
    backend = RedisCacheBackend(redis_client=fake_client)  # type: ignore[arg-type]

    await backend.set("inj_key", b"inj_value")
    assert await backend.get("inj_key") == b"inj_value"
    await backend.close()
    assert fake_client.closed is True


@pytest.mark.asyncio
async def test_redis_backend_uses_asyncio_redis() -> None:
    """Verify that RedisCacheBackend initializes redis.asyncio.Redis on first async access."""
    with patch("src.cache.redis.ConnectionPool.from_url") as mock_pool_cls, \
         patch("src.cache.redis.Redis") as mock_redis_cls:

        mock_pool = mock_pool_cls.return_value
        mock_pool.disconnect = AsyncMock()
        mock_client = AsyncMock()
        mock_client.get.return_value = b"mocked_val"
        mock_client.set.return_value = True
        mock_client.delete.return_value = 1
        mock_client.aclose = AsyncMock()
        mock_redis_cls.return_value = mock_client

        backend = RedisCacheBackend(redis_url="redis://localhost:6379/0")
        val = await backend.get("mock_key")

        assert val == b"mocked_val"
        mock_pool_cls.assert_called_once()
        mock_redis_cls.assert_called_once_with(connection_pool=mock_pool, decode_responses=False)

        await backend.close()
        mock_client.aclose.assert_awaited_once()
        mock_pool.disconnect.assert_awaited_once()
