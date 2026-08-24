"""Unit tests for Grounded Skill Attachment & Entity Binding.

Verifies all core requirements:
1. Grounding based on Block Ownership (matching EvidenceBlock IDs).
2. Grounding based on Span Containment (character offset inclusion).
3. Anti-pollution: Skills from the Skills section are NEVER attached to an Experience entry.
4. Unresolved marking: Mentions with section=unknown are strictly marked as unresolved.
5. Strict evidence preservation: every relationship maintains its evidence_id.
6. Support for both ExperienceEntry and ProjectEntry targets.
7. Multi-occurrence resolution across sections (e.g. Python in Skills and Experience).
8. Real CV fixture regression tests (CV-01: Skills only vs CV-02: Experience).
9. CVFingerprint integration methods and validation checks.
"""

import json
import pytest
from pydantic import ValidationError

from src.chunking.experience_extractor import ExperienceExtractor
from src.chunking.skill_attachment import (
    SkillBinder,
    attach_skills_to_entries,
    bind_skills,
    extract_and_bind_skills,
)
from src.models.cv_fingerprint import (
    CandidateProfileHeader,
    CVFingerprint,
    ExperienceEntry,
    ProjectEntry,
    SkillAttachment,
    SkillAttachmentStatus,
    SkillMention,
)
from src.models.evidence import ChunkLevel, CVSection, EvidenceBlock
from tests.fixtures.cv_fixtures import CV_FIXTURES


# ==============================================================================
# FIXTURES
# ==============================================================================

@pytest.fixture
def binder():
    return SkillBinder()


@pytest.fixture
def sample_blocks():
    """Create sample blocks across different sections."""
    return [
        # Experience blocks (Company ABC)
        EvidenceBlock(
            block_id="blk_exp_01",
            text="Công ty Cổ phần Công nghệ ABC (01/2022 - 01/2024)",
            char_start=0,
            char_end=50,
            section=CVSection.EXPERIENCE,
            chunk_level=ChunkLevel.LINE,
        ),
        EvidenceBlock(
            block_id="blk_exp_02",
            text="- Phát triển backend microservices với FastAPI, Python và Redis.",
            char_start=51,
            char_end=116,
            section=CVSection.EXPERIENCE,
            chunk_level=ChunkLevel.LINE,
        ),
        # Skills section blocks
        EvidenceBlock(
            block_id="blk_skills_01",
            text="KỸ NĂNG: Python, Docker, Kubernetes, AWS, PostgreSQL",
            char_start=120,
            char_end=172,
            section=CVSection.SKILLS,
            chunk_level=ChunkLevel.LINE,
        ),
        # Project section blocks
        EvidenceBlock(
            block_id="blk_proj_01",
            text="Dự án E-Commerce Payment Gateway (06/2023 - 12/2023)",
            char_start=180,
            char_end=232,
            section=CVSection.PROJECTS,
            chunk_level=ChunkLevel.LINE,
        ),
        EvidenceBlock(
            block_id="blk_proj_02",
            text="- Xây dựng kiến trúc thanh toán bằng Golang, Kafka và PostgreSQL.",
            char_start=233,
            char_end=298,
            section=CVSection.PROJECTS,
            chunk_level=ChunkLevel.LINE,
        ),
        # Unknown section blocks
        EvidenceBlock(
            block_id="blk_unk_01",
            text="Một số kinh nghiệm khác với Rust và WebAssembly",
            char_start=300,
            char_end=347,
            section=CVSection.UNKNOWN,
            chunk_level=ChunkLevel.LINE,
        ),
    ]


@pytest.fixture
def sample_experience_entry():
    return ExperienceEntry(
        entry_id="exp_01",
        company="Công ty Cổ phần Công nghệ ABC",
        role="Backend Engineer",
        start_date="2022-01",
        end_date="2024-01",
        evidence_block_ids=["blk_exp_01", "blk_exp_02"],
    )


@pytest.fixture
def sample_project_entry():
    return ProjectEntry(
        project_id="proj_01",
        project_name="E-Commerce Payment Gateway",
        role="Lead Developer",
        evidence_block_ids=["blk_proj_01", "blk_proj_02"],
    )


# ==============================================================================
# 1. BLOCK OWNERSHIP ATTACHMENT
# ==============================================================================

def test_attach_by_block_ownership_to_experience(binder, sample_blocks, sample_experience_entry):
    """Verify skill mention is attached to ExperienceEntry when block_id is owned by the entry."""
    mention = SkillMention(
        skill_name="FastAPI",
        raw_mention="FastAPI",
        evidence_block_ids=["blk_exp_02"],
        char_spans=[(80, 87)],
    )

    attachments = binder.bind_all(
        skill_mentions=[mention],
        experience_entries=[sample_experience_entry],
        evidence_blocks=sample_blocks,
    )

    assert len(attachments) == 1
    att = attachments[0]
    assert att.status == SkillAttachmentStatus.ATTACHED.value
    assert att.is_attached is True
    assert att.target_type == "experience"
    assert att.target_id == "exp_01"
    assert "ABC" in (att.target_name or "")
    assert att.evidence_id == "blk_exp_02"
    assert att.metadata.get("binding_method") == "block_ownership"

    # Verify ExperienceEntry was updated
    assert len(sample_experience_entry.skill_attachments) == 1
    assert sample_experience_entry.skill_attachments[0].skill_name == "FastAPI"
    assert "FastAPI" in sample_experience_entry.technologies

    # Verify SkillMention fields were updated
    assert mention.attached_entry_id == "exp_01"
    assert mention.attached_entry_type == "experience"
    assert mention.attachment_status == "attached"
    assert mention.primary_evidence_id == "blk_exp_02"
    assert mention.is_unresolved is False


def test_attach_by_block_ownership_to_project(binder, sample_blocks, sample_project_entry):
    """Verify skill mention is attached to ProjectEntry when block_id is owned by the project."""
    mention = SkillMention(
        skill_name="Kafka",
        raw_mention="Kafka",
        evidence_block_ids=["blk_proj_02"],
    )

    attachments = binder.bind_all(
        skill_mentions=[mention],
        project_entries=[sample_project_entry],
        evidence_blocks=sample_blocks,
    )

    assert len(attachments) == 1
    att = attachments[0]
    assert att.status == SkillAttachmentStatus.ATTACHED.value
    assert att.is_attached is True
    assert att.target_type == "project"
    assert att.target_id == "proj_01"
    assert att.target_name == "E-Commerce Payment Gateway"
    assert att.evidence_id == "blk_proj_02"
    assert att.metadata.get("binding_method") == "block_ownership"

    # Verify ProjectEntry was updated
    assert len(sample_project_entry.skill_attachments) == 1
    assert "Kafka" in sample_project_entry.technologies


# ==============================================================================
# 2. SPAN CONTAINMENT ATTACHMENT
# ==============================================================================

def test_attach_by_span_containment(binder, sample_blocks, sample_experience_entry):
    """Verify skill mention with non-explicit block_id attaches via character span containment."""
    # Create a sub-block or separate block within the experience entry's character span [0, 116]
    sub_block = EvidenceBlock(
        block_id="blk_sub_line",
        text="FastAPI microservices",
        char_start=60,
        char_end=81,
        section=CVSection.EXPERIENCE,
        chunk_level=ChunkLevel.WINDOW_30,
    )
    all_blocks = sample_blocks + [sub_block]

    mention = SkillMention(
        skill_name="FastAPI",
        evidence_block_ids=["blk_sub_line"],
        char_spans=[(60, 67)],
    )

    attachments = binder.bind_all(
        skill_mentions=[mention],
        experience_entries=[sample_experience_entry],
        evidence_blocks=all_blocks,
    )

    assert len(attachments) == 1
    att = attachments[0]
    assert att.status == SkillAttachmentStatus.ATTACHED.value
    assert att.target_type == "experience"
    assert att.target_id == "exp_01"
    assert att.evidence_id == "blk_sub_line"
    assert att.metadata.get("binding_method") == "span_containment"


# ==============================================================================
# 3. ANTI-POLLUTION: SKILLS FROM SKILLS SECTION NEVER ATTACH TO EXPERIENCE
# ==============================================================================

def test_skills_from_skills_section_never_attach_to_experience(binder, sample_blocks, sample_experience_entry):
    """Verify skill mentions from Skills section are marked skills_section and never attached to Experience."""
    skills_mention = SkillMention(
        skill_name="Kubernetes",
        raw_mention="Kubernetes",
        evidence_block_ids=["blk_skills_01"],
        char_spans=[(138, 148)],
    )

    attachments = binder.bind_all(
        skill_mentions=[skills_mention],
        experience_entries=[sample_experience_entry],
        evidence_blocks=sample_blocks,
    )

    assert len(attachments) == 1
    att = attachments[0]
    assert att.status == SkillAttachmentStatus.SKILLS_SECTION.value
    assert att.is_attached is False
    assert att.target_type is None
    assert att.target_id is None
    assert att.evidence_id == "blk_skills_01"
    assert att.section == "skills"

    # Must NOT pollute experience entry
    assert len(sample_experience_entry.skill_attachments) == 0
    assert "Kubernetes" not in sample_experience_entry.technologies

    # SkillMention status check
    assert skills_mention.attachment_status == SkillAttachmentStatus.SKILLS_SECTION.value
    assert skills_mention.attached_entry_id is None
    assert skills_mention.is_unresolved is False


# ==============================================================================
# 4. UNRESOLVED MARKING FOR SECTION=UNKNOWN
# ==============================================================================

def test_skill_with_unknown_section_marked_unresolved(binder, sample_blocks, sample_experience_entry):
    """Verify skill mentions in unknown section are strictly marked as unresolved."""
    unk_mention = SkillMention(
        skill_name="Rust",
        raw_mention="Rust",
        evidence_block_ids=["blk_unk_01"],
        char_spans=[(320, 324)],
    )

    attachments = binder.bind_all(
        skill_mentions=[unk_mention],
        experience_entries=[sample_experience_entry],
        evidence_blocks=sample_blocks,
    )

    assert len(attachments) == 1
    att = attachments[0]
    assert att.status == SkillAttachmentStatus.UNRESOLVED.value
    assert att.is_unresolved is True
    assert att.is_attached is False
    assert att.target_type is None
    assert att.target_id is None
    assert att.evidence_id == "blk_unk_01"
    assert att.section == "unknown"

    # SkillMention status check
    assert unk_mention.attachment_status == SkillAttachmentStatus.UNRESOLVED.value
    assert unk_mention.is_unresolved is True
    assert unk_mention.attached_entry_id is None


# ==============================================================================
# 5. STRICT EVIDENCE_ID PRESERVATION ON EVERY RELATION
# ==============================================================================

def test_every_relation_preserves_evidence_id(binder, sample_blocks, sample_experience_entry, sample_project_entry):
    """Verify all attachments without exception contain a non-empty, valid evidence_id."""
    mentions = [
        SkillMention(skill_name="Python", evidence_block_ids=["blk_exp_02"]),
        SkillMention(skill_name="Docker", evidence_block_ids=["blk_skills_01"]),
        SkillMention(skill_name="Golang", evidence_block_ids=["blk_proj_02"]),
        SkillMention(skill_name="Rust", evidence_block_ids=["blk_unk_01"]),
    ]

    attachments = binder.bind_all(
        skill_mentions=mentions,
        experience_entries=[sample_experience_entry],
        project_entries=[sample_project_entry],
        evidence_blocks=sample_blocks,
    )

    assert len(attachments) == 4
    for att in attachments:
        assert att.evidence_id is not None
        assert len(att.evidence_id) > 0
        assert att.evidence_id.startswith("blk_")
        assert len(att.evidence_block_ids) > 0


# ==============================================================================
# 6. MULTI-OCCURRENCE SKILL RESOLUTION ACROSS SECTIONS
# ==============================================================================

def test_multi_occurrence_skill_resolution(binder, sample_blocks, sample_experience_entry):
    """Verify skill appearing in both Experience and Skills sections produces 2 distinct attachments."""
    # Python in both blk_exp_02 (Experience) and blk_skills_01 (Skills)
    multi_mention = SkillMention(
        skill_name="Python",
        evidence_block_ids=["blk_exp_02", "blk_skills_01"],
    )

    attachments = binder.bind_all(
        skill_mentions=[multi_mention],
        experience_entries=[sample_experience_entry],
        evidence_blocks=sample_blocks,
    )

    assert len(attachments) == 2

    # First occurrence in Experience: attached to exp_01
    att_exp = [a for a in attachments if a.evidence_id == "blk_exp_02"][0]
    assert att_exp.status == "attached"
    assert att_exp.target_type == "experience"
    assert att_exp.target_id == "exp_01"

    # Second occurrence in Skills: marked skills_section
    att_skills = [a for a in attachments if a.evidence_id == "blk_skills_01"][0]
    assert att_skills.status == "skills_section"
    assert att_skills.target_type is None


# ==============================================================================
# 7. MULTI-COMPANY DISAMBIGUATION
# ==============================================================================

def test_multi_company_disambiguation(binder):
    """Verify skills are attached to the exact company entry they belong to."""
    blocks = [
        # Company A (01/2020 - 12/2021)
        EvidenceBlock(
            block_id="blk_a_01",
            text="Công ty A: Lập trình viên PHP Laravel (2020 - 2021)",
            char_start=0,
            char_end=50,
            section=CVSection.EXPERIENCE,
            chunk_level=ChunkLevel.LINE,
        ),
        # Company B (01/2022 - 12/2023)
        EvidenceBlock(
            block_id="blk_b_01",
            text="Công ty B: Lập trình viên Python FastAPI (2022 - 2023)",
            char_start=60,
            char_end=112,
            section=CVSection.EXPERIENCE,
            chunk_level=ChunkLevel.LINE,
        ),
    ]

    exp_a = ExperienceEntry(entry_id="exp_a", company="Công ty A", evidence_block_ids=["blk_a_01"])
    exp_b = ExperienceEntry(entry_id="exp_b", company="Công ty B", evidence_block_ids=["blk_b_01"])

    mentions = [
        SkillMention(skill_name="Laravel", evidence_block_ids=["blk_a_01"]),
        SkillMention(skill_name="FastAPI", evidence_block_ids=["blk_b_01"]),
    ]

    attachments = binder.bind_all(
        skill_mentions=mentions,
        experience_entries=[exp_a, exp_b],
        evidence_blocks=blocks,
    )

    assert len(attachments) == 2
    att_laravel = [a for a in attachments if a.skill_name == "Laravel"][0]
    att_fastapi = [a for a in attachments if a.skill_name == "FastAPI"][0]

    assert att_laravel.target_id == "exp_a"
    assert att_fastapi.target_id == "exp_b"

    assert "Laravel" in exp_a.technologies
    assert "FastAPI" in exp_b.technologies
    assert "FastAPI" not in exp_a.technologies


# ==============================================================================
# 8. REAL CV FIXTURES REGRESSION
# ==============================================================================

def test_fixture_cv01_python_in_skills_only():
    """Regression test on CV-01: Python in Skills section only must NOT attach to PHP experience."""
    fixture = CV_FIXTURES["python_in_skills_only"]
    raw_text = fixture["raw_text"]

    extractor = ExperienceExtractor()
    exp_entries = extractor.extract_entries(raw_text, doc_id="cv01")
    assert len(exp_entries) >= 1

    mentions, attachments = extract_and_bind_skills(
        raw_text=raw_text,
        experience_entries=exp_entries,
    )

    # 1. Python must be in skills_section and NOT attached to experience
    python_atts = [a for a in attachments if a.skill_name == "Python"]
    assert len(python_atts) > 0
    for p_att in python_atts:
        assert p_att.status == "skills_section"
        assert p_att.target_type is None
        assert p_att.target_id is None

    # 2. PHP and Laravel must be attached to the experience entry
    php_atts = [a for a in attachments if a.skill_name in ("PHP", "Laravel") and a.status == "attached"]
    assert len(php_atts) > 0
    for php_att in php_atts:
        assert php_att.target_id == exp_entries[0].entry_id


def test_fixture_cv02_python_in_experience():
    """Regression test on CV-02: Python in Experience section MUST attach to FPT experience entry."""
    fixture = CV_FIXTURES["python_in_experience_with_date_range"]
    raw_text = fixture["raw_text"]

    extractor = ExperienceExtractor()
    exp_entries = extractor.extract_entries(raw_text, doc_id="cv02")
    assert len(exp_entries) >= 1

    mentions, attachments = extract_and_bind_skills(
        raw_text=raw_text,
        experience_entries=exp_entries,
    )

    # Python must have at least one attached occurrence to FPT entry
    python_attached = [
        a for a in attachments
        if a.skill_name == "Python" and a.status == "attached" and a.target_id == exp_entries[0].entry_id
    ]
    assert len(python_attached) >= 1
    assert python_attached[0].evidence_id.startswith("blk_")


# ==============================================================================
# 9. CVFINGERPRINT INTEGRATION & GROUNDING VALIDATION
# ==============================================================================

def test_cv_fingerprint_bind_skill_mentions(sample_blocks, sample_experience_entry, sample_project_entry):
    """Verify CVFingerprint.bind_skill_mentions() method and query helpers."""
    fp = CVFingerprint(
        resume_id="cv_test_001",
        content_hash="abc1234567890",
        raw_text_length=500,
        evidence_blocks=sample_blocks,
        experience_entries=[sample_experience_entry],
        project_entries=[sample_project_entry],
        normalized_skill_mentions=[
            SkillMention(skill_name="Python", evidence_block_ids=["blk_exp_02"]),
            SkillMention(skill_name="Docker", evidence_block_ids=["blk_skills_01"]),
            SkillMention(skill_name="Golang", evidence_block_ids=["blk_proj_02"]),
            SkillMention(skill_name="Rust", evidence_block_ids=["blk_unk_01"]),
        ],
    )

    # Run binding directly on fingerprint
    attachments = fp.bind_skill_mentions()
    assert len(attachments) == 4
    assert len(fp.skill_attachments) == 4

    # Test query helpers
    exp_skills = fp.get_skills_for_experience("exp_01")
    assert len(exp_skills) == 1
    assert exp_skills[0].skill_name == "Python"

    proj_skills = fp.get_skills_for_project("proj_01")
    assert len(proj_skills) == 1
    assert proj_skills[0].skill_name == "Golang"

    unresolved_skills = fp.get_unresolved_skills()
    assert len(unresolved_skills) == 1
    assert unresolved_skills[0].skill_name == "Rust"

    skills_sec_skills = fp.get_skills_section_skills()
    assert len(skills_sec_skills) == 1
    assert skills_sec_skills[0].skill_name == "Docker"

    # Validate grounding passes
    is_valid, errors = fp.validate_fact_grounding()
    assert is_valid is True
    assert len(errors) == 0


def test_cv_fingerprint_json_roundtrip_with_skill_attachments(sample_blocks, sample_experience_entry):
    """Verify JSON roundtrip serialization with skill attachments."""
    fp = CVFingerprint(
        resume_id="cv_json_001",
        content_hash="11223344556677",
        raw_text_length=200,
        evidence_blocks=sample_blocks,
        experience_entries=[sample_experience_entry],
        normalized_skill_mentions=[
            SkillMention(skill_name="Python", evidence_block_ids=["blk_exp_02"]),
        ],
    )
    fp.bind_skill_mentions()

    json_str = fp.model_dump_json()
    restored = CVFingerprint.model_validate_json(json_str)

    assert len(restored.skill_attachments) == 1
    assert restored.skill_attachments[0].skill_name == "Python"
    assert restored.skill_attachments[0].target_id == "exp_01"
    assert restored.skill_attachments[0].evidence_id == "blk_exp_02"
