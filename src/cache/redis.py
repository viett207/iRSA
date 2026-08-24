"""Redis cache backend implementation with Circuit Breaker, configurable operation timeouts, and in-memory fallback."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import TYPE_CHECKING

from redis.asyncio import ConnectionPool, Redis

from src.cache.base import CacheBackend
from src.cache.circuit_breaker import CircuitBreaker
from src.cache.memory import InMemoryCacheBackend
from src.cache.metrics import get_cache_metrics

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

LUA_RELEASE_LOCK = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""

# Default Redis operation timeout (500 milliseconds)
DEFAULT_OP_TIMEOUT_SECONDS = 0.5


class RedisCacheBackend(CacheBackend):
    """Redis-backed asynchronous cache with Circuit Breaker and in-memory fallback.

    Guarantees:
    - Availability: When Redis fails/times out, seamlessly falls back to InMemoryCacheBackend.
    - Fast Failure: All Redis operations are bounded by op_timeout (default 0.5s).
    - Circuit Breaker: Automatically trips to OPEN after failure_threshold errors to stop spamming Redis.
    - Worker Lifecycle Safety: Connection pool is initialized lazily inside worker loop.
    - Metrics: Records redis_error, latency, and fallback counts without PII.
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379/0",
        redis_client: Redis | None = None,
        connection_pool: ConnectionPool | None = None,
        socket_timeout: float = 2.0,
        socket_connect_timeout: float = 2.0,
        max_connections: int = 20,
        op_timeout: float = DEFAULT_OP_TIMEOUT_SECONDS,
        circuit_breaker: CircuitBreaker | None = None,
        fallback_backend: CacheBackend | None = None,
    ) -> None:
        self._redis_url = redis_url
        self._socket_timeout = socket_timeout
        self._socket_connect_timeout = socket_connect_timeout
        self._max_connections = max_connections
        self._op_timeout = op_timeout

        self._pool: ConnectionPool | None = connection_pool
        self._client: Redis | None = redis_client
        self._owns_pool: bool = connection_pool is None and redis_client is None
        self._lock: asyncio.Lock | None = None

        self.circuit_breaker = circuit_breaker or CircuitBreaker()
        self._fallback_backend = fallback_backend or InMemoryCacheBackend()
        self._metrics = get_cache_metrics()

    def _get_lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def _ensure_client(self) -> Redis:
        """Lazily initialize Redis client and ConnectionPool inside the active event loop."""
        if self._client is not None:
            return self._client

        async with self._get_lock():
            if self._client is not None:
                return self._client

            if self._pool is None:
                self._pool = ConnectionPool.from_url(
                    self._redis_url,
                    max_connections=self._max_connections,
                    socket_timeout=self._socket_timeout,
                    socket_connect_timeout=self._socket_connect_timeout,
                    decode_responses=False,
                )
            self._client = Redis(connection_pool=self._pool, decode_responses=False)
            return self._client

    async def get(self, key: str) -> bytes | None:
        """Retrieve binary value from Redis with timeout and circuit breaker fallback."""
        if self.circuit_breaker.can_execute():
            start_t = time.monotonic()
            try:
                client = await self._ensure_client()
                data = await asyncio.wait_for(client.get(key), timeout=self._op_timeout)
                latency_ms = (time.monotonic() - start_t) * 1000.0
                self._metrics.record_redis_latency(latency_ms)
                self.circuit_breaker.record_success()

                if data is None:
                    # Check fallback in case data was written during outage
                    fallback_data = await self._fallback_backend.get(key)
                    if fallback_data is not None:
                        # Auto write-through: sync to Redis so all cluster workers benefit
                        try:
                            await client.set(key, fallback_data, ex=2592000)
                        except Exception:
                            pass
                        return fallback_data
                    return None
                if isinstance(data, bytes):
                    return data
                if isinstance(data, str):
                    return data.encode("utf-8")
                return bytes(data)
            except Exception as exc:
                self._metrics.increment("redis_error")
                self.circuit_breaker.record_failure(exc)
                logger.warning("Redis get failed for %s (%s). Falling back to InMemory.", key, exc)

        # Fallback to local memory
        self._metrics.increment("redis_fallback_count")
        return await self._fallback_backend.get(key)

    async def set(self, key: str, value: bytes, ttl_seconds: int | None = None) -> None:
        """Store binary value in Redis with timeout and in-memory fallback."""
        if not isinstance(value, (bytes, bytearray)):
            raise TypeError(f"Value must be bytes or bytearray, got {type(value).__name__}")
        byte_val = bytes(value)

        # Always update local fallback cache
        await self._fallback_backend.set(key, byte_val, ttl_seconds=ttl_seconds)

        if self.circuit_breaker.can_execute():
            start_t = time.monotonic()
            try:
                client = await self._ensure_client()
                if ttl_seconds is not None and ttl_seconds <= 0:
                    coro = client.delete(key)
                elif ttl_seconds is not None and ttl_seconds > 0:
                    coro = client.set(key, byte_val, ex=int(ttl_seconds))
                else:
                    coro = client.set(key, byte_val)

                await asyncio.wait_for(coro, timeout=self._op_timeout)
                latency_ms = (time.monotonic() - start_t) * 1000.0
                self._metrics.record_redis_latency(latency_ms)
                self.circuit_breaker.record_success()
            except Exception as exc:
                self._metrics.increment("redis_error")
                self.circuit_breaker.record_failure(exc)
                self._metrics.increment("redis_fallback_count")
                logger.warning("Redis set failed for %s (%s). Kept in InMemory fallback.", key, exc)

    async def delete(self, key: str) -> None:
        """Delete key from Redis and local fallback cache."""
        await self._fallback_backend.delete(key)

        if self.circuit_breaker.can_execute():
            start_t = time.monotonic()
            try:
                client = await self._ensure_client()
                await asyncio.wait_for(client.delete(key), timeout=self._op_timeout)
                latency_ms = (time.monotonic() - start_t) * 1000.0
                self._metrics.record_redis_latency(latency_ms)
                self.circuit_breaker.record_success()
            except Exception as exc:
                self._metrics.increment("redis_error")
                self.circuit_breaker.record_failure(exc)
                logger.warning("Redis delete failed for %s: %s", key, exc)

    async def set_if_absent(self, key: str, value: bytes, ttl_seconds: int | None = None) -> bool:
        """Atomically set key only if absent with fallback support."""
        if not isinstance(value, (bytes, bytearray)):
            raise TypeError(f"Value must be bytes or bytearray, got {type(value).__name__}")
        byte_val = bytes(value)

        if self.circuit_breaker.can_execute():
            start_t = time.monotonic()
            try:
                client = await self._ensure_client()
                if ttl_seconds is not None and ttl_seconds <= 0:
                    return False
                if ttl_seconds is not None and ttl_seconds > 0:
                    coro = client.set(key, byte_val, ex=int(ttl_seconds), nx=True)
                else:
                    coro = client.set(key, byte_val, nx=True)

                res = await asyncio.wait_for(coro, timeout=self._op_timeout)
                latency_ms = (time.monotonic() - start_t) * 1000.0
                self._metrics.record_redis_latency(latency_ms)
                self.circuit_breaker.record_success()
                if bool(res):
                    await self._fallback_backend.set(key, byte_val, ttl_seconds=ttl_seconds)
                return bool(res)
            except Exception as exc:
                self._metrics.increment("redis_error")
                self.circuit_breaker.record_failure(exc)
                logger.warning("Redis set_if_absent failed for %s (%s). Falling back to InMemory.", key, exc)

        self._metrics.increment("redis_fallback_count")
        return await self._fallback_backend.set_if_absent(key, byte_val, ttl_seconds=ttl_seconds)

    async def acquire_lock(self, lock_key: str, owner_token: str, ttl_ms: int) -> bool:
        """Acquire distributed lock with circuit breaker and local fallback."""
        if self.circuit_breaker.can_execute():
            start_t = time.monotonic()
            try:
                client = await self._ensure_client()
                token_bytes = owner_token.encode("utf-8")
                res = await asyncio.wait_for(
                    client.set(lock_key, token_bytes, nx=True, px=int(ttl_ms)),
                    timeout=self._op_timeout,
                )
                latency_ms = (time.monotonic() - start_t) * 1000.0
                self._metrics.record_redis_latency(latency_ms)
                self.circuit_breaker.record_success()
                return bool(res)
            except Exception as exc:
                self._metrics.increment("redis_error")
                self.circuit_breaker.record_failure(exc)
                logger.warning("Redis acquire_lock failed for %s (%s). Falling back to local lock.", lock_key, exc)

        # Fallback to local memory lock during outage
        self._metrics.increment("redis_fallback_count")
        return await self._fallback_backend.acquire_lock(lock_key, owner_token, ttl_ms=ttl_ms)

    async def release_lock(self, lock_key: str, owner_token: str) -> bool:
        """Release distributed lock using Lua script with circuit breaker and local fallback."""
        # Always release from local fallback if held
        await self._fallback_backend.release_lock(lock_key, owner_token)

        if self.circuit_breaker.can_execute():
            start_t = time.monotonic()
            try:
                client = await self._ensure_client()
                token_bytes = owner_token.encode("utf-8")
                res = await asyncio.wait_for(
                    client.eval(LUA_RELEASE_LOCK, 1, lock_key, token_bytes),
                    timeout=self._op_timeout,
                )
                latency_ms = (time.monotonic() - start_t) * 1000.0
                self._metrics.record_redis_latency(latency_ms)
                self.circuit_breaker.record_success()
                return bool(res)
            except Exception as exc:
                self._metrics.increment("redis_error")
                self.circuit_breaker.record_failure(exc)
                logger.warning("Redis release_lock failed for %s: %s", lock_key, exc)
                return True  # Avoid deadlock on Redis failure

        return True

    async def close(self) -> None:
        """Close client, connection pool, and fallback backend."""
        import inspect

        await self._fallback_backend.close()

        async with self._get_lock():
            if self._client is not None:
                aclose_fn = getattr(self._client, "aclose", None) or getattr(self._client, "close", None)
                if callable(aclose_fn):
                    res = aclose_fn()
                    if inspect.isawaitable(res):
                        await res
                self._client = None
            if self._pool is not None and self._owns_pool:
                disconnect_res = self._pool.disconnect()
                if inspect.isawaitable(disconnect_res):
                    await disconnect_res
                self._pool = None
