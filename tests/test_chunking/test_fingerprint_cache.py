"""Unit and Integration Tests for CVFingerprintCache.

Verifies:
1. Multi-JD Optimization: The same CV is parsed only once and reused across multiple JDs.
2. Invalidation on Raw Text Change: Editing raw text alters content_hash and triggers re-parsing.
3. Invalidation on Parser Version Change: Changing parser_version automatically bypasses stale cache.
4. Resilience / Fault Tolerance: Cache exceptions or internal failures never crash the parsing pipeline.
5. Multi-Resume Isolation: Different candidate resumes are strictly segregated with zero cross-talk.
6. Memory-bounded LRU Eviction & TTL Expiration.
7. Thread-Safety under concurrent multi-threaded execution.
"""

import threading
import time
from unittest.mock import MagicMock, patch
import pytest

from src.chunking.fingerprint_cache import (
    CVFingerprintCache,
    create_cv_fingerprint,
)
from src.models.cv_fingerprint import (
    PARSER_VERSION,
    CVFingerprint,
    compute_content_hash,
    generate_fingerprint_cache_key,
)
from tests.fixtures.cv_fixtures import CV_FIXTURES

SAMPLE_TEXT_1 = CV_FIXTURES["python_in_experience_with_date_range"]["raw_text"]
SAMPLE_TEXT_2 = CV_FIXTURES["python_in_skills_only"]["raw_text"]


@pytest.fixture
def clean_cache():
    """Provide a fresh, isolated cache instance for each test."""
    return CVFingerprintCache(max_size=10, default_ttl_seconds=3600)


# ==============================================================================
# 1. MULTI-JD OPTIMIZATION: SAME CV PARSED ONLY ONCE
# ==============================================================================

def test_multi_jd_same_cv_parsed_only_once(clean_cache):
    """Verify that multiple JDs evaluating the same CV parse it only once and reuse the cached fingerprint."""
    resume_id = "candidate_fpt_001"

    # JD 1: First evaluation (Cache Miss -> Parse -> Cache)
    fp_jd1 = create_cv_fingerprint(
        raw_text=SAMPLE_TEXT_1,
        resume_id=resume_id,
        cache=clean_cache,
    )
    assert fp_jd1.resume_id == resume_id
    assert len(fp_jd1.experience_entries) >= 1
    assert clean_cache.stats()["hits"] == 0
    assert clean_cache.stats()["misses"] == 1
    assert clean_cache.stats()["size"] == 1

    # JD 2: Second evaluation (Cache Hit -> 0 re-parsing)
    fp_jd2 = create_cv_fingerprint(
        raw_text=SAMPLE_TEXT_1,
        resume_id=resume_id,
        cache=clean_cache,
    )
    assert fp_jd2.content_hash == fp_jd1.content_hash
    assert fp_jd2 is fp_jd1  # Exact cached object
    assert clean_cache.stats()["hits"] == 1
    assert clean_cache.stats()["misses"] == 1

    # JD 3, JD 4, JD 5: Further evaluations all hit cache
    for _ in range(3):
        fp = create_cv_fingerprint(
            raw_text=SAMPLE_TEXT_1,
            resume_id=resume_id,
            cache=clean_cache,
        )
        assert fp.content_hash == fp_jd1.content_hash

    assert clean_cache.stats()["hits"] == 4
    assert clean_cache.stats()["misses"] == 1


# ==============================================================================
# 2. RAW TEXT CHANGE INVALIDATION
# ==============================================================================

def test_raw_text_change_triggers_reparsing_and_new_cache_entry(clean_cache):
    """Verify that modifying raw text alters content_hash, invalidating the old cache and re-parsing."""
    resume_id = "cand_edit_001"
    original_text = SAMPLE_TEXT_1
    modified_text = SAMPLE_TEXT_1 + "\n- Chứng chỉ AWS Certified Solutions Architect (2024)"

    # Step 1: Parse original text
    fp_orig = create_cv_fingerprint(
        raw_text=original_text,
        resume_id=resume_id,
        cache=clean_cache,
    )
    orig_hash = fp_orig.content_hash

    # Step 2: Parse modified text
    fp_mod = create_cv_fingerprint(
        raw_text=modified_text,
        resume_id=resume_id,
        cache=clean_cache,
    )
    mod_hash = fp_mod.content_hash

    assert orig_hash != mod_hash
    assert fp_mod.raw_text_length > fp_orig.raw_text_length
    assert clean_cache.stats()["size"] == 2
    assert clean_cache.stats()["misses"] == 2

    # Step 3: Fetching modified again hits its own new cache entry
    fp_mod_cached = create_cv_fingerprint(
        raw_text=modified_text,
        resume_id=resume_id,
        cache=clean_cache,
    )
    assert fp_mod_cached.content_hash == mod_hash
    assert clean_cache.stats()["hits"] == 1


# ==============================================================================
# 3. PARSER VERSION INVALIDATION
# ==============================================================================

def test_parser_version_change_invalidates_cache(clean_cache):
    """Verify changing parser_version bypasses stale cache and triggers fresh parsing."""
    resume_id = "cand_ver_001"
    c_hash = compute_content_hash(SAMPLE_TEXT_1)

    # Parse with parser version v1.0.0
    fp_v1 = create_cv_fingerprint(
        raw_text=SAMPLE_TEXT_1,
        resume_id=resume_id,
        parser_version="v1.0.0",
        cache=clean_cache,
    )
    assert fp_v1.parser_version == "v1.0.0"

    # Query with parser version v2.0.0
    fp_v2 = create_cv_fingerprint(
        raw_text=SAMPLE_TEXT_1,
        resume_id=resume_id,
        parser_version="v2.0.0",
        cache=clean_cache,
    )
    assert fp_v2.parser_version == "v2.0.0"
    assert clean_cache.stats()["misses"] == 2
    assert clean_cache.stats()["size"] == 2

    # Query with v1.0.0 again -> hits v1 cache
    fp_v1_hit = clean_cache.get(resume_id=resume_id, content_hash=c_hash, parser_version="v1.0.0")
    assert fp_v1_hit is not None
    assert fp_v1_hit.parser_version == "v1.0.0"


# ==============================================================================
# 4. RESILIENCE: CACHE FAILURE DOES NOT BREAK PIPELINE
# ==============================================================================

def test_cache_failure_gracefully_falls_back_to_parsing():
    """Verify that if cache encounters an unexpected error, parsing still succeeds without raising exceptions."""
    faulty_cache = CVFingerprintCache(max_size=10)

    # Force internal cache store exception on both static and dynamic stores
    mock_store = MagicMock()
    mock_store.get.side_effect = RuntimeError("Simulated memory corruption / Redis timeout")
    mock_store.__contains__.side_effect = RuntimeError("Simulated error")
    mock_store.__setitem__.side_effect = RuntimeError("Simulated disk error")

    faulty_cache._static_store = mock_store
    faulty_cache._dynamic_store = mock_store

    # create_cv_fingerprint must NOT raise an exception
    fp = create_cv_fingerprint(
        raw_text=SAMPLE_TEXT_1,
        resume_id="cand_resilient_001",
        cache=faulty_cache,
    )

    assert fp is not None
    assert fp.resume_id == "cand_resilient_001"
    assert len(fp.experience_entries) >= 1
    assert faulty_cache.stats()["errors"] >= 1



# ==============================================================================
# 5. CANDIDATE ISOLATION: NO DATA LEAKAGE BETWEEN RESUMES
# ==============================================================================

def test_no_data_leakage_between_two_different_resumes(clean_cache):
    """Verify that two candidates with distinct resume_ids are strictly isolated in cache."""
    # Even if they have identical text:
    shared_text = SAMPLE_TEXT_1
    c_hash = compute_content_hash(shared_text)

    fp_cand_a = create_cv_fingerprint(
        raw_text=shared_text,
        resume_id="cand_alpha_01",
        cache=clean_cache,
    )
    fp_cand_b = create_cv_fingerprint(
        raw_text=shared_text,
        resume_id="cand_beta_02",
        cache=clean_cache,
    )

    assert fp_cand_a.resume_id == "cand_alpha_01"
    assert fp_cand_b.resume_id == "cand_beta_02"
    assert clean_cache.stats()["size"] == 2

    # Invalidate Candidate Alpha
    deleted = clean_cache.invalidate(resume_id="cand_alpha_01")
    assert deleted == 1

    # Candidate Beta must still exist untouched
    assert clean_cache.contains(resume_id="cand_beta_02", content_hash=c_hash) is True
    assert clean_cache.contains(resume_id="cand_alpha_01", content_hash=c_hash) is False


# ==============================================================================
# 6. LRU CAPACITY EVICTION & TTL EXPIRATION
# ==============================================================================

def test_lru_capacity_eviction():
    """Verify oldest entry is evicted when capacity is reached."""
    small_cache = CVFingerprintCache(max_size=2)

    # Insert 1 and 2
    fp1 = create_cv_fingerprint("CV Text 1", resume_id="res1", cache=small_cache)
    fp2 = create_cv_fingerprint("CV Text 2", resume_id="res2", cache=small_cache)
    assert len(small_cache) == 2

    # Access 1 so 2 becomes oldest
    small_cache.get("res1", fp1.content_hash)

    # Insert 3 -> should evict res2
    fp3 = create_cv_fingerprint("CV Text 3", resume_id="res3", cache=small_cache)
    assert len(small_cache) == 2
    assert small_cache.stats()["evictions"] == 1

    # res2 is evicted
    assert small_cache.get("res2", fp2.content_hash) is None
    # res1 and res3 remain
    assert small_cache.get("res1", fp1.content_hash) is not None
    assert small_cache.get("res3", fp3.content_hash) is not None


def test_ttl_expiration():
    """Verify expired cache entry returns None and counts as miss."""
    cache = CVFingerprintCache(max_size=10, default_ttl_seconds=1)

    fp = create_cv_fingerprint(SAMPLE_TEXT_1, resume_id="res_ttl", cache=cache)
    assert cache.get("res_ttl", fp.content_hash) is not None

    # Wait for TTL expiration
    time.sleep(1.1)

    assert cache.get("res_ttl", fp.content_hash) is None
    assert cache.stats()["misses"] >= 1


# ==============================================================================
# 7. CONCURRENT MULTI-THREAD SAFETY
# ==============================================================================

def test_concurrent_multi_thread_cache_access():
    """Verify thread-safety when multiple threads concurrently read, write, and invalidate."""
    concurrent_cache = CVFingerprintCache(max_size=300)
    errors = []

    def worker(worker_id: int):
        try:
            for i in range(15):
                res_id = f"cand_thread_{worker_id}_{i % 3}"
                txt = f"CV content for worker {worker_id} iteration {i}"
                fp = create_cv_fingerprint(txt, resume_id=res_id, cache=concurrent_cache)
                assert fp is not None

                # Occasional read
                c_hash = compute_content_hash(txt)
                cached = concurrent_cache.get(res_id, c_hash)
                assert cached is not None
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Thread errors encountered: {errors}"
    assert len(concurrent_cache) <= concurrent_cache.max_size



# ==============================================================================
# 8. CVFINGERPRINT.FROM_RAW_TEXT INTEGRATION
# ==============================================================================

def test_cv_fingerprint_from_raw_text_class_method():
    """Verify CVFingerprint.from_raw_text() creates and retrieves cached fingerprints."""
    fp1 = CVFingerprint.from_raw_text(SAMPLE_TEXT_2, resume_id="cand_cls_001")
    assert fp1.resume_id == "cand_cls_001"
    assert len(fp1.evidence_blocks) >= 1

    fp2 = CVFingerprint.from_raw_text(SAMPLE_TEXT_2, resume_id="cand_cls_001")
    assert fp2.content_hash == fp1.content_hash


# ==============================================================================
# 9. TWO-TIER CACHE (STATIC VS DYNAMIC TIER)
# ==============================================================================

def test_two_tier_routing_static_vs_dynamic(clean_cache):
    """Verify historical CVs route to Static Tier while active ongoing CVs route to Dynamic Tier."""
    # 1. Historical CV (2021 - 2023) -> Static Tier
    static_text = """
    NGUYỄN VĂN AN
    KINH NGHIỆM:
    Công ty ABC (01/2021 - 12/2023): Python Backend
    KỸ NĂNG: Python, FastAPI
    """
    fp_static = create_cv_fingerprint(
        raw_text=static_text,
        resume_id="cand_static_01",
        cache=clean_cache,
        as_of_date="2026-08-01",
    )
    assert fp_static.has_ongoing_experience is False
    assert clean_cache.stats()["static_size"] == 1
    assert clean_cache.stats()["dynamic_size"] == 0

    # 2. Active CV (01/2024 - Hiện tại) -> Dynamic Tier
    dynamic_text = """
    TRẦN THỊ BÌNH
    KINH NGHIỆM:
    Công ty XYZ (01/2024 - Hiện tại): Senior Golang
    KỸ NĂNG: Golang, Docker
    """
    fp_dynamic = create_cv_fingerprint(
        raw_text=dynamic_text,
        resume_id="cand_dynamic_02",
        cache=clean_cache,
        as_of_date="2026-08-01",
    )
    assert fp_dynamic.has_ongoing_experience is True
    assert clean_cache.stats()["static_size"] == 1
    assert clean_cache.stats()["dynamic_size"] == 1


def test_two_tier_dynamic_monthly_rollover(clean_cache):
    """Verify dynamic cache auto-invalidates when transitioning to a new calendar month."""
    dynamic_text = """
    LÊ VĂN CƯỜNG
    KINH NGHIỆM:
    Công ty Tech (01/2024 - Hiện tại): Python Developer
    KỸ NĂNG: Python
    """

    # Parse in August 2026 (01/2024 - 08/2026 = 32 months)
    fp_aug = create_cv_fingerprint(
        raw_text=dynamic_text,
        resume_id="cand_rollover",
        cache=clean_cache,
        as_of_date="2026-08-10",
    )
    py_dur_aug = fp_aug.get_skill_duration("Python")
    assert py_dur_aug is not None
    assert py_dur_aug.verified_duration_months == 32

    # Query in August 2026 (same month) -> Cache HIT
    fp_aug_hit = create_cv_fingerprint(
        raw_text=dynamic_text,
        resume_id="cand_rollover",
        cache=clean_cache,
        as_of_date="2026-08-25",
    )
    assert clean_cache.stats()["dynamic_hits"] == 1

    # Query in September 2026 (new month) -> Cache MISS, re-evaluated to 33 months!
    fp_sep = create_cv_fingerprint(
        raw_text=dynamic_text,
        resume_id="cand_rollover",
        cache=clean_cache,
        as_of_date="2026-09-01",
    )
    py_dur_sep = fp_sep.get_skill_duration("Python")
    assert py_dur_sep is not None
    assert py_dur_sep.verified_duration_months == 33
    assert clean_cache.stats()["misses"] == 2
