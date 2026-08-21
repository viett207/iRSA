import hashlib
import unicodedata
from datetime import UTC, datetime
from typing import Any, ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.models.evidence import EvidenceBlock

# Centralized parser version for all fingerprinting, chunking, and cache invalidation
PARSER_VERSION: str = "v1"


def compute_content_hash(raw_text: str, normalize_newlines: bool = True) -> str:
    """Compute a deterministic, stable cryptographic SHA-256 content hash of raw CV text.

    Guarantees:
    - Cryptographically stable (independent of Python's randomized hash seed).
    - Changing raw text (even a single character/whitespace) strictly produces a distinct hash.
    - Identical content across operating systems (CRLF vs LF) produces the exact same hash when normalized.
    - Returns a 64-character lowercase hex string.
    """
    if not raw_text:
        return hashlib.sha256(b"").hexdigest()

    # Normalize Windows (\r\n) and Unix (\n) newlines for cross-platform stability
    normalized = raw_text.replace("\r\n", "\n").replace("\r", "\n") if normalize_newlines else raw_text

    # Unicode canonical normalization (NFC) for consistent multi-byte Vietnamese diacritics
    normalized = unicodedata.normalize("NFC", normalized)

    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def generate_fingerprint_cache_key(
    content_hash: str,
    parser_version: str = PARSER_VERSION,
    prefix: str = "cv_fp",
) -> str:
    """Generate a deterministic, privacy-safe cache key for CVFingerprint.

    Security & Privacy Guarantees:
    - NEVER contains raw CV text, candidate names, emails, phones, or any sensitive PII.
    - Key depends ONLY on prefix, parser_version, and cryptographic content_hash.
    - Format: {prefix}:{parser_version}:{content_hash}
    - Changing parser_version automatically invalidates prior cache entries.
    """
    clean_hash = content_hash.strip().lower()
    clean_version = (parser_version or PARSER_VERSION).strip()
    return f"{prefix}:{clean_version}:{clean_hash}"


class SkillMention(BaseModel):
    """Normalized candidate skill mention grounded in evidence blocks."""
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    skill_name: str = Field(
        min_length=1,
        description="Standardized normalized skill name (e.g. 'Python', 'FastAPI', 'Docker')",
    )
    category: str | None = Field(
        default=None,
        description="Skill domain/category: backend, frontend, devops, database, cloud, soft_skill, etc.",
    )
    raw_mention: str | None = Field(
        default=None,
        description="Exact raw substring mentioned in the CV",
    )
    proficiency_level: Literal["beginner", "intermediate", "advanced", "expert", "unknown"] = Field(
        default="unknown",
        description="Assessed proficiency level based on surrounding text",
    )
    years_experience: float | None = Field(
        default=None,
        ge=0.0,
        description="Estimated years associated with this skill if explicitly stated",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Extraction confidence score [0.0, 1.0]",
    )
    evidence_block_ids: list[str] = Field(
        min_length=1,
        description="List of EvidenceBlock IDs grounding this skill mention",
    )
    char_spans: list[tuple[int, int]] = Field(
        default_factory=list,
        description="Optional list of [char_start, char_end] spans within source document",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional auxiliary attributes",
    )


class ExperienceEntry(BaseModel):
    """Extracted work experience fact grounded in evidence blocks."""
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    entry_id: str | None = Field(
        default=None,
        description="Optional unique identifier for this experience entry",
    )
    company: str | None = Field(
        default=None,
        description="Company or employer organization name",
    )
    role: str | None = Field(
        default=None,
        description="Job title or position held",
    )
    start_date: str | None = Field(
        default=None,
        description="Start date representation (e.g. '2021-01', '01/2021', '2021')",
    )
    end_date: str | None = Field(
        default=None,
        description="End date representation (e.g. '2024-03', 'Present', 'Hiện tại')",
    )
    duration_months: int | None = Field(
        default=None,
        ge=0,
        description="Estimated duration in months",
    )
    is_current: bool = Field(
        default=False,
        description="True if candidate currently works in this role",
    )
    responsibilities: list[str] = Field(
        default_factory=list,
        description="Key responsibilities and bullet points",
    )
    technologies: list[str] = Field(
        default_factory=list,
        description="Technologies and frameworks used in this role",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Extraction confidence score [0.0, 1.0]",
    )
    evidence_block_ids: list[str] = Field(
        min_length=1,
        description="List of EvidenceBlock IDs grounding this work experience fact",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional auxiliary attributes",
    )


class ProjectEntry(BaseModel):
    """Extracted project fact grounded in evidence blocks."""
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    project_id: str | None = Field(
        default=None,
        description="Optional unique identifier for this project entry",
    )
    project_name: str = Field(
        min_length=1,
        description="Name or title of project",
    )
    role: str | None = Field(
        default=None,
        description="Candidate role in project (e.g. 'Lead Developer', 'Solo Creator')",
    )
    description: str | None = Field(
        default=None,
        description="Brief summary of project objectives and architecture",
    )
    technologies: list[str] = Field(
        default_factory=list,
        description="Technologies and stack used in this project",
    )
    start_date: str | None = None
    end_date: str | None = None
    highlights: list[str] = Field(
        default_factory=list,
        description="Key metrics, achievements, or outcomes",
    )
    url: str | None = Field(
        default=None,
        description="Repository or live demo URL",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Extraction confidence score [0.0, 1.0]",
    )
    evidence_block_ids: list[str] = Field(
        min_length=1,
        description="List of EvidenceBlock IDs grounding this project fact",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional auxiliary attributes",
    )


class EducationEntry(BaseModel):
    """Extracted education fact grounded in evidence blocks."""
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    education_id: str | None = Field(
        default=None,
        description="Optional unique identifier for this education entry",
    )
    institution: str = Field(
        min_length=1,
        description="University, College, School, or Academy name",
    )
    degree: str | None = Field(
        default=None,
        description="Degree level (e.g. 'Bachelor', 'Master', 'PhD', 'Cử nhân', 'Kỹ sư')",
    )
    field_of_study: str | None = Field(
        default=None,
        description="Major or specialized field (e.g. 'Computer Science', 'CNTT')",
    )
    start_year: int | None = Field(
        default=None,
        ge=1950,
        le=2100,
        description="Start year",
    )
    end_year: int | None = Field(
        default=None,
        ge=1950,
        le=2100,
        description="Graduation year / Expected completion",
    )
    gpa: float | None = Field(
        default=None,
        ge=0.0,
        description="Grade point average if mentioned",
    )
    honors: str | None = Field(
        default=None,
        description="Graduation honors (e.g. 'Xuất sắc', 'First Class Honors')",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Extraction confidence score [0.0, 1.0]",
    )
    evidence_block_ids: list[str] = Field(
        min_length=1,
        description="List of EvidenceBlock IDs grounding this education fact",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional auxiliary attributes",
    )


class CertificationEntry(BaseModel):
    """Extracted certification fact grounded in evidence blocks."""
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    certification_id: str | None = Field(
        default=None,
        description="Optional unique identifier for this certification",
    )
    name: str = Field(
        min_length=1,
        description="Name/title of certificate or professional license",
    )
    issuer: str | None = Field(
        default=None,
        description="Issuing organization (e.g. 'AWS', 'Google', 'Microsoft')",
    )
    issue_date: str | None = Field(
        default=None,
        description="Issue date (e.g. '2023-05', '2023')",
    )
    expiry_date: str | None = Field(
        default=None,
        description="Expiration date (e.g. '2026-05')",
    )
    credential_id: str | None = Field(
        default=None,
        description="Credential / License ID",
    )
    credential_url: str | None = Field(
        default=None,
        description="Online verification URL",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Extraction confidence score [0.0, 1.0]",
    )
    evidence_block_ids: list[str] = Field(
        min_length=1,
        description="List of EvidenceBlock IDs grounding this certification",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional auxiliary attributes",
    )


class AwardEntry(BaseModel):
    """Extracted award or honor fact grounded in evidence blocks."""
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    award_id: str | None = Field(
        default=None,
        description="Optional unique identifier for this award",
    )
    title: str = Field(
        min_length=1,
        description="Title or name of award/prize",
    )
    issuer: str | None = None
    year: int | None = None
    description: str | None = None
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Extraction confidence score [0.0, 1.0]",
    )
    evidence_block_ids: list[str] = Field(
        min_length=1,
        description="List of EvidenceBlock IDs grounding this award",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional auxiliary attributes",
    )


class CandidateProfileHeader(BaseModel):
    """Basic candidate profile metadata extracted from CV header/summary."""
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None
    summary: str | None = None
    evidence_block_ids: list[str] = Field(
        default_factory=list,
        description="EvidenceBlock IDs grounding profile information",
    )


class FingerprintDiagnostics(BaseModel):
    """Diagnostics and quality metrics for the extracted CVFingerprint."""
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    total_evidence_blocks: int = 0
    section_coverage: dict[str, int] = Field(
        default_factory=dict,
        description="Count of evidence blocks per section",
    )
    low_confidence_sections: list[str] = Field(
        default_factory=list,
        description="Sections with low detection confidence",
    )
    orphan_facts_count: int = Field(
        default=0,
        description="Count of facts referencing non-existent evidence blocks",
    )
    parsing_warnings: list[str] = Field(
        default_factory=list,
        description="Diagnostic warnings emitted during parsing/validation",
    )
    validation_status: str = "valid"


class CVFingerprint(BaseModel):
    """Immutable, JD-independent candidate CV semantic fingerprint.

    Contains verified chunk evidence blocks and structured facts (skills, experience,
    projects, education, certifications, awards). All facts are strictly grounded
    to EvidenceBlock IDs.
    """
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    PARSER_VERSION: ClassVar[str] = PARSER_VERSION

    resume_id: str = Field(
        description="Unique identifier for the CV / candidate document",
    )
    source_id: str | None = Field(
        default=None,
        description="Optional external or alias identifier",
    )
    content_hash: str = Field(
        min_length=8,
        description="Cryptographic SHA-256 hash of raw CV text",
    )
    parser_version: str = Field(
        default=PARSER_VERSION,
        description="Parser and TextChunker version used for extraction",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="UTC timestamp of fingerprint generation",
    )
    raw_text_length: int = Field(
        ge=0,
        description="Length of raw CV source text in characters",
    )
    candidate_header: CandidateProfileHeader | None = None
    evidence_blocks: list[EvidenceBlock] = Field(
        default_factory=list,
        description="List of verified, immutable evidence text chunks",
    )
    normalized_skill_mentions: list[SkillMention] = Field(
        default_factory=list,
        description="Extracted normalized skills with evidence grounding",
    )
    experience_entries: list[ExperienceEntry] = Field(
        default_factory=list,
        description="Extracted work experience facts with evidence grounding",
    )
    project_entries: list[ProjectEntry] = Field(
        default_factory=list,
        description="Extracted project facts with evidence grounding",
    )
    education_entries: list[EducationEntry] = Field(
        default_factory=list,
        description="Extracted education facts with evidence grounding",
    )
    certification_entries: list[CertificationEntry] = Field(
        default_factory=list,
        description="Extracted certification facts with evidence grounding",
    )
    award_entries: list[AwardEntry] = Field(
        default_factory=list,
        description="Extracted award/honor facts with evidence grounding",
    )
    diagnostics: FingerprintDiagnostics | None = None
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional custom attributes (language, source_format, tags)",
    )

    @model_validator(mode="after")
    def validate_source_consistency(self) -> "CVFingerprint":
        """Ensure source_id defaults to resume_id if not provided."""
        if not self.source_id:
            self.source_id = self.resume_id
        return self

    @classmethod
    def compute_hash(cls, raw_text: str, normalize_newlines: bool = True) -> str:
        """Compute stable SHA-256 content hash for raw text."""
        return compute_content_hash(raw_text, normalize_newlines=normalize_newlines)

    @classmethod
    def generate_cache_key(
        cls,
        content_hash: str,
        parser_version: str | None = None,
        prefix: str = "cv_fp",
    ) -> str:
        """Generate privacy-safe cache key without raw CV text."""
        return generate_fingerprint_cache_key(
            content_hash=content_hash,
            parser_version=parser_version or cls.PARSER_VERSION,
            prefix=prefix,
        )

    @property
    def cache_key(self) -> str:
        """Return the deterministic cache key for this fingerprint instance."""
        return generate_fingerprint_cache_key(
            content_hash=self.content_hash,
            parser_version=self.parser_version,
        )

    def get_evidence_map(self) -> dict[str, EvidenceBlock]:
        """Return a mapping of block_id -> EvidenceBlock for fast lookup."""
        return {b.block_id: b for b in self.evidence_blocks}

    def validate_fact_grounding(self) -> tuple[bool, list[str]]:
        """Verify that every evidence_block_id referenced in extracted facts exists in evidence_blocks.

        Returns:
            (is_grounded, orphan_errors)
        """
        valid_ids = {b.block_id for b in self.evidence_blocks}
        errors: list[str] = []

        # 1. Skills
        for s in self.normalized_skill_mentions:
            for eid in s.evidence_block_ids:
                if eid not in valid_ids:
                    errors.append(f"Skill '{s.skill_name}' references non-existent block_id '{eid}'")

        # 2. Experience
        for exp in self.experience_entries:
            for eid in exp.evidence_block_ids:
                if eid not in valid_ids:
                    errors.append(f"Experience '{exp.role or exp.company}' references non-existent block_id '{eid}'")

        # 3. Projects
        for proj in self.project_entries:
            for eid in proj.evidence_block_ids:
                if eid not in valid_ids:
                    errors.append(f"Project '{proj.project_name}' references non-existent block_id '{eid}'")

        # 4. Education
        for edu in self.education_entries:
            for eid in edu.evidence_block_ids:
                if eid not in valid_ids:
                    errors.append(f"Education '{edu.institution}' references non-existent block_id '{eid}'")

        # 5. Certifications
        for cert in self.certification_entries:
            for eid in cert.evidence_block_ids:
                if eid not in valid_ids:
                    errors.append(f"Certification '{cert.name}' references non-existent block_id '{eid}'")

        # 6. Awards
        for awd in self.award_entries:
            for eid in awd.evidence_block_ids:
                if eid not in valid_ids:
                    errors.append(f"Award '{awd.title}' references non-existent block_id '{eid}'")

        return len(errors) == 0, errors

