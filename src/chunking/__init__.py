"""Chunking, section detection, date-range parsing, and span fidelity validation package."""

from src.chunking.date_parser import (
    DatePrecision,
    DateRangeParser,
    ParsedDate,
    ParsedDateRange,
    extract_date_ranges,
    parse_date_range,
)
from src.chunking.experience_extractor import (
    ExperienceExtractor,
    extract_experience_entries,
)
from src.chunking.section_detector import (
    DetectedSection,
    HeadingSpan,
    SectionConfidenceBreakdown,
    SectionDetectionResult,
    SectionDetector,
    calculate_section_confidence,
    strip_accents,
)
from src.chunking.fingerprint_cache import (
    CVFingerprintCache,
    clear_fingerprint_cache,
    create_cv_fingerprint,
    get_fingerprint_cache,
    slugify_timezone,
)
from src.models.cv_fingerprint import (
    POLICY_VERSION,
    TIMEZONE_ALIASES,
    PipelineContext,
    resolve_scoring_timezone,
)


from src.chunking.skill_attachment import (

    AMBIGUOUS_SKILLS,
    CANONICAL_SKILL_MAP,
    SKILL_CATEGORY_MAP,
    SkillBinder,
    attach_skills_to_entries,
    bind_skills,
    extract_and_bind_skills,
)

from src.chunking.skill_duration import (
    SkillDurationCalculator,
    calculate_all_skill_durations,
    calculate_skill_duration,
    merge_month_intervals,
)
from src.chunking.text_chunker import TextChunker
from src.chunking.validator import (
    BlockValidationResult,
    DiagnosticItem,
    ValidationSeverity,
    ValidationStatus,
    validate_evidence_block,
    validate_evidence_blocks,
)
from src.chunking.vector_store import LocalVectorStore


__all__ = [
    "TextChunker",
    "LocalVectorStore",
    "ValidationSeverity",
    "ValidationStatus",
    "DiagnosticItem",
    "BlockValidationResult",
    "validate_evidence_block",
    "validate_evidence_blocks",
    "HeadingSpan",
    "SectionConfidenceBreakdown",
    "SectionDetectionResult",
    "DetectedSection",
    "SectionDetector",
    "calculate_section_confidence",
    "strip_accents",
    "DatePrecision",
    "ParsedDate",
    "ParsedDateRange",
    "DateRangeParser",
    "parse_date_range",
    "extract_date_ranges",
    "ExperienceExtractor",
    "extract_experience_entries",
    "SkillBinder",
    "attach_skills_to_entries",
    "bind_skills",
    "extract_and_bind_skills",
    "SkillDurationCalculator",
    "calculate_skill_duration",
    "calculate_all_skill_durations",
    "merge_month_intervals",
    "CVFingerprintCache",
    "get_fingerprint_cache",
    "clear_fingerprint_cache",
    "create_cv_fingerprint",
    "slugify_timezone",
    "PipelineContext",
    "POLICY_VERSION",
    "TIMEZONE_ALIASES",
    "resolve_scoring_timezone",
    "CANONICAL_SKILL_MAP",
    "SKILL_CATEGORY_MAP",
]
