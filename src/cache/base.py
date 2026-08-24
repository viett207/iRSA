"""Minimal async cache abstraction for CV evaluation pipeline.

Defines the CacheBackend interface for pluggable cache storage
(e.g., InMemory, Redis) with async/await support.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class CacheBackend(ABC):
    """Abstract base class for asynchronous key-value cache backends.

    Minimal interface:
    - async get(key) -> bytes | None
    - async set(key, value, ttl_seconds)
    - async delete(key)
    - async set_if_absent(key, value, ttl_seconds) -> bool
    """

    @abstractmethod
    async def get(self, key: str) -> bytes | None:
        """Retrieve the binary value for a key from cache.

        Args:
            key: Cache key string.

        Returns:
            The raw bytes if key exists and is not expired, otherwise None.
        """
        ...

    @abstractmethod
    async def set(self, key: str, value: bytes, ttl_seconds: int | None = None) -> None:
        """Store a binary value with an optional time-to-live in seconds.

        Args:
            key: Cache key string.
            value: Raw binary data to cache.
            ttl_seconds: Optional expiration duration in seconds.
        """
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete a key from the cache if it exists.

        Args:
            key: Cache key string to remove.
        """
        ...

    @abstractmethod
    async def set_if_absent(self, key: str, value: bytes, ttl_seconds: int | None = None) -> bool:
        """Atomically set key to value only if key does not already exist (NX).

        Args:
            key: Cache key string.
            value: Raw binary data to store.
            ttl_seconds: Optional expiration duration in seconds.

        Returns:
            True if key was set (did not previously exist), False if key already exists.
        """
        ...

    @abstractmethod
    async def acquire_lock(self, lock_key: str, owner_token: str, ttl_ms: int) -> bool:
        """Attempt to acquire a distributed mutex lock with millisecond TTL.

        Args:
            lock_key: Unique lock key string (e.g., 'lock:cv_parse:...').
            owner_token: Unique identifier for the lock owner.
            ttl_ms: Time-to-live in milliseconds before auto-release.

        Returns:
            True if lock was acquired, False if already held by another worker.
        """
        ...

    @abstractmethod
    async def release_lock(self, lock_key: str, owner_token: str) -> bool:
        """Atomically release distributed mutex lock only if held by owner_token.

        Args:
            lock_key: Unique lock key string.
            owner_token: Unique identifier for the lock owner.

        Returns:
            True if lock was held and released, False if not held or held by another owner.
        """
        ...

    async def close(self) -> None:
        """Close connection pools or cleanup resources on worker shutdown."""
        pass
