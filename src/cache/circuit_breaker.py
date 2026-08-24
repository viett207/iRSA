"""Circuit Breaker implementation for Redis cache operations."""

from __future__ import annotations

import logging
import time
from enum import StrEnum

logger = logging.getLogger(__name__)


class CircuitState(StrEnum):
    """Circuit breaker states for Redis cache availability."""
    CLOSED = "CLOSED"        # Normal operation: all calls go to Redis
    OPEN = "OPEN"            # Failing: bypass Redis, use local in-memory fallback
    HALF_OPEN = "HALF_OPEN"  # Trial probe: test Redis recovery with limited requests


class CircuitBreaker:
    """Stateful circuit breaker tracking consecutive failures and managing recovery probes."""

    def __init__(
        self,
        failure_threshold: int = 3,
        recovery_timeout_seconds: float = 5.0,
        success_threshold: int = 1,
    ) -> None:
        self.failure_threshold = failure_threshold
        self.recovery_timeout_seconds = recovery_timeout_seconds
        self.success_threshold = success_threshold

        self._state: CircuitState = CircuitState.CLOSED
        self._consecutive_failures: int = 0
        self._consecutive_successes: int = 0
        self._last_failure_time: float = 0.0
        self._last_state_change: float = time.monotonic()

    @property
    def state(self) -> CircuitState:
        """Current effective circuit state, checking recovery timeout if OPEN."""
        if self._state == CircuitState.OPEN:
            elapsed = time.monotonic() - self._last_failure_time
            if elapsed >= self.recovery_timeout_seconds:
                self._transition_to(CircuitState.HALF_OPEN)
        return self._state

    def _transition_to(self, new_state: CircuitState) -> None:
        old_state = self._state
        self._state = new_state
        self._last_state_change = time.monotonic()
        if new_state == CircuitState.HALF_OPEN:
            self._consecutive_successes = 0
        elif new_state == CircuitState.CLOSED:
            self._consecutive_failures = 0
            self._consecutive_successes = 0
        elif new_state == CircuitState.OPEN:
            self._last_failure_time = time.monotonic()
            self._consecutive_successes = 0
        logger.info("CircuitBreaker state transition: %s -> %s", old_state.value, new_state.value)

    def can_execute(self) -> bool:
        """Check if an operation should attempt to call Redis or immediately bypass."""
        current = self.state
        if current == CircuitState.CLOSED:
            return True
        if current == CircuitState.HALF_OPEN:
            return True  # Allow trial probe
        return False  # OPEN: bypass Redis

    def record_success(self) -> None:
        """Record a successful Redis operation."""
        current = self.state
        if current == CircuitState.HALF_OPEN:
            self._consecutive_successes += 1
            if self._consecutive_successes >= self.success_threshold:
                self._transition_to(CircuitState.CLOSED)
        elif current == CircuitState.CLOSED:
            self._consecutive_failures = 0

    def record_failure(self, exc: Exception | None = None) -> None:
        """Record a failed Redis operation (e.g. timeout, connection error)."""
        self._last_failure_time = time.monotonic()
        current = self._state

        if current == CircuitState.HALF_OPEN:
            # Probe failed -> reopen circuit
            logger.warning("CircuitBreaker probe failed (%s). Transitioning back to OPEN.", exc)
            self._transition_to(CircuitState.OPEN)
        elif current == CircuitState.CLOSED:
            self._consecutive_failures += 1
            logger.warning(
                "Redis failure #%d/%d: %s",
                self._consecutive_failures,
                self.failure_threshold,
                exc,
            )
            if self._consecutive_failures >= self.failure_threshold:
                self._transition_to(CircuitState.OPEN)

    def reset(self) -> None:
        """Reset circuit breaker to clean CLOSED state."""
        self._transition_to(CircuitState.CLOSED)
        self._consecutive_failures = 0
        self._consecutive_successes = 0
        self._last_failure_time = 0.0
