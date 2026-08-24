"""Unit tests for cache backend lifecycle management across FastAPI apps."""

from __future__ import annotations

import pytest

from src.cache.manager import (
    close_cache,
    get_cache_backend,
    init_cache,
    set_cache_backend,
)
from src.cache.memory import InMemoryCacheBackend
from src.cache.redis import RedisCacheBackend


@pytest.mark.asyncio
async def test_init_and_close_memory_backend() -> None:
    set_cache_backend(None)

    backend = await init_cache(backend_type="memory")
    assert isinstance(backend, InMemoryCacheBackend)
    assert get_cache_backend() is backend

    await close_cache()
    # After close, calling get_cache_backend creates fresh default memory backend
    fresh = get_cache_backend()
    assert isinstance(fresh, InMemoryCacheBackend)
    assert fresh is not backend


@pytest.mark.asyncio
async def test_init_redis_backend() -> None:
    set_cache_backend(None)

    backend = await init_cache(backend_type="redis", redis_url="redis://localhost:6379/1")
    assert isinstance(backend, RedisCacheBackend)
    assert get_cache_backend() is backend

    await close_cache()


@pytest.mark.asyncio
async def test_override_cache_backend() -> None:
    custom_backend = InMemoryCacheBackend(max_size=50)
    set_cache_backend(custom_backend)
    assert get_cache_backend() is custom_backend
    set_cache_backend(None)


@pytest.mark.asyncio
async def test_fastapi_src_main_lifespan() -> None:
    """Verify src.main lifespan initializes and closes cache backend."""
    from src.main import app, lifespan

    async with lifespan(app):
        active = get_cache_backend()
        assert active is not None
        assert isinstance(active, (InMemoryCacheBackend, RedisCacheBackend))


@pytest.mark.asyncio
async def test_fastapi_backend_main_lifespan() -> None:
    """Verify backend.app.main lifespan initializes and closes cache backend."""
    from backend.app.main import app, lifespan

    async with lifespan(app):
        active = get_cache_backend()
        assert active is not None
        assert isinstance(active, (InMemoryCacheBackend, RedisCacheBackend))
