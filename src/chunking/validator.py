"""Span fidelity and evidence block validator.

Validates character offsets, raw_text slicing fidelity, block_id, section validity,
and confidence normalization with clear separation between hard errors and warnings.
"""

from enum import Enum
from typing import Dict, Any, List, Optional, Union, Tuple
from pydantic import BaseModel, Field

from src.models.evidence import CVSection, EvidenceBlock


class ValidationSeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"


class ValidationStatus(str, Enum):
    VALID = "valid"
    WARNING = "warning"
    INVALID = "invalid"


class DiagnosticItem(BaseModel):
    """Structured diagnostic message for validation feedback."""
    code: str
    message: str
    severity: ValidationSeverity
    field: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class BlockValidationResult(BaseModel):
    """Structured diagnostic report for an EvidenceBlock validation."""
    is_valid: bool = True
    status: ValidationStatus = ValidationStatus.VALID
    block_id: Optional[str] = None
    errors: List[DiagnosticItem] = Field(default_factory=list)
    warnings: List[DiagnosticItem] = Field(default_factory=list)
    normalized_confidence: float = 1.0
    exact_match: bool = False
    actual_slice_text: Optional[str] = None
    trust_tier: str = Field(default="high", description="Evidence trust tier: high, medium, low")


def validate_evidence_block(
    raw_text: str,
    block: Union[EvidenceBlock, Dict[str, Any]],
) -> BlockValidationResult:
    """Validate a single EvidenceBlock against the source raw_text.

    Checks:
    1. char_start and char_end bounds (char_start >= 0, char_end > char_start, char_end <= len(raw_text)). [HARD ERROR]
    2. text exactly matches raw_text[char_start:char_end]. [HARD ERROR]
    3. non-empty text and block_id. [HARD ERROR]
    4. section validity (known CVSection). [WARNING if unknown]
    5. confidence within [0.0, 1.0]. [WARNING if in 0-100 scale, auto-normalized; ERROR if < 0 or invalid]

    Returns:
        BlockValidationResult containing is_valid, status, errors, and warnings.
    """
    errors: List[DiagnosticItem] = []
    warnings: List[DiagnosticItem] = []

    # 1. Unpack block attributes (support both EvidenceBlock and dict)
    if isinstance(block, EvidenceBlock):
        block_id = block.block_id
        text = block.text
        char_start = block.char_start
        char_end = block.char_end
        section = block.section
        confidence = getattr(block, "confidence", None)
        if confidence is None:
            confidence = getattr(block, "section_confidence", 1.0)
    elif isinstance(block, dict):
        block_id = block.get("block_id")
        text = block.get("text")
        char_start = block.get("char_start")
        char_end = block.get("char_end")
        section = block.get("section")
        confidence = block.get("confidence")
        if confidence is None:
            confidence = block.get("section_confidence", 1.0)
    else:
        return BlockValidationResult(
            is_valid=False,
            status=ValidationStatus.INVALID,
            errors=[
                DiagnosticItem(
                    code="INVALID_BLOCK_TYPE",
                    message=f"Block must be an EvidenceBlock or dict, got {type(block).__name__}",
                    severity=ValidationSeverity.ERROR,
                )
            ]
        )

    # 2. Validate raw_text existence
    if raw_text is None:
        errors.append(
            DiagnosticItem(
                code="MISSING_RAW_TEXT",
                message="raw_text is None; cannot perform span fidelity check",
                severity=ValidationSeverity.ERROR,
                field="raw_text",
            )
        )
        return BlockValidationResult(
            is_valid=False,
            status=ValidationStatus.INVALID,
            block_id=str(block_id) if block_id else None,
            errors=errors,
        )

    raw_len = len(raw_text)

    # 3. Validate block_id [HARD ERROR if missing]
    if not block_id or not str(block_id).strip():
        errors.append(
            DiagnosticItem(
                code="MISSING_BLOCK_ID",
                message="block_id is missing, null, or purely whitespace",
                severity=ValidationSeverity.ERROR,
                field="block_id",
            )
        )

    # 4. Validate text content [HARD ERROR if missing/empty]
    if text is None or not str(text).strip():
        errors.append(
            DiagnosticItem(
                code="EMPTY_TEXT",
                message="Evidence block text is missing, empty, or purely whitespace",
                severity=ValidationSeverity.ERROR,
                field="text",
            )
        )

    # 5. Validate offsets [HARD ERROR for out-of-bounds]
    offsets_valid = True
    if char_start is None or not isinstance(char_start, int):
        errors.append(
            DiagnosticItem(
                code="INVALID_CHAR_START",
                message=f"char_start must be an integer, got {char_start}",
                severity=ValidationSeverity.ERROR,
                field="char_start",
            )
        )
        offsets_valid = False
    elif char_start < 0:
        errors.append(
            DiagnosticItem(
                code="NEGATIVE_CHAR_START",
                message=f"char_start ({char_start}) cannot be negative",
                severity=ValidationSeverity.ERROR,
                field="char_start",
                details={"char_start": char_start},
            )
        )
        offsets_valid = False

    if char_end is None or not isinstance(char_end, int):
        errors.append(
            DiagnosticItem(
                code="INVALID_CHAR_END",
                message=f"char_end must be an integer, got {char_end}",
                severity=ValidationSeverity.ERROR,
                field="char_end",
            )
        )
        offsets_valid = False
    elif offsets_valid and char_end <= char_start:
        errors.append(
            DiagnosticItem(
                code="INVERTED_OFFSETS",
                message=f"char_end ({char_end}) must be strictly greater than char_start ({char_start})",
                severity=ValidationSeverity.ERROR,
                field="char_end",
                details={"char_start": char_start, "char_end": char_end},
            )
        )
        offsets_valid = False
    elif char_end > raw_len:
        errors.append(
            DiagnosticItem(
                code="OFFSET_OUT_OF_BOUNDS",
                message=f"char_end ({char_end}) exceeds raw_text length ({raw_len})",
                severity=ValidationSeverity.ERROR,
                field="char_end",
                details={"char_end": char_end, "raw_text_length": raw_len},
            )
        )
        offsets_valid = False

    # 6. Slicing Fidelity check: raw_text[char_start:char_end] == text [HARD ERROR if mismatch]
    exact_match = False
    actual_slice = None

    if offsets_valid and text is not None:
        actual_slice = raw_text[char_start:char_end]
        if actual_slice == text:
            exact_match = True
        else:
            # Check for near-match (whitespace drift)
            if actual_slice.strip() == text.strip():
                warnings.append(
                    DiagnosticItem(
                        code="WHITESPACE_DRIFT",
                        message="Sliced text matches content but differs in leading/trailing whitespace",
                        severity=ValidationSeverity.WARNING,
                        field="text",
                        details={"expected": text, "actual_slice": actual_slice},
                    )
                )
                exact_match = False
            else:
                errors.append(
                    DiagnosticItem(
                        code="TEXT_MISMATCH",
                        message="Evidence text does not match raw_text[char_start:char_end] (hallucinated or drifted span)",
                        severity=ValidationSeverity.ERROR,
                        field="text",
                        details={
                            "block_text": text,
                            "actual_slice": actual_slice,
                            "char_start": char_start,
                            "char_end": char_end,
                        },
                    )
                )

    # 7. Validate Confidence [0.0, 1.0] [WARNING for 100-scale conversion, ERROR for invalid]
    normalized_conf = 1.0
    if confidence is not None:
        try:
            conf_val = float(confidence)
            if conf_val < 0.0:
                errors.append(
                    DiagnosticItem(
                        code="NEGATIVE_CONFIDENCE",
                        message=f"Confidence ({conf_val}) cannot be negative",
                        severity=ValidationSeverity.ERROR,
                        field="confidence",
                    )
                )
            elif conf_val > 1.0:
                if conf_val <= 100.0:
                    # 100-scale detected -> auto-normalize to [0, 1] with warning
                    normalized_conf = round(conf_val / 100.0, 4)
                    warnings.append(
                        DiagnosticItem(
                            code="CONFIDENCE_SCALE_CONVERTED",
                            message=f"Confidence ({conf_val}) was provided in 0-100 scale; normalized to {normalized_conf}",
                            severity=ValidationSeverity.WARNING,
                            field="confidence",
                            details={"original": conf_val, "normalized": normalized_conf},
                        )
                    )
                else:
                    errors.append(
                        DiagnosticItem(
                            code="CONFIDENCE_OUT_OF_RANGE",
                            message=f"Confidence ({conf_val}) exceeds maximum bound 100.0",
                            severity=ValidationSeverity.ERROR,
                            field="confidence",
                        )
                    )
            else:
                normalized_conf = conf_val

            if 0.0 <= normalized_conf < 0.5:
                warnings.append(
                    DiagnosticItem(
                        code="LOW_CONFIDENCE",
                        message=f"Low section confidence ({normalized_conf:.2f})",
                        severity=ValidationSeverity.WARNING,
                        field="confidence",
                    )
                )
        except (ValueError, TypeError):
            errors.append(
                DiagnosticItem(
                    code="INVALID_CONFIDENCE_TYPE",
                    message=f"Confidence must be numeric, got {confidence}",
                    severity=ValidationSeverity.ERROR,
                    field="confidence",
                )
            )

    # 8. Validate Section [WARNING if unknown or unrecognized]
    sec_str = "unknown"
    if section is not None:
        sec_str = str(section.value if isinstance(section, CVSection) else section).lower().strip()
        valid_sections = {s.value for s in CVSection}
        if sec_str not in valid_sections:
            warnings.append(
                DiagnosticItem(
                    code="UNRECOGNIZED_SECTION",
                    message=f"Section '{section}' is not a standard CVSection category",
                    severity=ValidationSeverity.WARNING,
                    field="section",
                    details={"section": section, "valid_options": sorted(list(valid_sections))},
                )
            )
        elif sec_str == CVSection.UNKNOWN.value or normalized_conf < 0.60:
            warnings.append(
                DiagnosticItem(
                    code="SECTION_DETECTION_LOW_CONFIDENCE",
                    message=(
                        f"Section '{sec_str}' has low confidence ({normalized_conf:.2f}) or is UNKNOWN. "
                        "Evidence is preserved with degraded trust tier for full-text retrieval."
                    ),
                    severity=ValidationSeverity.WARNING,
                    field="section",
                    details={
                        "section": sec_str,
                        "section_confidence": normalized_conf,
                        "trust_tier": "low",
                        "fallback": "full_text",
                    },
                )
            )
            if sec_str == CVSection.UNKNOWN.value:
                warnings.append(
                    DiagnosticItem(
                        code="UNKNOWN_SECTION",
                        message="Section is marked as UNKNOWN",
                        severity=ValidationSeverity.WARNING,
                        field="section",
                    )
                )

    # 9. Compute trust tier and overall status
    if sec_str == CVSection.UNKNOWN.value or normalized_conf < 0.60:
        trust_tier = "low"
    elif normalized_conf < 0.85:
        trust_tier = "medium"
    else:
        trust_tier = "high"

    is_valid = len(errors) == 0
    if not is_valid:
        status = ValidationStatus.INVALID
    elif len(warnings) > 0:
        status = ValidationStatus.WARNING
    else:
        status = ValidationStatus.VALID

    return BlockValidationResult(
        is_valid=is_valid,
        status=status,
        block_id=str(block_id) if block_id else None,
        errors=errors,
        warnings=warnings,
        normalized_confidence=normalized_conf,
        exact_match=exact_match,
        actual_slice_text=actual_slice,
        trust_tier=trust_tier,
    )


def validate_evidence_blocks(
    raw_text: str,
    blocks: List[Union[EvidenceBlock, Dict[str, Any]]],
) -> Tuple[List[Union[EvidenceBlock, Dict[str, Any]]], List[BlockValidationResult]]:
    """Batch validate evidence blocks against raw_text without failing the pipeline.

    Filters out hard-invalid blocks while preserving valid and warning blocks.
    Returns:
        (valid_blocks, all_diagnostics)
    """
    valid_blocks = []
    diagnostics = []

    for block in blocks:
        diag = validate_evidence_block(raw_text, block)
        diagnostics.append(diag)
        if diag.is_valid:
            valid_blocks.append(block)

    return valid_blocks, diagnostics
