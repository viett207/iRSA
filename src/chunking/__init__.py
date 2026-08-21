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
]
