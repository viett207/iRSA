"""Unit tests for content_hash, centralized parser_version, and cache key generation.

Verifies:
1. Stable, deterministic cryptographic hashing using SHA-256 (independent of Python hash seed).
2. Changing raw CV text (even 1 character) strictly changes the content_hash.
3. Identical content across operating systems (CRLF vs LF) produces identical hash when normalized.
4. Cache key generation NEVER leaks raw CV text or candidate PII.
5. Cache key changes when parser_version changes (automatic cache invalidation).
6. Centralized declaration of PARSER_VERSION synchronized across CVFingerprint and TextChunker.
7. Class methods and property shortcuts on CVFingerprint.
"""

import hashlib
import unicodedata

from src.chunking.text_chunker import TextChunker
from src.models.cv_fingerprint import (
    PARSER_VERSION,
    CVFingerprint,
    compute_content_hash,
    generate_fingerprint_cache_key,
)

SAMPLE_CV_1 = (
    "HỌ VÀ TÊN: NGUYỄN VĂN A\n"
    "Email: nguyenvana@example.com | SĐT: 0912345678\n"
    "KỸ NĂNG: Python, FastAPI, Docker, PostgreSQL\n"
    "KINH NGHIỆM: 4 năm Backend Developer tại Công ty ABC."
)

SAMPLE_CV_1_MODIFIED = (
    "HỌ VÀ TÊN: NGUYỄN VĂN A\n"
    "Email: nguyenvana@example.com | SĐT: 0912345678\n"
    "KỸ NĂNG: Python, FastAPI, Docker, PostgreSQL\n"
    "KINH NGHIỆM: 5 năm Backend Developer tại Công ty ABC."  # 4 năm -> 5 năm
)


# ==============================================================================
# 1. STABLE & DETERMINISTIC HASHING
# ==============================================================================

def test_stable_cryptographic_hash_format():
    """Verify compute_content_hash returns a 64-character lowercase SHA-256 hex string."""
    h = compute_content_hash(SAMPLE_CV_1)
    assert isinstance(h, str)
    assert len(h) == 64
    assert h == h.lower()
    # Matches SHA-256 standard
    expected = hashlib.sha256(SAMPLE_CV_1.encode("utf-8")).hexdigest()
    assert h == expected


def test_identical_content_always_produces_identical_hash():
    """Verify hashing the exact same content multiple times produces identical hash."""
    h1 = compute_content_hash(SAMPLE_CV_1)
    h2 = compute_content_hash(SAMPLE_CV_1)
    h3 = CVFingerprint.compute_hash(SAMPLE_CV_1)

    assert h1 == h2 == h3


def test_empty_string_hashing():
    """Verify empty string returns valid SHA-256 of empty byte array."""
    h_empty = compute_content_hash("")
    expected_empty = hashlib.sha256(b"").hexdigest()
    assert h_empty == expected_empty
    assert h_empty == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


# ==============================================================================
# 2. SENSITIVITY TO RAW TEXT CHANGES
# ==============================================================================

def test_changing_raw_text_strictly_changes_hash():
    """Verify changing even a single digit in raw_text produces a completely different hash."""
    h1 = compute_content_hash(SAMPLE_CV_1)
    h2 = compute_content_hash(SAMPLE_CV_1_MODIFIED)

    assert h1 != h2, f"Hash collision detected between distinct texts! ({h1})"


def test_whitespace_and_punctuation_changes_alter_hash():
    """Verify adding trailing spaces or punctuation changes the cryptographic hash."""
    h1 = compute_content_hash("Python Developer")
    h2 = compute_content_hash("Python Developer ")
    h3 = compute_content_hash("Python Developer.")

    assert h1 != h2
    assert h1 != h3
    assert h2 != h3


# ==============================================================================
# 3. CROSS-PLATFORM NEWLINE & UNICODE NORMALIZATION
# ==============================================================================

def test_crlf_vs_lf_line_endings_produce_identical_hash_when_normalized():
    """Verify Windows CRLF (\\r\\n) and Unix LF (\\n) produce the same hash under normalization."""
    unix_text = "Line 1: Python\nLine 2: FastAPI\nLine 3: Docker"
    windows_text = "Line 1: Python\r\nLine 2: FastAPI\r\nLine 3: Docker"
    mac_old_text = "Line 1: Python\rLine 2: FastAPI\rLine 3: Docker"

    h_unix = compute_content_hash(unix_text, normalize_newlines=True)
    h_win = compute_content_hash(windows_text, normalize_newlines=True)
    h_mac = compute_content_hash(mac_old_text, normalize_newlines=True)

    assert h_unix == h_win == h_mac


def test_unicode_nfc_normalization_stability():
    """Verify Unicode NFD vs NFC decomposed Vietnamese diacritics produce identical hash."""
    # "Tiếng Việt" in NFC and NFD
    nfc_text = unicodedata.normalize("NFC", "Lập trình viên Tiếng Việt")
    nfd_text = unicodedata.normalize("NFD", "Lập trình viên Tiếng Việt")

    assert compute_content_hash(nfc_text) == compute_content_hash(nfd_text)


# ==============================================================================
# 4. PRIVACY-SAFE CACHE KEY (NO RAW CV TEXT IN KEY)
# ==============================================================================

def test_cache_key_never_contains_raw_cv_text_or_pii():
    """Verify cache key contains only prefix, version, and hash — NEVER raw text or candidate PII."""
    raw_cv_with_sensitive_pii = (
        "ỨNG VIÊN: NGUYỄN VĂN BÍ MẬT\n"
        "Số CMND: 012345678901 | SĐT: 0988776655\n"
        "Lương mong muốn: 60.000.000 VNĐ / tháng\n"
        "Địa chỉ nhà riêng: Số 123 Đường Cơ Mật, Hà Nội"
    )

    c_hash = compute_content_hash(raw_cv_with_sensitive_pii)
    cache_key = generate_fingerprint_cache_key(c_hash, parser_version="v1")

    # Assert cache key format: cv_fp:{version}:{hash}
    assert cache_key == f"cv_fp:v1:{c_hash}"

    # Assert ZERO sensitive terms appear in the cache key
    pii_keywords = ["NGUYỄN", "BÍ MẬT", "012345678901", "0988776655", "60.000.000", "Cơ Mật", "Hà Nội"]
    for pii in pii_keywords:
        assert pii not in cache_key
        assert pii.lower() not in cache_key


# ==============================================================================
# 5. PARSER VERSION INVALIDATION & CENTRALIZED DECLARATION
# ==============================================================================

def test_cache_key_changes_when_parser_version_changes():
    """Verify cache key changes when parser_version changes, enabling automatic cache invalidation."""
    c_hash = compute_content_hash(SAMPLE_CV_1)

    key_v1 = generate_fingerprint_cache_key(c_hash, parser_version="v1")
    key_v2 = generate_fingerprint_cache_key(c_hash, parser_version="v2")
    key_custom = generate_fingerprint_cache_key(c_hash, parser_version="v1.2.0")

    assert key_v1 != key_v2
    assert key_v1 == f"cv_fp:v1:{c_hash}"
    assert key_v2 == f"cv_fp:v2:{c_hash}"
    assert key_custom == f"cv_fp:v1.2.0:{c_hash}"


def test_centralized_parser_version_synchronization():
    """Verify PARSER_VERSION is declared centrally and synchronized with TextChunker and CVFingerprint."""
    assert isinstance(PARSER_VERSION, str)
    assert len(PARSER_VERSION) > 0

    # Single source of truth assertions
    assert CVFingerprint.PARSER_VERSION == PARSER_VERSION
    assert TextChunker.PARSER_VERSION == PARSER_VERSION


# ==============================================================================
# 6. CVFINGERPRINT INSTANCE METHODS & PROPERTY SHORTCUTS
# ==============================================================================

def test_cv_fingerprint_instance_cache_key_property():
    """Verify CVFingerprint instance property .cache_key and classmethods work seamlessly."""
    c_hash = CVFingerprint.compute_hash(SAMPLE_CV_1)

    fp = CVFingerprint(
        resume_id="cv_test_001",
        content_hash=c_hash,
        parser_version=PARSER_VERSION,
        raw_text_length=len(SAMPLE_CV_1),
    )

    expected_key = f"cv_fp:{PARSER_VERSION}:{c_hash}"
    assert fp.cache_key == expected_key
    assert CVFingerprint.generate_cache_key(c_hash) == expected_key

