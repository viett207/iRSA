"""Cache backend lifecycle manager for FastAPI and Gunicorn workers."""

from __future__ import annotations

import logging
from typing import Any

from src.cache.base import CacheBackend
from src.cache.memory import InMemoryCacheBackend
from src.cache.redis import RedisCacheBackend

logger = logging.getLogger(__name__)

_ACTIVE_BACKEND: CacheBackend | None = None


def get_cache_backend() -> CacheBackend:
    """Return the active CacheBackend for the current worker process.

    Defaults to InMemoryCacheBackend if not explicitly initialized in lifespan.
    """
    global _ACTIVE_BACKEND
    if _ACTIVE_BACKEND is None:
        _ACTIVE_BACKEND = InMemoryCacheBackend()
    return _ACTIVE_BACKEND


def set_cache_backend(backend: CacheBackend | None) -> None:
    """Explicitly override the active CacheBackend (useful for tests or dependency injection)."""
    global _ACTIVE_BACKEND
    _ACTIVE_BACKEND = backend


async def init_cache(
    backend_type: str = "memory",
    redis_url: str | None = None,
    **kwargs: Any,
) -> CacheBackend:
    """Initialize the cache backend during the worker lifespan startup.

    Guarantees:
    - Executed inside the worker's own event loop after Gunicorn fork.
    - Previous backend resources are cleanly closed before re-initializing.
    """
    global _ACTIVE_BACKEND

    if _ACTIVE_BACKEND is not None:
        try:
            await _ACTIVE_BACKEND.close()
        except Exception as exc:
            logger.warning("Error closing previous cache backend: %s", exc)

    norm_type = (backend_type or "memory").strip().lower()
    if norm_type == "redis":
        backend: CacheBackend = RedisCacheBackend(
            redis_url=redis_url or "redis://localhost:6379/0",
            **kwargs,
        )
    else:
        backend = InMemoryCacheBackend(**kwargs)

    _ACTIVE_BACKEND = backend
    logger.info("Initialized cache backend: %s", type(backend).__name__)
    return backend


async def close_cache() -> None:
    """Close the active cache backend on worker shutdown."""
    global _ACTIVE_BACKEND
    if _ACTIVE_BACKEND is not None:
        try:
            await _ACTIVE_BACKEND.close()
        except Exception as exc:
            logger.warning("Error closing cache backend on shutdown: %s", exc)
        finally:
            _ACTIVE_BACKEND = None
