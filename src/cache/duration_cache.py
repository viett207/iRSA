"""DurationCacheService for storing and retrieving calculated skill durations."""

from __future__ import annotations

import json
import logging

from src.cache.base import CacheBackend
from src.cache.manager import get_cache_backend
from src.models.cv_fingerprint import POLICY_VERSION, SkillDurationResult

logger = logging.getLogger(__name__)

# Default TTL: 30 days (2,592,000 seconds)
# Rationale: Keys are explicitly partitioned by calendar month (as_of_ym), so rollover automatically uses a new key.
DEFAULT_DURATION_TTL_SECONDS = 2592000


class DurationCacheService:
    """Service managing skill duration cache layer decoupled from raw parsing.

    Key structure:
    `skill_duration:{fingerprint_hash}:{duration_policy_version}:{as_of_ym}`
    """

    def __init__(
        self,
        backend: CacheBackend | None = None,
        default_ttl_seconds: int = DEFAULT_DURATION_TTL_SECONDS,
    ) -> None:
        self._backend = backend
        self.default_ttl_seconds = default_ttl_seconds

    def get_backend(self) -> CacheBackend:
        """Get the configured CacheBackend or default to active worker backend."""
        if self._backend is not None:
            return self._backend
        return get_cache_backend()

    def build_key(
        self,
        fingerprint_hash: str,
        duration_policy_version: str = POLICY_VERSION,
        as_of_ym: str = "2026-08",
    ) -> str:
        """Generate privacy-safe duration cache key.

        Format: `skill_duration:{fingerprint_hash}:{duration_policy_version}:{as_of_ym}`
        """
        fp_hash = fingerprint_hash.strip().lower()
        pol_ver = (duration_policy_version or POLICY_VERSION).strip()
        ym = as_of_ym.strip()
        return f"skill_duration:{fp_hash}:{pol_ver}:{ym}"

    async def get_durations(
        self,
        fingerprint_hash: str,
        duration_policy_version: str = POLICY_VERSION,
        as_of_ym: str = "2026-08",
    ) -> dict[str, SkillDurationResult] | None:
        """Retrieve cached skill duration results.

        Returns:
            Mapping of skill_name -> SkillDurationResult if HIT, else None.
        """
        key = self.build_key(
            fingerprint_hash=fingerprint_hash,
            duration_policy_version=duration_policy_version,
            as_of_ym=as_of_ym,
        )
        backend = self.get_backend()
        try:
            raw_bytes = await backend.get(key)
            if raw_bytes is None:
                return None
            data = json.loads(raw_bytes.decode("utf-8"))
            if not isinstance(data, dict):
                return None
            return {k: SkillDurationResult.model_validate(v) for k, v in data.items()}
        except Exception as exc:
            logger.warning("DurationCacheService.get_durations failed for key %s (%s). Deleting corrupt key.", key, exc)
            try:
                await backend.delete(key)
            except Exception as del_exc:
                logger.warning("Failed to delete corrupt duration key %s: %s", key, del_exc)
            return None

    async def set_durations(
        self,
        fingerprint_hash: str,
        durations: dict[str, SkillDurationResult],
        duration_policy_version: str = POLICY_VERSION,
        as_of_ym: str = "2026-08",
        ttl_seconds: int | None = None,
    ) -> bool:
        """Store calculated skill durations into duration cache."""
        key = self.build_key(
            fingerprint_hash=fingerprint_hash,
            duration_policy_version=duration_policy_version,
            as_of_ym=as_of_ym,
        )
        backend = self.get_backend()
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        try:
            dict_payload = {k: v.model_dump(mode="json") for k, v in durations.items()}
            raw_bytes = json.dumps(dict_payload).encode("utf-8")
            await backend.set(key, raw_bytes, ttl_seconds=ttl)
            return True
        except Exception as exc:
            logger.warning("DurationCacheService.set_durations failed for key %s: %s", key, exc)
            return False

    async def delete_durations(
        self,
        fingerprint_hash: str,
        duration_policy_version: str = POLICY_VERSION,
        as_of_ym: str = "2026-08",
    ) -> None:
        """Delete cached duration results."""
        key = self.build_key(
            fingerprint_hash=fingerprint_hash,
            duration_policy_version=duration_policy_version,
            as_of_ym=as_of_ym,
        )
        backend = self.get_backend()
        try:
            await backend.delete(key)
        except Exception as exc:
            logger.warning("DurationCacheService.delete_durations failed for key %s: %s", key, exc)
