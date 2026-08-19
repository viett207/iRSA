"""Typed Pydantic schemas for EvidenceBlock and CV Section Grounding.

Ensures every extracted chunk or evidence snippet has verified character offsets,
section classification, confidence rating, and origin tracking.
"""

from enum import Enum
from typing import Dict, Any, Optional, Literal, Union
from pydantic import BaseModel, Field, model_validator, ConfigDict


class CVSection(str, Enum):
    """Standardized CV section categories."""
    HEADER = "header"
    SUMMARY = "summary"
    EXPERIENCE = "experience"
    SKILLS = "skills"
    EDUCATION = "education"
    PROJECTS = "projects"
    CERTIFICATIONS = "certifications"
    AWARDS = "awards"
    OTHER = "other"
    UNKNOWN = "unknown"


CVSectionLiteral = Literal[
    "header",
    "summary",
    "experience",
    "skills",
    "education",
    "projects",
    "certifications",
    "awards",
    "other",
    "unknown",
]


class ChunkLevel(str, Enum):
    """Granularity level of the evidence chunk."""
    LINE = "line"
    SENTENCE = "sentence"
    WINDOW_30 = "window_30"
    WINDOW_80 = "window_80"
    PARAGRAPH = "paragraph"
    SECTION = "section"
    DOCUMENT = "document"


ChunkLevelLiteral = Literal[
    "line",
    "sentence",
    "window_30",
    "window_80",
    "paragraph",
    "section",
    "document",
]


class EvidenceSource(str, Enum):
    """Origin document type for the evidence snippet."""
    RESUME_RAW_TEXT = "resume_raw_text"
    RESUME_PDF = "resume_pdf"
    RESUME_DOCX = "resume_docx"
    CANDIDATE_PROFILE = "candidate_profile"
    MANUAL_INPUT = "manual_input"


EvidenceSourceLiteral = Literal[
    "resume_raw_text",
    "resume_pdf",
    "resume_docx",
    "candidate_profile",
    "manual_input",
]


def generate_block_id(
    raw_text: str,
    chunk_level: str,
    char_start: int,
    char_end: int,
    parser_version: str = "v1",
) -> str:
    """Generate a deterministic, process-safe, non-sensitive unique block ID."""
    import hashlib
    doc_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()[:8]
    sig_payload = f"{parser_version}:{doc_hash}:{chunk_level}:{char_start}:{char_end}"
    sig = hashlib.sha256(sig_payload.encode("utf-8")).hexdigest()[:8]
    return f"blk_{doc_hash}_{chunk_level}_{char_start:06d}_{char_end:06d}_{sig}"


class EvidenceBlock(BaseModel):
    """Typed Pydantic model for an immutable, verified chunk of text in a CV.

    Guarantees character offset validity, non-empty content, and provenance tracking.
    """
    model_config = ConfigDict(use_enum_values=True, validate_assignment=True)

    block_id: str = Field(
        description="Unique identifier for the evidence block (e.g. blk_a3f89b1c_line_000010_000045_7d12e94f)"
    )
    text: str = Field(
        min_length=1,
        description="The exact text content of the evidence snippet in UTF-8"
    )
    char_start: int = Field(
        ge=0,
        description="Start character offset in the source document (0-indexed, inclusive)"
    )
    char_end: int = Field(
        gt=0,
        description="End character offset in the source document (0-indexed, exclusive)"
    )
    section: Union[CVSection, CVSectionLiteral] = Field(
        default=CVSection.UNKNOWN,
        description="CV Section where this block resides"
    )
    section_confidence: float = Field(
        default=100.0,
        ge=0.0,
        le=100.0,
        description="Confidence score for section classification (0.0 - 100.0)"
    )
    chunk_level: Union[ChunkLevel, ChunkLevelLiteral] = Field(
        default=ChunkLevel.LINE,
        description="Granularity of chunking (line, window_30, window_80, paragraph, section)"
    )
    source: Union[EvidenceSource, EvidenceSourceLiteral] = Field(
        default=EvidenceSource.RESUME_RAW_TEXT,
        description="Source document of origin"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Optional additional metadata (e.g. line_num, dates, entities)"
    )

    @model_validator(mode="after")
    def validate_offsets_and_text(self) -> "EvidenceBlock":
        """Enforce char_end > char_start and text length sanity."""
        if self.char_end <= self.char_start:
            raise ValueError(
                f"Invalid offsets: char_end ({self.char_end}) must be strictly greater than "
                f"char_start ({self.char_start})"
            )

        # Ensure text is not just whitespace
        if not self.text.strip():
            raise ValueError("EvidenceBlock text must not be empty or purely whitespace")

        return self

    def verify_against_raw_text(self, raw_text: str) -> bool:
        """Verify if slicing raw_text[char_start:char_end] exactly matches this block's text."""
        if not (0 <= self.char_start < len(raw_text)) or self.char_end > len(raw_text):
            return False
        return raw_text[self.char_start:self.char_end] == self.text

    @classmethod
    def create_from_slice(
        cls,
        raw_text: str,
        char_start: int,
        char_end: int,
        block_id: Optional[str] = None,
        section: Union[CVSection, CVSectionLiteral] = CVSection.UNKNOWN,
        section_confidence: float = 100.0,
        chunk_level: Union[ChunkLevel, ChunkLevelLiteral] = ChunkLevel.LINE,
        source: Union[EvidenceSource, EvidenceSourceLiteral] = EvidenceSource.RESUME_RAW_TEXT,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "EvidenceBlock":
        """Factory method to construct an EvidenceBlock directly from a slice of raw text."""
        if char_start < 0 or char_end > len(raw_text) or char_end <= char_start:
            raise ValueError(
                f"Invalid slice bounds [{char_start}:{char_end}] for text of length {len(raw_text)}"
            )

        snippet = raw_text[char_start:char_end]
        assigned_id = block_id or generate_block_id(
            raw_text=raw_text,
            chunk_level=str(chunk_level.value if isinstance(chunk_level, ChunkLevel) else chunk_level),
            char_start=char_start,
            char_end=char_end,
        )

        return cls(
            block_id=assigned_id,
            text=snippet,
            char_start=char_start,
            char_end=char_end,
            section=section,
            section_confidence=section_confidence,
            chunk_level=chunk_level,
            source=source,
            metadata=metadata or {},
        )

