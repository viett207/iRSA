"""Cache abstraction package providing pluggable asynchronous cache backends, envelope, single-flight mutex, and circuit breaker."""

from src.cache.base import CacheBackend
from src.cache.circuit_breaker import CircuitBreaker, CircuitState
from src.cache.duration_cache import (
    DEFAULT_DURATION_TTL_SECONDS,
    DurationCacheService,
)
from src.cache.envelope import (
    CURRENT_SCHEMA_VERSION,
    DEFAULT_COMPRESSION_THRESHOLD_BYTES,
    MAX_DECOMPRESSED_SIZE_BYTES,
    MAX_ENVELOPE_SIZE_BYTES,
    CacheEnvelope,
    CacheEnvelopeError,
    OversizedPayloadError,
    ParserVersionMismatchError,
    SchemaVersionMismatchError,
)
from src.cache.manager import (
    close_cache,
    get_cache_backend,
    init_cache,
    set_cache_backend,
)
from src.cache.memory import InMemoryCacheBackend
from src.cache.metrics import (
    CacheMetrics,
    get_cache_metrics,
    reset_cache_metrics,
)
from src.cache.parse_cache import (
    DEFAULT_PARSE_TTL_SECONDS,
    ParseCacheService,
)
from src.cache.pipeline import get_or_create_cv_fingerprint_async
from src.cache.redis import DEFAULT_OP_TIMEOUT_SECONDS, RedisCacheBackend

__all__ = [
    "CacheBackend",
    "InMemoryCacheBackend",
    "RedisCacheBackend",
    "get_cache_backend",
    "set_cache_backend",
    "init_cache",
    "close_cache",
    "ParseCacheService",
    "DurationCacheService",
    "DEFAULT_PARSE_TTL_SECONDS",
    "DEFAULT_DURATION_TTL_SECONDS",
    "DEFAULT_OP_TIMEOUT_SECONDS",
    "get_or_create_cv_fingerprint_async",
    "CircuitBreaker",
    "CircuitState",
    "CacheMetrics",
    "get_cache_metrics",
    "reset_cache_metrics",
    "CacheEnvelope",
    "CacheEnvelopeError",
    "OversizedPayloadError",
    "SchemaVersionMismatchError",
    "ParserVersionMismatchError",
    "CURRENT_SCHEMA_VERSION",
    "DEFAULT_COMPRESSION_THRESHOLD_BYTES",
    "MAX_ENVELOPE_SIZE_BYTES",
    "MAX_DECOMPRESSED_SIZE_BYTES",
]
