"""In-Memory cache backend implementation with TTL and LRU-style capacity bounding."""

from __future__ import annotations

import asyncio
import time
from collections import OrderedDict
from typing import NamedTuple

from src.cache.base import CacheBackend


class _MemoryEntry(NamedTuple):
    value: bytes
    expires_at: float | None


class InMemoryCacheBackend(CacheBackend):
    """In-memory thread- and asyncio-safe key-value cache backend with TTL and capacity limits."""

    def __init__(self, max_size: int = 10000) -> None:
        self._max_size = max_size
        self._store: OrderedDict[str, _MemoryEntry] = OrderedDict()
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> bytes | None:
        """Retrieve a binary value for key, removing it if expired."""
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if entry.expires_at is not None and time.time() > entry.expires_at:
                del self._store[key]
                return None
            self._store.move_to_end(key)
            return bytes(entry.value)

    async def set(self, key: str, value: bytes, ttl_seconds: int | None = None) -> None:
        """Store a binary value with optional TTL in seconds, evicting oldest if full."""
        if not isinstance(value, (bytes, bytearray)):
            raise TypeError(f"Value must be bytes or bytearray, got {type(value).__name__}")
        byte_val = bytes(value)
        expires_at = (time.time() + ttl_seconds) if (ttl_seconds is not None and ttl_seconds > 0) else None
        if ttl_seconds is not None and ttl_seconds <= 0:
            # If explicit TTL <= 0, item expires immediately
            expires_at = time.time() - 1.0

        async with self._lock:
            if key in self._store:
                self._store[key] = _MemoryEntry(value=byte_val, expires_at=expires_at)
                self._store.move_to_end(key)
                return

            if len(self._store) >= self._max_size:
                self._store.popitem(last=False)

            self._store[key] = _MemoryEntry(value=byte_val, expires_at=expires_at)

    async def delete(self, key: str) -> None:
        """Remove a key from in-memory cache if present."""
        async with self._lock:
            self._store.pop(key, None)

    async def set_if_absent(self, key: str, value: bytes, ttl_seconds: int | None = None) -> bool:
        """Atomically set key if absent or expired."""
        if not isinstance(value, (bytes, bytearray)):
            raise TypeError(f"Value must be bytes or bytearray, got {type(value).__name__}")
        byte_val = bytes(value)
        now = time.time()
        expires_at = (now + ttl_seconds) if (ttl_seconds is not None and ttl_seconds > 0) else None
        if ttl_seconds is not None and ttl_seconds <= 0:
            expires_at = now - 1.0

        async with self._lock:
            entry = self._store.get(key)
            if entry is not None:
                if entry.expires_at is None or now <= entry.expires_at:
                    return False
                # If expired, remove it first
                del self._store[key]

            if len(self._store) >= self._max_size:
                self._store.popitem(last=False)

            self._store[key] = _MemoryEntry(value=byte_val, expires_at=expires_at)
            return True

    async def acquire_lock(self, lock_key: str, owner_token: str, ttl_ms: int) -> bool:
        """Atomically acquire mutex lock in memory with millisecond TTL."""
        now = time.time()
        expires_at = now + (ttl_ms / 1000.0) if ttl_ms > 0 else now
        token_bytes = owner_token.encode("utf-8")

        async with self._lock:
            entry = self._store.get(lock_key)
            if entry is not None:
                if entry.expires_at is None or now <= entry.expires_at:
                    return False  # Lock already held by another worker
                # Lock expired -> remove stale lock entry
                del self._store[lock_key]

            self._store[lock_key] = _MemoryEntry(value=token_bytes, expires_at=expires_at)
            return True

    async def release_lock(self, lock_key: str, owner_token: str) -> bool:
        """Atomically release lock only if current value matches owner_token."""
        token_bytes = owner_token.encode("utf-8")
        now = time.time()

        async with self._lock:
            entry = self._store.get(lock_key)
            if entry is None:
                return False
            if entry.expires_at is not None and now > entry.expires_at:
                del self._store[lock_key]
                return False
            if entry.value == token_bytes:
                del self._store[lock_key]
                return True
            return False

    async def close(self) -> None:
        """Clear the store on shutdown."""
        async with self._lock:
            self._store.clear()
