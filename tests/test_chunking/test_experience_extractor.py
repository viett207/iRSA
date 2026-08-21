"""Fixture-based unit tests for ExperienceExtractor.

Verifies:
1. Extraction of structured ExperienceEntry objects from real CV fixtures.
2. Accurate extraction of company, role, date range, responsibilities, and technologies.
3. No hallucination / fabrication of missing fields: missing fields must be None and flagged with diagnostics.
4. Strict grounding: every evidence_block_id in extracted entries must exist in the chunked blocks.
5. Multi-line experience entries and multi-company CV support.
"""

import pytest

from src.chunking.experience_extractor import (
    ExperienceExtractor,
    extract_experience_entries,
)
from src.chunking.text_chunker import TextChunker
from tests.fixtures.cv_fixtures import CV_FIXTURES


@pytest.fixture
def extractor():
    return ExperienceExtractor()


# ==============================================================================
# 1. FIXTURE-BASED TESTS
# ==============================================================================

def test_extract_experience_fixture_python_in_skills_only(extractor):
    """Verify extracting PHP Backend experience entry from CV-01 fixture."""
    fixture = CV_FIXTURES["python_in_skills_only"]
    raw_text = fixture["raw_text"]

    entries = extractor.extract_entries(raw_text, doc_id="cv01")
    assert len(entries) >= 1

    entry = entries[0]
    assert entry.entry_id == "exp_cv01_01"
    assert "ABC" in (entry.company or "")
    assert "Lập trình viên Backend PHP" in (entry.role or "")
    assert entry.start_date == "2022-06"
    assert entry.end_date == "2024-06"
    assert entry.duration_months == 25
    assert len(entry.responsibilities) >= 3
    assert any("Laravel" in r for r in entry.responsibilities)
    assert "PHP" in entry.technologies or "Laravel" in entry.technologies
    assert len(entry.evidence_block_ids) > 0
    assert entry.confidence >= 0.90


def test_extract_experience_fixture_python_in_experience_with_date_range(extractor):
    """Verify extracting Python Engineer experience entry from CV-02 fixture."""
    fixture = CV_FIXTURES["python_in_experience_with_date_range"]
    raw_text = fixture["raw_text"]

    entries = extractor.extract_entries(raw_text, doc_id="cv02")
    assert len(entries) >= 1

    entry = entries[0]
    assert "FPT" in (entry.company or "")
    assert "Python Software Engineer" in (entry.role or "")
    assert entry.start_date == "2022-01"
    assert entry.end_date == "2023-12"
    assert entry.duration_months == 24
    assert "Python" in entry.technologies
    assert "FastAPI" in entry.technologies
    assert "Redis" in entry.technologies
    assert len(entry.evidence_block_ids) > 0
    assert entry.confidence >= 0.90


def test_extract_experience_fixture_overlapping_companies(extractor):
    """Verify extracting multiple distinct company entries from overlapping timeline fixture."""
    fixture = CV_FIXTURES["overlapping_jobs_cv"]
    raw_text = fixture["raw_text"]

    entries = extractor.extract_entries(raw_text, doc_id="cv_overlap")
    assert len(entries) == 2

    # Entry 1: Công ty Cổ phần Công nghệ Alpha (01/2022 - 12/2023)
    e1 = entries[0]
    assert "Alpha" in (e1.company or "")
    assert e1.start_date == "2022-01"
    assert e1.end_date == "2023-12"
    assert e1.duration_months == 24
    assert len(e1.evidence_block_ids) > 0

    # Entry 2: Công ty TNHH Giải pháp Beta (06/2022 - 06/2023)
    e2 = entries[1]
    assert "Beta" in (e2.company or "")
    assert e2.start_date == "2022-06"
    assert e2.end_date == "2023-06"
    assert e2.duration_months == 13
    assert len(e2.evidence_block_ids) > 0


# ==============================================================================
# 2. NO FABRICATION / NULL FIELD & DIAGNOSTICS
# ==============================================================================

def test_missing_company_returns_none_and_emits_diagnostic(extractor):
    """Verify missing company name returns None and adds MISSING_COMPANY diagnostic."""
    raw_text = (
        "KINH NGHIỆM LÀM VIỆC:\n"
        "Vị trí: Lập trình viên Python (01/2022 - 06/2023)\n"
        "- Thiết kế hệ thống RESTful API và cơ sở dữ liệu."
    )
    entries = extractor.extract_entries(raw_text)
    assert len(entries) == 1

    entry = entries[0]
    assert entry.company is None
    assert entry.role == "Lập trình viên Python"
    assert entry.start_date == "2022-01"
    assert entry.end_date == "2023-06"
    assert "MISSING_COMPANY" in entry.metadata.get("diagnostics", [])


def test_missing_role_returns_none_and_emits_diagnostic(extractor):
    """Verify missing role/title returns None and adds MISSING_ROLE diagnostic."""
    raw_text = (
        "KINH NGHIỆM LÀM VIỆC:\n"
        "Công ty Cổ phần Alpha Technology (01/2022 - 06/2023)\n"
        "- Lập trình và bảo trì cơ sở hạ tầng dịch vụ đám mây."
    )
    entries = extractor.extract_entries(raw_text)
    assert len(entries) == 1

    entry = entries[0]
    assert "Alpha Technology" in (entry.company or "")
    assert entry.role is None
    assert entry.start_date == "2022-01"
    assert "MISSING_ROLE" in entry.metadata.get("diagnostics", [])


def test_missing_date_range_returns_none_and_emits_diagnostic(extractor):
    """Verify missing dates return None for start/end and adds MISSING_DATE_RANGE diagnostic."""
    raw_text = (
        "KINH NGHIỆM LÀM VIỆC:\n"
        "Công ty TNHH Beta Solutions\n"
        "Vị trí: Backend Engineer\n"
        "- Xây dựng các module thanh toán trực tuyến."
    )
    entries = extractor.extract_entries(raw_text)
    assert len(entries) == 1

    entry = entries[0]
    assert "Beta Solutions" in (entry.company or "")
    assert "Backend Engineer" in (entry.role or "")
    assert entry.start_date is None
    assert entry.end_date is None
    assert entry.duration_months is None
    assert entry.is_current is False
    assert "MISSING_DATE_RANGE" in entry.metadata.get("diagnostics", [])


# ==============================================================================
# 3. SPAN & EVIDENCE BLOCK GROUNDING ACROSS ALL 12 FIXTURES
# ==============================================================================

def test_evidence_grounding_fidelity_across_all_12_fixtures(extractor):
    """Verify all extracted experience entries across all fixtures strictly reference valid blocks."""
    for fixture_key, fixture_data in CV_FIXTURES.items():
        raw_text = fixture_data["raw_text"]
        blocks = TextChunker.chunk_to_evidence_blocks(raw_text)
        block_id_set = {b.block_id for b in blocks}

        entries = extractor.extract_entries(raw_text, evidence_blocks=blocks, doc_id=fixture_key)

        for entry in entries:
            assert len(entry.evidence_block_ids) > 0, f"Entry {entry.entry_id} in {fixture_key} has no blocks!"
            for bid in entry.evidence_block_ids:
                assert bid in block_id_set, (
                    f"Orphan evidence_block_id '{bid}' in entry '{entry.entry_id}' ({fixture_key})!"
                )


def test_convenience_function_extract_experience_entries():
    """Verify convenience module-level function works identically."""
    raw_text = (
        "KINH NGHIỆM LÀM VIỆC:\n"
        "Công ty Cổ phần VNG (01/2021 - 12/2023)\n"
        "Vị trí: Senior Software Engineer\n"
        "- Phát triển hệ thống xử lý tin nhắn bằng Python và Redis."
    )
    entries = extract_experience_entries(raw_text, doc_id="vng_doc")
    assert len(entries) == 1
    assert "VNG" in (entries[0].company or "")
    assert "Senior Software Engineer" in (entries[0].role or "")
    assert entries[0].entry_id == "exp_vng_doc_01"

