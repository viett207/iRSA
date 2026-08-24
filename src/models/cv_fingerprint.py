import hashlib
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime, timezone
from enum import Enum
from typing import Any, ClassVar, Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.models.evidence import CVSection, EvidenceBlock

# Centralized parser and policy versions
PARSER_VERSION: str = "v1"
POLICY_VERSION: str = "v1"

# Comprehensive timezone aliases for client robustness (including typos and informal names)
TIMEZONE_ALIASES: dict[str, str] = {
    # Vietnam aliases (typos, informal, legacy, and offset notations)
    "vn/hanoi": "Asia/Ho_Chi_Minh",
    "vn/saigon": "Asia/Ho_Chi_Minh",
    "vietnam": "Asia/Ho_Chi_Minh",
    "viet_nam": "Asia/Ho_Chi_Minh",
    "vn": "Asia/Ho_Chi_Minh",
    "vnm": "Asia/Ho_Chi_Minh",
    "hanoi": "Asia/Ho_Chi_Minh",
    "ha_noi": "Asia/Ho_Chi_Minh",
    "ha noi": "Asia/Ho_Chi_Minh",
    "saigon": "Asia/Ho_Chi_Minh",
    "sai_gon": "Asia/Ho_Chi_Minh",
    "sai gon": "Asia/Ho_Chi_Minh",
    "ho_chi_minh": "Asia/Ho_Chi_Minh",
    "ho chiminh": "Asia/Ho_Chi_Minh",
    "tp.hcm": "Asia/Ho_Chi_Minh",
    "tphcm": "Asia/Ho_Chi_Minh",
    "asia/saigon": "Asia/Ho_Chi_Minh",
    "asia/hanoi": "Asia/Ho_Chi_Minh",
    "ict": "Asia/Ho_Chi_Minh",
    "gmt+7": "Asia/Ho_Chi_Minh",
    "gmt+07": "Asia/Ho_Chi_Minh",
    "utc+7": "Asia/Ho_Chi_Minh",
    "utc+07": "Asia/Ho_Chi_Minh",
    "utc+07:00": "Asia/Ho_Chi_Minh",
    "+07:00": "Asia/Ho_Chi_Minh",
    "+0700": "Asia/Ho_Chi_Minh",
    "+7": "Asia/Ho_Chi_Minh",

    # UTC / GMT
    "utc": "UTC",
    "gmt": "UTC",
    "zulu": "UTC",
    "z": "UTC",
    "utc+0": "UTC",
    "utc+00": "UTC",
    "utc+00:00": "UTC",
    "+00:00": "UTC",

    # US Timezones
    "us/eastern": "America/New_York",
    "eastern": "America/New_York",
    "est": "America/New_York",
    "edt": "America/New_York",
    "new_york": "America/New_York",
    "nyc": "America/New_York",
    "us/pacific": "America/Los_Angeles",
    "pacific": "America/Los_Angeles",
    "pst": "America/Los_Angeles",
    "pdt": "America/Los_Angeles",
    "los_angeles": "America/Los_Angeles",
    "california": "America/Los_Angeles",
    "us/central": "America/Chicago",
    "central": "America/Chicago",
    "cst": "America/Chicago",
    "cdt": "America/Chicago",
    "chicago": "America/Chicago",

    # APAC
    "japan": "Asia/Tokyo",
    "tokyo": "Asia/Tokyo",
    "jst": "Asia/Tokyo",
    "asia/tokyo": "Asia/Tokyo",
    "singapore": "Asia/Singapore",
    "sgt": "Asia/Singapore",
    "asia/singapore": "Asia/Singapore",
    "korea": "Asia/Seoul",
    "seoul": "Asia/Seoul",
    "kst": "Asia/Seoul",
    "asia/seoul": "Asia/Seoul",
    "australia/sydney": "Australia/Sydney",
    "sydney": "Australia/Sydney",
    "aest": "Australia/Sydney",
}


def resolve_scoring_timezone(
    scoring_timezone: str | None,
    default_tz: str = "Asia/Ho_Chi_Minh",
) -> tuple[ZoneInfo, str, str, bool]:
    """Resolve and normalize arbitrary client timezone inputs with alias mapping and safe fallback.

    Returns:
        tuple[ZoneInfo, canonical_tz_name, requested_raw_tz, fallback_applied]

    Guarantees:
    - Never throws exceptions (no crash on invalid names, typos, or malformed strings like 'VN/Hanoi').
    - Maps common international aliases (e.g. 'VN/Hanoi', 'Saigon', 'GMT+7') to valid IANA names.
    - If input is unrecognized, safely falls back to default_tz ('Asia/Ho_Chi_Minh') and flags fallback_applied=True.
    """
    raw_tz = str(scoring_timezone or "").strip()
    if not raw_tz:
        try:
            return ZoneInfo(default_tz), default_tz, raw_tz, False
        except Exception:
            return ZoneInfo("UTC"), "UTC", raw_tz, True

    norm_key = raw_tz.lower().replace(" ", "_").replace("-", "_")

    # 1. Check alias dictionary
    if norm_key in TIMEZONE_ALIASES:
        canonical_name = TIMEZONE_ALIASES[norm_key]
        try:
            return ZoneInfo(canonical_name), canonical_name, raw_tz, False
        except Exception:
            pass

    # 2. Try direct IANA lookup
    try:
        tz = ZoneInfo(raw_tz)
        return tz, raw_tz, raw_tz, False
    except Exception:
        pass

    # 3. Try standard path normalization (e.g. replace \ with /)
    cleaned_guess = raw_tz.replace("\\", "/").replace(" ", "_")
    try:
        tz = ZoneInfo(cleaned_guess)
        return tz, cleaned_guess, raw_tz, False
    except Exception:
        pass

    # 4. Safe fallback to default_tz (Asia/Ho_Chi_Minh)
    try:
        default_zone = ZoneInfo(default_tz)
        return default_zone, default_tz, raw_tz, True
    except Exception:
        return ZoneInfo("UTC"), "UTC", raw_tz, True


@dataclass(frozen=True)
class PipelineContext:
    """Immutable context captured at API Entrypoint for deterministic pipeline execution.

    Flow:
    1. API Entrypoint: Captures request_time_utc immediately.
    2. Resolve Timezone: Looks up Job scoring_timezone with typo/alias tolerance & safe fallback.
    3. Date Normalization: Computes as_of_local_date (local work date in VN) & as_of_ym.
    4. Freeze Context: Immutable snapshot passed to Extractor, Duration & Cache.
    5. Cache & Traceability: Keyed by as_of_ym + policy_version with full Audit metadata.
    """
    request_time_utc: datetime
    timezone_name: str
    local_as_of: datetime
    as_of_local_date: str  # YYYY-MM-DD
    as_of_ym: str          # YYYY-MM
    policy_version: str = "v1"
    requested_timezone: str = ""
    timezone_fallback_applied: bool = False

    @classmethod
    def create(
        cls,
        request_time_utc: datetime | None = None,
        scoring_timezone: str | None = None,
        as_of_date_override: str | datetime | None = None,
        policy_version: str = "v1",
        default_timezone: str = "Asia/Ho_Chi_Minh",
    ) -> "PipelineContext":
        # 1. API Entrypoint: Capture request_time_utc
        req_utc = request_time_utc or datetime.now(timezone.utc)
        if req_utc.tzinfo is None:
            req_utc = req_utc.replace(tzinfo=timezone.utc)

        # 2. Resolve Timezone with alias mapping and graceful fallback
        tz, tz_canonical, raw_requested_tz, fallback_applied = resolve_scoring_timezone(
            scoring_timezone=scoring_timezone,
            default_tz=default_timezone,
        )

        # 3. Date Normalization: from UTC and Timezone, compute local date & as_of_ym
        if as_of_date_override is not None:
            if isinstance(as_of_date_override, datetime):
                local_dt = as_of_date_override if as_of_date_override.tzinfo else as_of_date_override.replace(tzinfo=tz)
                local_dt = local_dt.astimezone(tz)
            else:
                cleaned = str(as_of_date_override).strip()
                if "T" in cleaned:
                    dt_part = datetime.fromisoformat(cleaned)
                else:
                    dt_part = datetime.strptime(cleaned[:10], "%Y-%m-%d")
                local_dt = dt_part.replace(tzinfo=tz)
        else:
            local_dt = req_utc.astimezone(tz)

        local_date_str = local_dt.strftime("%Y-%m-%d")
        as_of_ym = f"{local_dt.year:04d}-{local_dt.month:02d}"

        # 4. Freeze Context
        return cls(
            request_time_utc=req_utc,
            timezone_name=tz_canonical,
            local_as_of=local_dt,
            as_of_local_date=local_date_str,
            as_of_ym=as_of_ym,
            policy_version=policy_version,
            requested_timezone=raw_requested_tz,
            timezone_fallback_applied=fallback_applied,
        )

    def to_audit_metadata(self) -> dict[str, Any]:
        """Audit / Traceability metadata attached to response payload."""
        return {
            "request_time_utc": self.request_time_utc.isoformat(),
            "scoring_timezone": self.timezone_name,
            "requested_timezone": self.requested_timezone,
            "timezone_fallback_applied": self.timezone_fallback_applied,
            "as_of_local_date": self.as_of_local_date,
            "as_of_ym": self.as_of_ym,
            "policy_version": self.policy_version,
            "calculated_at_iso": self.local_as_of.isoformat(),
        }



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
    resume_id: str | None = None,
) -> str:
    """Generate a deterministic, privacy-safe cache key for CVFingerprint.

    Security & Privacy Guarantees:
    - NEVER contains raw CV text, candidate names, emails, phones, or any sensitive PII.
    - Key depends ONLY on prefix, resume_id (if specified), parser_version, and cryptographic content_hash.
    - Format with resume_id: {prefix}:{resume_id}:{parser_version}:{content_hash}
    - Format without resume_id: {prefix}:{parser_version}:{content_hash}
    - Changing parser_version or raw text content_hash automatically invalidates prior cache entries.
    """
    clean_hash = content_hash.strip().lower()
    clean_version = (parser_version or PARSER_VERSION).strip()
    if resume_id:
        clean_resume = str(resume_id).strip()
        return f"{prefix}:{clean_resume}:{clean_version}:{clean_hash}"
    return f"{prefix}:{clean_version}:{clean_hash}"



class SkillAttachmentStatus(str, Enum):
    """Lifecycle status of skill mention grounding to Experience/Project entries."""
    ATTACHED = "attached"
    UNRESOLVED = "unresolved"
    SKILLS_SECTION = "skills_section"
    UNATTACHED = "unattached"


class SkillAttachment(BaseModel):
    """Grounding relation linking a SkillMention to an ExperienceEntry or ProjectEntry.

    Guarantees:
    - Preserves evidence_id strictly for auditable traceability.
    - Indicates attachment target (Experience or Project) or reason for exclusion/unresolved status.
    - Unresolved for unknown sections; standalone for skills sections (never bound to experience).
    """
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    attachment_id: str | None = Field(
        default=None,
        description="Optional unique identifier for this skill attachment relation",
    )
    skill_name: str = Field(
        min_length=1,
        description="Standardized normalized skill name (e.g. 'Python', 'FastAPI')",
    )
    raw_mention: str | None = Field(
        default=None,
        description="Exact raw substring mentioned in the CV",
    )
    target_type: Literal["experience", "project"] | None = Field(
        default=None,
        description="Type of entity attached to ('experience', 'project', or None if unresolved/skills_section)",
    )
    target_id: str | None = Field(
        default=None,
        description="ID of the target ExperienceEntry (entry_id) or ProjectEntry (project_id)",
    )
    target_name: str | None = Field(
        default=None,
        description="Human-readable name of target entity (company name, role, or project name)",
    )
    evidence_id: str = Field(
        description="The primary EvidenceBlock ID grounding this relationship",
    )
    evidence_block_ids: list[str] = Field(
        default_factory=list,
        description="All EvidenceBlock IDs associated with this skill mention occurrence",
    )
    section: str = Field(
        default="unknown",
        description="CV section from which the skill mention originated",
    )
    char_span: tuple[int, int] | None = Field(
        default=None,
        description="Optional character span [char_start, char_end] in source document",
    )
    status: Literal["attached", "unresolved", "skills_section", "unattached"] = Field(
        default="unattached",
        description="Attachment status: 'attached', 'unresolved', 'skills_section', or 'unattached'",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score of this attachment [0.0, 1.0]",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Diagnostic metadata (e.g. binding method: 'block_ownership' vs 'span_containment')",
    )

    @property
    def is_attached(self) -> bool:
        """True if successfully attached to an Experience or Project entry."""
        return self.status == "attached" and self.target_id is not None

    @property
    def is_unresolved(self) -> bool:
        """True if the mention section is unknown and could not be resolved."""
        return self.status == "unresolved"


class SkillDurationResult(BaseModel):
    """Calculated verified vs declared duration metrics for a candidate skill.

    Guarantees:
    - verified_duration_months: computed strictly from credible Experience/Project entries with merged intervals.
    - Parallel / overlapping jobs are merged (never double-counted).
    - declared_duration_months: extracted from Summary or Skills sections, kept strictly separate.
    - All calculations grounded in evidence_block_ids.
    """
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    skill_name: str = Field(
        min_length=1,
        description="Standardized normalized skill name",
    )
    verified_duration_months: int = Field(
        default=0,
        ge=0,
        description="Total verified duration in months from valid Experience/Project entries after merging overlaps",
    )
    verified_duration_years: float = Field(
        default=0.0,
        ge=0.0,
        description="Total verified duration in years (verified_duration_months / 12.0)",
    )
    declared_duration_months: int | None = Field(
        default=None,
        ge=0,
        description="Self-declared duration in months from Summary or Skills sections (NOT verified)",
    )
    declared_duration_years: float | None = Field(
        default=None,
        ge=0.0,
        description="Self-declared duration in years from Summary or Skills sections",
    )
    contributing_entry_ids: list[str] = Field(
        default_factory=list,
        description="IDs of Experience/Project entries that grounded this verified duration",
    )
    contributing_entries_summary: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Summary details of each contributing entry",
    )
    merged_intervals: list[tuple[str, str]] = Field(
        default_factory=list,
        description="List of merged [start_date, end_date] intervals with no overlapping months",
    )
    has_discrepancy: bool = Field(
        default=False,
        description="True if declared duration exceeds verified duration",
    )
    discrepancy_months: int = Field(
        default=0,
        ge=0,
        description="Excess unverified declared months if any",
    )
    calculated_as_of: str = Field(
        default="",
        description="Reference date string (YYYY-MM-DD) used as calculation cutoff",
    )
    scoring_timezone: str = Field(
        default="Asia/Ho_Chi_Minh",
        description="Target timezone name used during calculation",
    )
    as_of_local_date: str = Field(
        default="",
        description="Normalized local working date in target timezone",
    )
    as_of_ym: str = Field(
        default="",
        description="Normalized calculation month bucket (YYYY-MM)",
    )
    policy_version: str = Field(
        default="v1",
        description="Duration calculation policy version",
    )
    date_precision: str = Field(
        default="month",
        description="Precision of underlying dates: 'month', 'year', 'mixed', 'unknown'",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score for duration calculation (penalized for year-only estimations)",
    )
    assumptions: list[str] = Field(
        default_factory=list,
        description="Explicit assumptions made during calculation (e.g. assumed_full_year_range)",
    )
    audit_metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Audit and traceability metadata from PipelineContext",
    )
    evidence_block_ids: list[str] = Field(
        default_factory=list,
        description="All EvidenceBlock IDs grounding contributing entries and declared statements",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Diagnostic details",
    )

    @property
    def is_verified(self) -> bool:
        """True if the skill has at least 1 month of verified experience."""
        return self.verified_duration_months > 0




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
    attached_entry_id: str | None = Field(
        default=None,
        description="ID of the attached ExperienceEntry or ProjectEntry",
    )
    attached_entry_type: Literal["experience", "project"] | None = Field(
        default=None,
        description="Type of attached entity ('experience' or 'project')",
    )
    attachment_status: Literal["attached", "unresolved", "skills_section", "unattached"] = Field(
        default="unattached",
        description="Attachment status ('attached', 'unresolved', 'skills_section', 'unattached')",
    )
    primary_evidence_id: str | None = Field(
        default=None,
        description="Primary EvidenceBlock ID grounding this skill mention",
    )
    is_unresolved: bool = Field(
        default=False,
        description="True if mention section is unknown and could not be resolved",
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
    skill_attachments: list[SkillAttachment] = Field(
        default_factory=list,
        description="Skill attachments grounded in this experience entry",
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
    skill_attachments: list[SkillAttachment] = Field(
        default_factory=list,
        description="Skill attachments grounded in this project entry",
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
    skill_attachments: list[SkillAttachment] = Field(
        default_factory=list,
        description="Skill mention to Experience/Project grounding relations",
    )
    skill_durations: dict[str, SkillDurationResult] = Field(
        default_factory=dict,
        description="Calculated verified vs declared duration metrics per skill",
    )
    calculated_as_of: str | None = Field(
        default=None,
        description="Reference date string (YYYY-MM-DD) used for duration calculation cutoff",
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

    @property
    def has_ongoing_experience(self) -> bool:
        """True if any Experience or Project entry represents an ongoing/present position."""
        for exp in self.experience_entries:
            if getattr(exp, "is_current", False):
                return True
            end_date = str(getattr(exp, "end_date", "") or "").strip().lower()
            if end_date in ("present", "hiện tại", "hien tai", "nay", "current", "now"):
                return True
        for proj in self.project_entries:
            end_date = str(getattr(proj, "end_date", "") or "").strip().lower()
            if end_date in ("present", "hiện tại", "hien tai", "nay", "current", "now"):
                return True
        return False

    @classmethod
    def from_raw_text(
        cls,
        raw_text: str,
        resume_id: str = "doc",
        parser_version: str = PARSER_VERSION,
        as_of_date: Any = None,
        use_cache: bool = True,
    ) -> "CVFingerprint":
        """Build or retrieve a cached CVFingerprint from raw text."""
        from src.chunking.fingerprint_cache import create_cv_fingerprint
        return create_cv_fingerprint(
            raw_text=raw_text,
            resume_id=resume_id,
            parser_version=parser_version,
            as_of_date=as_of_date,
            use_cache=use_cache,
        )

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

    def bind_skill_mentions(self) -> list[SkillAttachment]:
        """Bind all normalized skill mentions to experience and project entries.

        Populates self.skill_attachments, updates experience_entries and project_entries,
        and returns the list of SkillAttachment objects.
        """
        from src.chunking.skill_attachment import SkillBinder
        binder = SkillBinder()
        attachments = binder.bind_all(
            skill_mentions=self.normalized_skill_mentions,
            experience_entries=self.experience_entries,
            project_entries=self.project_entries,
            evidence_blocks=self.evidence_blocks,
        )
        self.skill_attachments = attachments
        return attachments

    def calculate_skill_durations(
        self,
        as_of_date: Any = None,
        context: PipelineContext | None = None,
        scoring_timezone: str | None = None,
        policy_version: str = "v1",
    ) -> dict[str, SkillDurationResult]:
        """Calculate verified and declared durations for all candidate skills.

        Merges overlapping date ranges and never double-counts parallel jobs.
        """
        from src.chunking.skill_duration import SkillDurationCalculator
        calc = SkillDurationCalculator(
            context=context,
            as_of_date=as_of_date,
            scoring_timezone=scoring_timezone,
            policy_version=policy_version,
        )
        durations = calc.calculate_fingerprint_durations(self)
        self.skill_durations = durations
        self.calculated_as_of = calc.as_of_str
        return durations



    def get_skill_duration(self, skill_name: str) -> SkillDurationResult | None:
        """Get calculated duration metrics for a specific skill."""
        if not self.skill_durations:
            self.calculate_skill_durations()
        return self.skill_durations.get(skill_name) or self.skill_durations.get(skill_name.lower())

    def get_skills_for_experience(self, entry_id: str) -> list[SkillAttachment]:
        """Retrieve all skills attached to a specific ExperienceEntry."""
        return [
            att for att in self.skill_attachments
            if att.target_type == "experience" and att.target_id == entry_id
        ]

    def get_skills_for_project(self, project_id: str) -> list[SkillAttachment]:
        """Retrieve all skills attached to a specific ProjectEntry."""
        return [
            att for att in self.skill_attachments
            if att.target_type == "project" and att.target_id == project_id
        ]

    def get_unresolved_skills(self) -> list[SkillAttachment]:
        """Retrieve all skill mentions with section=unknown that could not be resolved."""
        return [
            att for att in self.skill_attachments
            if att.status == "unresolved"
        ]

    def get_skills_section_skills(self) -> list[SkillAttachment]:
        """Retrieve all standalone skill mentions originating from the Skills section."""
        return [
            att for att in self.skill_attachments
            if att.status == "skills_section"
        ]


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

        # 7. Skill Attachments
        for att in self.skill_attachments:
            if att.evidence_id and att.evidence_id not in valid_ids:
                errors.append(f"Skill attachment '{att.skill_name}' references non-existent evidence_id '{att.evidence_id}'")
            for eid in att.evidence_block_ids:
                if eid not in valid_ids:
                    errors.append(f"Skill attachment '{att.skill_name}' references non-existent block_id '{eid}'")

        return len(errors) == 0, errors
