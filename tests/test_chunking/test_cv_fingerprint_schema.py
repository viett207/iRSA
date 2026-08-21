"""Unit tests for JD-independent CVFingerprint schema and fact-to-evidence grounding.

Verifies:
1. CVFingerprint initialization and field validation.
2. 100% JSON and dict roundtrip serialization fidelity.
3. Every extracted fact (skill, experience, project, education, certification, award)
   strictly requires at least one EvidenceBlock ID (`evidence_block_ids`).
4. `validate_fact_grounding()` detects missing/orphan block references.
5. `source_id` defaults to `resume_id`.
6. Complete decoupling from Job Description (JD) models.
7. Realistic construction and serialization from real CV fixture chunks.
"""

import hashlib
import json

import pytest
from pydantic import ValidationError

from src.chunking.text_chunker import TextChunker
from src.models.cv_fingerprint import (
    AwardEntry,
    CandidateProfileHeader,
    CertificationEntry,
    CVFingerprint,
    EducationEntry,
    ExperienceEntry,
    FingerprintDiagnostics,
    ProjectEntry,
    SkillMention,
)
from src.models.evidence import ChunkLevel, CVSection, EvidenceBlock
from tests.fixtures.cv_fixtures import CV_FIXTURES


@pytest.fixture
def sample_evidence_blocks():
    """Create sample verified EvidenceBlocks for grounding tests."""
    return [
        EvidenceBlock(
            block_id="blk_001",
            text="Lập trình viên Backend Python và FastAPI với 4 năm kinh nghiệm.",
            char_start=0,
            char_end=64,
            section=CVSection.EXPERIENCE,
            section_confidence=0.95,
            chunk_level=ChunkLevel.LINE,
        ),
        EvidenceBlock(
            block_id="blk_002",
            text="Kỹ năng: Python, FastAPI, Docker, Kubernetes, PostgreSQL, Redis.",
            char_start=65,
            char_end=129,
            section=CVSection.SKILLS,
            section_confidence=0.95,
            chunk_level=ChunkLevel.LINE,
        ),
        EvidenceBlock(
            block_id="blk_003",
            text="Đại học Bách Khoa Hà Nội - Cử nhân Công nghệ Thông tin (2016 - 2020).",
            char_start=130,
            char_end=198,
            section=CVSection.EDUCATION,
            section_confidence=0.95,
            chunk_level=ChunkLevel.LINE,
        ),
        EvidenceBlock(
            block_id="blk_004",
            text="Chứng chỉ: AWS Certified Solutions Architect Associate (2023).",
            char_start=199,
            char_end=260,
            section=CVSection.CERTIFICATIONS,
            section_confidence=0.90,
            chunk_level=ChunkLevel.LINE,
        ),
        EvidenceBlock(
            block_id="blk_005",
            text="Dự án Hệ thống Thanh toán E-Commerce (Lead Backend Developer).",
            char_start=261,
            char_end=323,
            section=CVSection.PROJECTS,
            section_confidence=0.90,
            chunk_level=ChunkLevel.LINE,
        ),
        EvidenceBlock(
            block_id="blk_006",
            text="Giải nhì Olympic Tin học Sinh viên Toàn quốc năm 2019.",
            char_start=324,
            char_end=378,
            section=CVSection.AWARDS,
            section_confidence=0.90,
            chunk_level=ChunkLevel.LINE,
        ),
    ]


@pytest.fixture
def sample_fingerprint(sample_evidence_blocks):
    """Construct a complete, verified CVFingerprint instance."""
    return CVFingerprint(
        resume_id="resume_cand_001",
        source_id="cand_profile_001",
        content_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        parser_version="v1",
        raw_text_length=378,
        candidate_header=CandidateProfileHeader(
            full_name="Nguyễn Văn A",
            email="nguyenvana@example.com",
            phone="0912345678",
            evidence_block_ids=["blk_001"],
        ),
        evidence_blocks=sample_evidence_blocks,
        normalized_skill_mentions=[
            SkillMention(
                skill_name="Python",
                category="backend",
                raw_mention="Python",
                proficiency_level="advanced",
                years_experience=4.0,
                confidence=0.98,
                evidence_block_ids=["blk_001", "blk_002"],
                char_spans=[(23, 29), (73, 79)],
            ),
            SkillMention(
                skill_name="FastAPI",
                category="backend",
                raw_mention="FastAPI",
                proficiency_level="intermediate",
                confidence=0.95,
                evidence_block_ids=["blk_001", "blk_002"],
                char_spans=[(33, 40), (81, 88)],
            ),
        ],
        experience_entries=[
            ExperienceEntry(
                entry_id="exp_01",
                company="Công ty ABC",
                role="Lập trình viên Backend",
                start_date="2020-01",
                end_date="2024-01",
                duration_months=48,
                is_current=True,
                responsibilities=["Thiết kế kiến trúc microservices với FastAPI."],
                technologies=["Python", "FastAPI", "Redis"],
                confidence=0.95,
                evidence_block_ids=["blk_001"],
            ),
        ],
        project_entries=[
            ProjectEntry(
                project_id="proj_01",
                project_name="Hệ thống Thanh toán E-Commerce",
                role="Lead Backend Developer",
                description="Hệ thống thanh toán xử lý 5000 req/s",
                technologies=["Python", "FastAPI", "PostgreSQL"],
                highlights=["Giảm 30% latency phản hồi"],
                confidence=0.92,
                evidence_block_ids=["blk_005"],
            ),
        ],
        education_entries=[
            EducationEntry(
                education_id="edu_01",
                institution="Đại học Bách Khoa Hà Nội",
                degree="Cử nhân",
                field_of_study="Công nghệ Thông tin",
                start_year=2016,
                end_year=2020,
                gpa=3.6,
                honors="Giỏi",
                confidence=0.96,
                evidence_block_ids=["blk_003"],
            ),
        ],
        certification_entries=[
            CertificationEntry(
                certification_id="cert_01",
                name="AWS Certified Solutions Architect Associate",
                issuer="Amazon Web Services",
                issue_date="2023",
                confidence=0.95,
                evidence_block_ids=["blk_004"],
            ),
        ],
        award_entries=[
            AwardEntry(
                award_id="awd_01",
                title="Giải nhì Olympic Tin học Sinh viên",
                issuer="Hội Tin học Việt Nam",
                year=2019,
                confidence=0.90,
                evidence_block_ids=["blk_006"],
            ),
        ],
        diagnostics=FingerprintDiagnostics(
            total_evidence_blocks=6,
            section_coverage={
                "experience": 1,
                "skills": 1,
                "education": 1,
                "certifications": 1,
                "projects": 1,
                "awards": 1,
            },
            low_confidence_sections=[],
            orphan_facts_count=0,
            parsing_warnings=[],
            validation_status="valid",
        ),
        metadata={"detected_language": "vi", "source_format": "text"},
    )


# ==============================================================================
# 1. INITIALIZATION & FIELD CHECKS
# ==============================================================================

def test_cv_fingerprint_initialization(sample_fingerprint):
    """Verify CVFingerprint constructs properly with all structured fact collections."""
    fp = sample_fingerprint
    assert fp.resume_id == "resume_cand_001"
    assert fp.source_id == "cand_profile_001"
    assert fp.content_hash.startswith("e3b0c442")
    assert fp.parser_version == "v1"
    assert len(fp.evidence_blocks) == 6
    assert len(fp.normalized_skill_mentions) == 2
    assert len(fp.experience_entries) == 1
    assert len(fp.project_entries) == 1
    assert len(fp.education_entries) == 1
    assert len(fp.certification_entries) == 1
    assert len(fp.award_entries) == 1
    assert fp.diagnostics is not None
    assert fp.diagnostics.total_evidence_blocks == 6


def test_source_id_defaults_to_resume_id():
    """Verify source_id defaults to resume_id when omitted."""
    fp = CVFingerprint(
        resume_id="cv_unique_999",
        content_hash="abcdef12345678",
        raw_text_length=100,
    )
    assert fp.source_id == "cv_unique_999"


# ==============================================================================
# 2. JSON & DICTIONARY SERIALIZATION ROUNDTRIP
# ==============================================================================

def test_json_roundtrip_serialization_fidelity(sample_fingerprint):
    """Verify 100% JSON roundtrip serialization fidelity (model_dump_json -> model_validate_json)."""
    original = sample_fingerprint
    json_str = original.model_dump_json()

    # Must be valid JSON
    parsed_json = json.loads(json_str)
    assert parsed_json["resume_id"] == original.resume_id
    assert len(parsed_json["evidence_blocks"]) == 6

    # Restore from JSON
    restored = CVFingerprint.model_validate_json(json_str)

    assert restored.resume_id == original.resume_id
    assert restored.content_hash == original.content_hash
    assert restored.raw_text_length == original.raw_text_length
    assert len(restored.evidence_blocks) == len(original.evidence_blocks)
    assert len(restored.normalized_skill_mentions) == len(original.normalized_skill_mentions)
    assert len(restored.experience_entries) == len(original.experience_entries)
    assert len(restored.project_entries) == len(original.project_entries)
    assert len(restored.education_entries) == len(original.education_entries)
    assert len(restored.certification_entries) == len(original.certification_entries)
    assert len(restored.award_entries) == len(original.award_entries)

    # Check nested fields
    assert restored.normalized_skill_mentions[0].skill_name == "Python"
    assert restored.normalized_skill_mentions[0].evidence_block_ids == ["blk_001", "blk_002"]
    assert restored.experience_entries[0].technologies == ["Python", "FastAPI", "Redis"]


def test_dict_roundtrip_serialization(sample_fingerprint):
    """Verify model_dump and model_validate roundtrip fidelity."""
    original = sample_fingerprint
    data_dict = original.model_dump()

    restored = CVFingerprint.model_validate(data_dict)
    assert restored.resume_id == original.resume_id
    assert restored.created_at == original.created_at
    assert len(restored.evidence_blocks) == 6


# ==============================================================================
# 3. FACT-TO-EVIDENCE GROUNDING VALIDATION
# ==============================================================================

def test_facts_must_have_at_least_one_evidence_block_id():
    """Verify all fact models reject empty evidence_block_ids."""
    # 1. SkillMention
    with pytest.raises(ValidationError):
        SkillMention(skill_name="Python", evidence_block_ids=[])

    # 2. ExperienceEntry
    with pytest.raises(ValidationError):
        ExperienceEntry(role="Backend Eng", evidence_block_ids=[])

    # 3. ProjectEntry
    with pytest.raises(ValidationError):
        ProjectEntry(project_name="AI Search", evidence_block_ids=[])

    # 4. EducationEntry
    with pytest.raises(ValidationError):
        EducationEntry(institution="HUST", evidence_block_ids=[])

    # 5. CertificationEntry
    with pytest.raises(ValidationError):
        CertificationEntry(name="AWS SAA", evidence_block_ids=[])

    # 6. AwardEntry
    with pytest.raises(ValidationError):
        AwardEntry(title="First Prize", evidence_block_ids=[])


def test_validate_fact_grounding_detects_orphan_references(sample_fingerprint):
    """Verify validate_fact_grounding passes on grounded facts and flags orphan block IDs."""
    fp = sample_fingerprint

    # 1. Grounded fingerprint should pass with 0 errors
    is_valid, errors = fp.validate_fact_grounding()
    assert is_valid is True
    assert len(errors) == 0

    # 2. Add an orphan skill pointing to non-existent block 'blk_missing'
    fp.normalized_skill_mentions.append(
        SkillMention(
            skill_name="Rust",
            evidence_block_ids=["blk_missing_999"],
        )
    )

    is_valid_bad, errors_bad = fp.validate_fact_grounding()
    assert is_valid_bad is False
    assert len(errors_bad) == 1
    assert "Rust" in errors_bad[0]
    assert "blk_missing_999" in errors_bad[0]


def test_get_evidence_map_lookup(sample_fingerprint):
    """Verify fast dictionary lookup of evidence blocks by ID."""
    fp = sample_fingerprint
    ev_map = fp.get_evidence_map()

    assert "blk_001" in ev_map
    assert "blk_002" in ev_map
    assert ev_map["blk_001"].text.startswith("Lập trình viên Backend")
    assert ev_map["blk_003"].section == "education"


# ==============================================================================
# 4. DECOUPLING FROM JOB DESCRIPTION (JD)
# ==============================================================================

def test_cv_fingerprint_is_completely_jd_independent():
    """Verify CVFingerprint contains NO job description, criteria, score, or match fields."""
    fp_fields = set(CVFingerprint.model_fields.keys())

    # Ensure no JD-specific fields exist in the schema
    forbidden_jd_terms = {
        "job_id",
        "jd_id",
        "job_description",
        "job_title",
        "overall_score",
        "match_score",
        "recommendation",
        "criteria",
        "application_id",
        "evaluated_at",
    }

    intersecting = fp_fields.intersection(forbidden_jd_terms)
    assert len(intersecting) == 0, f"Found JD-dependent fields in CVFingerprint: {intersecting}"


# ==============================================================================
# 5. REAL CV FIXTURE CHUNKING TO FINGERPRINT INTEGRATION
# ==============================================================================

def test_construct_fingerprint_from_real_cv_fixture():
    """Verify constructing a complete CVFingerprint from TextChunker output on a real fixture."""
    fixture_data = CV_FIXTURES["python_in_skills_only"]
    raw_text = fixture_data["raw_text"]

    # 1. Chunk CV text into typed EvidenceBlocks
    evidence_blocks = TextChunker.chunk_to_evidence_blocks(raw_text)
    assert len(evidence_blocks) > 0

    content_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

    # 2. Find relevant blocks for facts
    python_blocks = [b.block_id for b in evidence_blocks if "Python" in b.text]
    assert len(python_blocks) > 0

    edu_blocks = [b.block_id for b in evidence_blocks if b.section == "education"]
    assert len(edu_blocks) > 0

    # 3. Create CVFingerprint
    fingerprint = CVFingerprint(
        resume_id="fixture_cv_01",
        content_hash=content_hash,
        parser_version="v1",
        raw_text_length=len(raw_text),
        evidence_blocks=evidence_blocks,
        normalized_skill_mentions=[
            SkillMention(
                skill_name="Python",
                category="backend",
                evidence_block_ids=python_blocks[:2],
            ),
        ],
        education_entries=[
            EducationEntry(
                institution="Đại học Bách Khoa Hà Nội",
                evidence_block_ids=[edu_blocks[0]],
            ),
        ],
    )

    # 4. Verify grounding & serialization
    is_valid, errors = fingerprint.validate_fact_grounding()
    assert is_valid is True, f"Grounding errors: {errors}"

    json_output = fingerprint.model_dump_json()
    assert len(json_output) > 100

    restored = CVFingerprint.model_validate_json(json_output)
    assert restored.resume_id == "fixture_cv_01"
    assert len(restored.evidence_blocks) == len(evidence_blocks)

