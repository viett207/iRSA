"""Chunking, section detection, and span fidelity validation package."""

from src.chunking.text_chunker import TextChunker
from src.chunking.vector_store import LocalVectorStore
from src.chunking.validator import (
    ValidationSeverity,
    ValidationStatus,
    DiagnosticItem,
    BlockValidationResult,
    validate_evidence_block,
    validate_evidence_blocks,
)
from src.chunking.section_detector import (
    HeadingSpan,
    SectionDetectionResult,
    DetectedSection,
    SectionDetector,
)

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
    "SectionDetectionResult",
    "DetectedSection",
    "SectionDetector",
]
