"""Comprehensive tests for production-safe cache envelope, compression, and tenant isolation."""

from __future__ import annotations

import base64
import json
import zlib

import pytest
import pytest_asyncio

from src.cache.base import CacheBackend
from src.cache.envelope import (
    CURRENT_SCHEMA_VERSION,
    CacheEnvelope,
    OversizedPayloadError,
)
from src.cache.memory import InMemoryCacheBackend
from src.cache.parse_cache import ParseCacheService
from src.cache.redis import RedisCacheBackend
from src.chunking.fingerprint_cache import create_cv_fingerprint
from src.models.cv_fingerprint import PARSER_VERSION, compute_content_hash
from tests.fixtures.cv_fixtures import CV_FIXTURES
from tests.test_cache.fake_redis import FakeAsyncRedis

SAMPLE_CV = CV_FIXTURES["python_in_experience_with_date_range"]["raw_text"]


@pytest_asyncio.fixture
async def memory_backend() -> CacheBackend:
    backend = InMemoryCacheBackend()
    yield backend
    await backend.close()


@pytest_asyncio.fixture
async def redis_backend() -> CacheBackend:
    fake_client = FakeAsyncRedis()
    backend = RedisCacheBackend(redis_client=fake_client)  # type: ignore[arg-type]
    yield backend
    await backend.close()


@pytest.fixture(params=["memory", "redis"])
def cache_backend(
    request: pytest.FixtureRequest,
    memory_backend: CacheBackend,
    redis_backend: CacheBackend,
) -> CacheBackend:
    if request.param == "memory":
        return memory_backend
    return redis_backend


# ==============================================================================
# 1. SCHEMA VERSION MISMATCH
# ==============================================================================

@pytest.mark.asyncio
async def test_schema_version_mismatch_deletes_key_and_triggers_reparse(cache_backend: CacheBackend) -> None:
    parse_svc = ParseCacheService(backend=cache_backend)
    c_hash = compute_content_hash(SAMPLE_CV)
    key = parse_svc.build_key(resume_hash=c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_schema")

    # Inject an envelope with invalid/future schema version "v99"
    corrupt_envelope = {
        "schema_version": "v99",
        "parser_version": PARSER_VERSION,
        "compression": "none",
        "payload": create_cv_fingerprint(SAMPLE_CV).model_dump_json(),
        "created_at": 1234567890.0,
    }
    await cache_backend.set(key, json.dumps(corrupt_envelope).encode("utf-8"))

    # get_parsed should detect schema mismatch, delete key, and return None
    cached = await parse_svc.get_parsed(resume_hash=c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_schema")
    assert cached is None

    # Verify key was deleted from backend
    raw = await cache_backend.get(key)
    assert raw is None


# ==============================================================================
# 2. PARSER VERSION MISMATCH
# ==============================================================================

@pytest.mark.asyncio
async def test_parser_version_mismatch_deletes_key(cache_backend: CacheBackend) -> None:
    parse_svc = ParseCacheService(backend=cache_backend)
    c_hash = compute_content_hash(SAMPLE_CV)
    key = parse_svc.build_key(resume_hash=c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_pver")

    # Inject envelope with old parser version "v0_legacy"
    envelope = {
        "schema_version": CURRENT_SCHEMA_VERSION,
        "parser_version": "v0_legacy",
        "compression": "none",
        "payload": create_cv_fingerprint(SAMPLE_CV).model_dump_json(),
        "created_at": 1234567890.0,
    }
    await cache_backend.set(key, json.dumps(envelope).encode("utf-8"))

    # get_parsed with current PARSER_VERSION returns None and deletes stale key
    cached = await parse_svc.get_parsed(resume_hash=c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_pver")
    assert cached is None
    assert await cache_backend.get(key) is None


# ==============================================================================
# 3. CORRUPTED PAYLOAD
# ==============================================================================

@pytest.mark.asyncio
async def test_corrupted_payload_deletes_key(cache_backend: CacheBackend) -> None:
    parse_svc = ParseCacheService(backend=cache_backend)
    c_hash = compute_content_hash(SAMPLE_CV)
    key = parse_svc.build_key(resume_hash=c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_corrupt")

    # Inject completely unparseable binary garbage
    await cache_backend.set(key, b"\x00\xff\xfe\xca\xfe\xba\xbe{invalid json")

    cached = await parse_svc.get_parsed(resume_hash=c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_corrupt")
    assert cached is None
    assert await cache_backend.get(key) is None


# ==============================================================================
# 4. INVALID PYDANTIC PAYLOAD
# ==============================================================================

@pytest.mark.asyncio
async def test_invalid_pydantic_payload_deletes_key(cache_backend: CacheBackend) -> None:
    parse_svc = ParseCacheService(backend=cache_backend)
    c_hash = compute_content_hash(SAMPLE_CV)
    key = parse_svc.build_key(resume_hash=c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_pydantic")

    # Valid envelope, but inner payload lacks required CVFingerprint fields
    invalid_fp_payload = json.dumps({"arbitrary_field": "not a cv fingerprint"})
    envelope = {
        "schema_version": CURRENT_SCHEMA_VERSION,
        "parser_version": PARSER_VERSION,
        "compression": "none",
        "payload": invalid_fp_payload,
        "created_at": 1234567890.0,
    }
    await cache_backend.set(key, json.dumps(envelope).encode("utf-8"))

    cached = await parse_svc.get_parsed(resume_hash=c_hash, parser_version=PARSER_VERSION, tenant_id="tenant_pydantic")
    assert cached is None
    assert await cache_backend.get(key) is None


# ==============================================================================
# 5. OVERSIZED PAYLOAD / ANTI-DECOMPRESSION BOMB
# ==============================================================================

def test_oversized_envelope_rejected() -> None:
    # 6 MB dummy bytes exceeds 5 MB limit
    oversized_bytes = b"x" * (6 * 1024 * 1024)
    with pytest.raises(OversizedPayloadError):
        CacheEnvelope.unwrap_fingerprint(oversized_bytes)


def test_decompression_bomb_rejected() -> None:
    # Highly compressible sequence (12 MB of zeroes compressed to a few KB)
    bomb_raw = b"0" * (12 * 1024 * 1024)
    compressed_bomb = zlib.compress(bomb_raw)
    b64_bomb = base64.b64encode(compressed_bomb).decode("ascii")

    envelope = {
        "schema_version": CURRENT_SCHEMA_VERSION,
        "parser_version": PARSER_VERSION,
        "compression": "zlib",
        "payload": b64_bomb,
        "created_at": 1234567890.0,
    }
    envelope_bytes = json.dumps(envelope).encode("utf-8")

    # Safe decompression must reject exceeding 10 MB decompressed size
    with pytest.raises(OversizedPayloadError, match="exceeds safety threshold"):
        CacheEnvelope.unwrap_fingerprint(envelope_bytes)


# ==============================================================================
# 6. TENANT ISOLATION
# ==============================================================================

@pytest.mark.asyncio
async def test_tenant_isolation_complete_segregation(cache_backend: CacheBackend) -> None:
    parse_svc = ParseCacheService(backend=cache_backend)
    fp = create_cv_fingerprint(SAMPLE_CV, resume_id="cand_tenant_iso")

    # Tenant Alpha writes to cache
    await parse_svc.set_parsed(fp, tenant_id="tenant_alpha")

    c_hash = fp.content_hash

    # Tenant Alpha gets HIT
    cached_alpha = await parse_svc.get_parsed(c_hash, tenant_id="tenant_alpha")
    assert cached_alpha is not None
    assert cached_alpha.content_hash == c_hash

    # Tenant Beta gets MISS (cannot read Tenant Alpha's data)
    cached_beta = await parse_svc.get_parsed(c_hash, tenant_id="tenant_beta")
    assert cached_beta is None

    # Tenant Beta writes its own
    await parse_svc.set_parsed(fp, tenant_id="tenant_beta")
    assert await parse_svc.get_parsed(c_hash, tenant_id="tenant_beta") is not None

    # Deleting Tenant Alpha has no impact on Tenant Beta
    await parse_svc.delete_parsed(c_hash, tenant_id="tenant_alpha")
    assert await parse_svc.get_parsed(c_hash, tenant_id="tenant_alpha") is None
    assert await parse_svc.get_parsed(c_hash, tenant_id="tenant_beta") is not None


# ==============================================================================
# 7. COMPRESSION & DECOMPRESSION ROUNDTRIP
# ==============================================================================

@pytest.mark.asyncio
async def test_compression_and_decompression_roundtrip(cache_backend: CacheBackend) -> None:
    parse_svc = ParseCacheService(backend=cache_backend, compression_threshold_bytes=100)
    fp = create_cv_fingerprint(SAMPLE_CV, resume_id="cand_compress")

    # Set into cache with 100 B threshold (will compress with zlib)
    await parse_svc.set_parsed(fp, tenant_id="tenant_comp")

    # Inspect raw envelope in backend to verify compression was applied
    key = parse_svc.build_key(fp.content_hash, tenant_id="tenant_comp")
    raw_bytes = await cache_backend.get(key)
    assert raw_bytes is not None

    envelope_data = json.loads(raw_bytes.decode("utf-8"))
    assert envelope_data["compression"] == "zlib"
    assert envelope_data["schema_version"] == CURRENT_SCHEMA_VERSION

    # Read back and verify exact structural equivalence
    fp_read = await parse_svc.get_parsed(fp.content_hash, tenant_id="tenant_comp")
    assert fp_read is not None
    assert fp_read.content_hash == fp.content_hash
    assert len(fp_read.experience_entries) == len(fp.experience_entries)
    assert len(fp_read.evidence_blocks) == len(fp.evidence_blocks)


# ==============================================================================
# 8. BACKWARD COMPATIBILITY WITH LEGACY UN-ENVELOPED CACHE
# ==============================================================================

@pytest.mark.asyncio
async def test_backward_compatibility_with_legacy_unenveloped_cache(cache_backend: CacheBackend) -> None:
    parse_svc = ParseCacheService(backend=cache_backend)
    fp = create_cv_fingerprint(SAMPLE_CV, resume_id="cand_legacy")

    # Store raw legacy un-enveloped JSON bytes directly in cache
    legacy_json_bytes = fp.model_dump_json().encode("utf-8")
    key = parse_svc.build_key(fp.content_hash, tenant_id="tenant_legacy")
    await cache_backend.set(key, legacy_json_bytes)

    # get_parsed should detect legacy format and unpack without errors
    cached_fp = await parse_svc.get_parsed(fp.content_hash, tenant_id="tenant_legacy")
    assert cached_fp is not None
    assert cached_fp.content_hash == fp.content_hash
    assert cached_fp.resume_id == "cand_legacy"


# ==============================================================================
# 9. ZERO PII IN REDIS KEYS
# ==============================================================================

def test_zero_pii_in_keys_and_envelopes() -> None:
    parse_svc = ParseCacheService()
    raw_with_pii = """
    HỌ VÀ TÊN: NGUYỄN VĂN AN
    Email: an.nguyen@example.com
    Điện thoại: 0987654321
    Kinh nghiệm: 3 năm Python Developer
    """
    c_hash = compute_content_hash(raw_with_pii)
    key = parse_svc.build_key(c_hash, tenant_id="company_xyz")

    assert key == f"cv_parse:company_xyz:{c_hash}:v1"
    for pii in ["nguyen", "van an", "an.nguyen", "example.com", "0987654321"]:
        assert pii not in key.lower()
