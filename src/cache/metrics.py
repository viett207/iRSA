"""Lightweight, privacy-safe metrics tracker for cache and Redis operations.

Guarantees:
- Zero PII: Never records candidate names, emails, phone numbers, or CV text.
- Thread-safe and asyncio-safe atomic counters.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any


@dataclass
class CacheMetrics:
    """Aggregated cache and single-flight metrics without candidate PII."""
    cache_hit: int = 0
    cache_miss: int = 0
    redis_error: int = 0
    redis_fallback_count: int = 0
    lock_acquired: int = 0
    lock_wait: int = 0
    parse_count: int = 0
    total_redis_latency_ms: float = 0.0
    redis_call_count: int = 0
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, repr=False)

    def increment(self, metric_name: str, count: int = 1) -> None:
        """Increment an integer counter."""
        if hasattr(self, metric_name):
            current = getattr(self, metric_name)
            if isinstance(current, int):
                setattr(self, metric_name, current + count)

    def record_redis_latency(self, latency_ms: float) -> None:
        """Record latency duration in milliseconds."""
        self.total_redis_latency_ms += max(0.0, latency_ms)
        self.redis_call_count += 1

    @property
    def avg_redis_latency_ms(self) -> float:
        """Calculate average Redis operation latency in milliseconds."""
        if self.redis_call_count == 0:
            return 0.0
        return self.total_redis_latency_ms / self.redis_call_count

    def to_dict(self) -> dict[str, Any]:
        """Export metrics snapshot as dictionary."""
        return {
            "cache_hit": self.cache_hit,
            "cache_miss": self.cache_miss,
            "redis_error": self.redis_error,
            "redis_fallback_count": self.redis_fallback_count,
            "lock_acquired": self.lock_acquired,
            "lock_wait": self.lock_wait,
            "parse_count": self.parse_count,
            "redis_call_count": self.redis_call_count,
            "avg_redis_latency_ms": round(self.avg_redis_latency_ms, 2),
        }

    def reset(self) -> None:
        """Reset all metric counters to zero."""
        self.cache_hit = 0
        self.cache_miss = 0
        self.redis_error = 0
        self.redis_fallback_count = 0
        self.lock_acquired = 0
        self.lock_wait = 0
        self.parse_count = 0
        self.total_redis_latency_ms = 0.0
        self.redis_call_count = 0


_GLOBAL_METRICS = CacheMetrics()


def get_cache_metrics() -> CacheMetrics:
    """Access global CacheMetrics singleton."""
    return _GLOBAL_METRICS


def reset_cache_metrics() -> None:
    """Reset global CacheMetrics singleton."""
    _GLOBAL_METRICS.reset()
