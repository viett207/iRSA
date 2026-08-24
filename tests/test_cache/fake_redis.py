"""High-fidelity in-memory fake for redis.asyncio.Redis to run contract tests without Redis daemon."""

from __future__ import annotations

import asyncio
import time
from typing import NamedTuple


class _FakeEntry(NamedTuple):
    value: bytes
    expires_at: float | None


class FakeAsyncRedis:
    """Simulates redis.asyncio.Redis operations for contract testing."""

    def __init__(self) -> None:
        self._store: dict[str, _FakeEntry] = {}
        self._lock = asyncio.Lock()
        self.closed: bool = False

    def _normalize_key(self, key: str | bytes) -> str:
        if isinstance(key, bytes):
            return key.decode("utf-8")
        return str(key)

    async def get(self, key: str | bytes) -> bytes | None:
        async with self._lock:
            k = self._normalize_key(key)
            entry = self._store.get(k)
            if entry is None:
                return None
            if entry.expires_at is not None and time.time() > entry.expires_at:
                del self._store[k]
                return None
            return entry.value

    async def set(
        self,
        name: str | bytes,
        value: bytes | str,
        ex: int | None = None,
        px: int | None = None,
        nx: bool = False,
        xx: bool = False,
    ) -> bool | None:
        k = self._normalize_key(name)
        val_bytes = value.encode("utf-8") if isinstance(value, str) else bytes(value)

        now = time.time()
        expires_at: float | None = None
        if ex is not None:
            if ex <= 0:
                raise ValueError("ERR invalid expire time in 'set' command")
            expires_at = now + ex
        elif px is not None:
            if px <= 0:
                raise ValueError("ERR invalid expire time in 'set' command")
            expires_at = now + (px / 1000.0)

        async with self._lock:
            entry = self._store.get(k)
            is_present = entry is not None and (entry.expires_at is None or now <= entry.expires_at)

            if nx and is_present:
                return None  # Redis returns nil when NX condition fails
            if xx and not is_present:
                return None

            self._store[k] = _FakeEntry(value=val_bytes, expires_at=expires_at)
            return True

    async def delete(self, *names: str | bytes) -> int:
        deleted = 0
        async with self._lock:
            for name in names:
                k = self._normalize_key(name)
                if k in self._store:
                    del self._store[k]
                    deleted += 1
        return deleted

    async def eval(self, script: str, numkeys: int, *keys_and_args: str | bytes | int) -> int:
        """Simulate Redis Lua script execution for lock release and custom scripts."""
        if "redis.call(\"get\", KEYS[1]) == ARGV[1]" in script or "redis.call('get', KEYS[1]) == ARGV[1]" in script:
            lock_key = self._normalize_key(keys_and_args[0])
            owner_token = keys_and_args[1]
            token_bytes = owner_token if isinstance(owner_token, bytes) else str(owner_token).encode("utf-8")

            now = time.time()
            async with self._lock:
                entry = self._store.get(lock_key)
                if entry is None:
                    return 0
                if entry.expires_at is not None and now > entry.expires_at:
                    del self._store[lock_key]
                    return 0
                if entry.value == token_bytes:
                    del self._store[lock_key]
                    return 1
                return 0
        return 0

    async def aclose(self) -> None:
        self.closed = True

    async def close(self) -> None:
        self.closed = True

    async def ping(self) -> bool:
        return True
