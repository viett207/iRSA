"""Multi-level text chunking strategy for CV analysis with SectionDetector integration,
standardized block_id, exact offset tracking, and span+level deduplication.
"""

import hashlib
import re
from typing import Any

from src.chunking.section_detector import DetectedSection, SectionDetector
from src.models.cv_fingerprint import PARSER_VERSION as DEFAULT_PARSER_VERSION
from src.models.evidence import (
    ChunkLevel,
    CVSection,
    EvidenceBlock,
    EvidenceSource,
)


class TextChunker:
    """Split CV text into multi-level chunks with section grounding and confidence rating."""

    PARSER_VERSION: str = DEFAULT_PARSER_VERSION

    @staticmethod
    def generate_block_id(
        raw_text: str,
        chunk_level: str,
        char_start: int,
        char_end: int,
        parser_version: str = "v1",
    ) -> str:
        """Generate a deterministic, process-safe, non-sensitive unique block ID.

        Guarantees:
        - Same raw_text, parser_version, chunk_level, and offsets always produce identical ID.
        - Uses cryptographic SHA-256 (independent of Python's randomized hash seed).
        - Contains no PII / sensitive candidate information.
        - Two chunks with the exact same (char_start, char_end) but different levels have distinct IDs.

        Format: blk_{doc_hash}_{chunk_level}_{char_start:06d}_{char_end:06d}_{sig}
        Example: blk_a3f89b1c_line_000010_000045_7d12e94f
        """
        doc_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()[:8]
        sig_payload = f"{parser_version}:{doc_hash}:{chunk_level}:{char_start}:{char_end}"
        sig = hashlib.sha256(sig_payload.encode("utf-8")).hexdigest()[:8]
        return f"blk_{doc_hash}_{chunk_level}_{char_start:06d}_{char_end:06d}_{sig}"

    @staticmethod
    def _resolve_section_for_span(
        char_start: int,
        char_end: int,
        sections: list[DetectedSection],
    ) -> tuple[CVSection, float, bool, str | None]:
        """Resolve the enclosing CV section, confidence, and heading status for a given text span.

        Uses majority character overlap across section spans to resolve cross-boundary windows accurately.

        Returns:
            (section, section_confidence, is_heading, raw_heading)
        """
        if not sections:
            return CVSection.UNKNOWN, 0.0, False, None

        # 1. Check if span is primarily or contained within a section heading
        for sec in sections:
            if sec.heading_span is not None:
                h_start = sec.heading_span.char_start
                h_end = sec.heading_span.char_end
                # Exact or contained within heading line
                if h_start <= char_start and char_end <= h_end:
                    return sec.section, sec.confidence, True, sec.raw_heading
                # Overlaps predominantly with heading line (>= 50% of the chunk is heading)
                h_overlap = max(0, min(char_end, h_end) - max(char_start, h_start))
                span_len = max(1, char_end - char_start)
                if h_overlap > 0 and (h_overlap / span_len >= 0.5):
                    return sec.section, sec.confidence, True, sec.raw_heading


        # 2. Majority Character Overlap across all sections
        best_section: DetectedSection | None = None
        max_overlap: int = -1

        for sec in sections:
            sec_start = sec.full_char_start
            sec_end = sec.full_char_end
            overlap = max(0, min(char_end, sec_end) - max(char_start, sec_start))
            if overlap > max_overlap:
                max_overlap = overlap
                best_section = sec

        if best_section is not None and max_overlap > 0:
            is_heading = False
            if best_section.heading_span is not None:
                h_start = best_section.heading_span.char_start
                h_end = best_section.heading_span.char_end
                h_overlap = max(0, min(char_end, h_end) - max(char_start, h_start))
                span_len = max(1, char_end - char_start)
                if h_overlap > 0 and (h_overlap / span_len >= 0.5 or h_overlap == (h_end - h_start)):
                    is_heading = True
            return best_section.section, best_section.confidence, is_heading, best_section.raw_heading


        # 3. Fallback to last section if at document tail
        if sections and char_start >= sections[-1].full_char_start:
            return sections[-1].section, sections[-1].confidence, False, sections[-1].raw_heading

        return CVSection.UNKNOWN, 0.0, False, None


    @staticmethod
    def chunk_lines(
        text: str,
        parser_version: str | None = None,
        detector: SectionDetector | None = None,
        exclude_headings: bool = False,
    ) -> list[dict[str, Any]]:
        """Extract line-level chunks with exact character offsets, standardized block_id,
        section classification, and section_confidence from raw text.

        Preserves leading whitespace and guarantees raw_text[char_start:char_end] == block['text'].
        Deduplicates strictly by (char_start, char_end) span.
        Supports both LF (Unix) and CRLF (Windows) line endings.
        """
        if not text or not text.strip():
            return []

        version = parser_version or TextChunker.PARSER_VERSION
        sec_detector = detector or SectionDetector()
        detected_sections = sec_detector.detect_sections(text)

        line_chunks: list[dict[str, Any]] = []
        seen_spans: set[tuple[int, int]] = set()

        # Match all non-newline spans (stops at \r or \n)
        for m in re.finditer(r"[^\r\n]+", text):
            line_text = m.group(0)
            # Skip empty or whitespace-only lines or trivial punctuation
            if not line_text.strip() or len(line_text.strip()) <= 2:
                continue

            char_start = m.start()
            char_end = m.end()
            span_key = (char_start, char_end)

            if span_key in seen_spans:
                continue
            seen_spans.add(span_key)

            sec_type, sec_conf, is_heading, raw_h = TextChunker._resolve_section_for_span(
                char_start=char_start,
                char_end=char_end,
                sections=detected_sections,
            )

            # Option to filter out standalone heading lines from evidence content
            if exclude_headings and is_heading:
                continue

            block_id = TextChunker.generate_block_id(
                raw_text=text,
                chunk_level="line",
                char_start=char_start,
                char_end=char_end,
                parser_version=version,
            )

            line_chunks.append({
                "block_id": block_id,
                "text": line_text,
                "char_start": char_start,
                "char_end": char_end,
                "section": sec_type.value if isinstance(sec_type, CVSection) else str(sec_type),
                "section_confidence": sec_conf,
                "is_heading": is_heading,
                "chunk_level": "line",
                "level": "line",               # Backward compatibility
                "char_length": len(line_text), # Backward compatibility
                "source": "resume_raw_text",
                "metadata": {
                    "is_heading": is_heading,
                    "raw_heading": raw_h,
                },
            })

        return line_chunks

    @staticmethod
    def chunk_windows(
        text: str,
        window_size: int = 30,
        stride: int | None = None,
        level_name: str = "window_30",
        legacy_level: str = "small_window",
        parser_version: str | None = None,
        detector: SectionDetector | None = None,
    ) -> list[dict[str, Any]]:
        """Extract sliding word-window chunks with exact character offsets, standardized block_id,
        section classification, and section_confidence from raw text.

        Uses regex token matching to identify start/end spans without destroying original
        whitespace, multiple spaces, tabs, or newlines.
        Deduplicates strictly by (char_start, char_end) span.
        Guarantees raw_text[char_start:char_end] == chunk['text'].
        """
        if not text or not text.strip():
            return []

        version = parser_version or TextChunker.PARSER_VERSION
        sec_detector = detector or SectionDetector()
        detected_sections = sec_detector.detect_sections(text)

        if stride is None:
            stride = max(1, window_size // 2)

        # Extract all non-whitespace token spans (start, end, token_str)
        tokens = [(m.start(), m.end(), m.group(0)) for m in re.finditer(r"\S+", text)]
        if not tokens:
            return []

        window_chunks: list[dict[str, Any]] = []
        seen_spans: set[tuple[int, int]] = set()

        for idx, i in enumerate(range(0, len(tokens), stride)):
            window_tokens = tokens[i : i + window_size]
            if not window_tokens:
                continue

            # First token start & last token end in raw text
            char_start = window_tokens[0][0]
            char_end = window_tokens[-1][1]
            span_key = (char_start, char_end)

            if span_key in seen_spans:
                continue
            seen_spans.add(span_key)

            chunk_text = text[char_start:char_end]
            if not chunk_text.strip():
                continue

            sec_type, sec_conf, is_heading, raw_h = TextChunker._resolve_section_for_span(
                char_start=char_start,
                char_end=char_end,
                sections=detected_sections,
            )

            block_id = TextChunker.generate_block_id(
                raw_text=text,
                chunk_level=level_name,
                char_start=char_start,
                char_end=char_end,
                parser_version=version,
            )

            window_chunks.append({
                "block_id": block_id,
                "text": chunk_text,
                "char_start": char_start,
                "char_end": char_end,
                "section": sec_type.value if isinstance(sec_type, CVSection) else str(sec_type),
                "section_confidence": sec_conf,
                "is_heading": is_heading,
                "chunk_level": level_name,
                "level": legacy_level,          # Backward compatibility
                "char_length": len(chunk_text), # Backward compatibility
                "source": "resume_raw_text",
                "metadata": {
                    "is_heading": is_heading,
                    "raw_heading": raw_h,
                },
            })

        return window_chunks

    @staticmethod
    def chunk_resume(
        text: str,
        parser_version: str | None = None,
        detector: SectionDetector | None = None,
        exclude_headings: bool = False,
    ) -> list[dict[str, Any]]:
        """Split resume into 3 levels with exact character offsets, standardized block_id,
        section grounding, section_confidence, and span+level deduplication:
        1. Line-level (with exact char_start and char_end offsets)
        2. Small window (30 words, 50% overlap = 15 words stride)
        3. Medium window (80 words, 50% overlap = 40 words stride)
        """
        if not text or not text.strip():
            return []

        version = parser_version or TextChunker.PARSER_VERSION
        sec_detector = detector or SectionDetector()
        chunks: list[dict[str, Any]] = []

        # Level 1: Line-level with exact offsets and section metadata
        chunks.extend(
            TextChunker.chunk_lines(
                text=text,
                parser_version=version,
                detector=sec_detector,
                exclude_headings=exclude_headings,
            )
        )

        # Level 2: Small word chunks (30 words, 50% overlap)
        chunks.extend(
            TextChunker.chunk_windows(
                text=text,
                window_size=30,
                stride=15,
                level_name="window_30",
                legacy_level="small_window",
                parser_version=version,
                detector=sec_detector,
            )
        )

        # Level 3: Medium word chunks (80 words, 50% overlap)
        chunks.extend(
            TextChunker.chunk_windows(
                text=text,
                window_size=80,
                stride=40,
                level_name="window_80",
                legacy_level="medium_window",
                parser_version=version,
                detector=sec_detector,
            )
        )

        # Global deduplication strictly based on (chunk_level, char_start, char_end)
        seen_keys: set[tuple[Any, Any, Any]] = set()
        unique_chunks: list[dict[str, Any]] = []

        for c in chunks:
            key = (c.get("chunk_level"), c.get("char_start"), c.get("char_end"))
            if key in seen_keys:
                continue
            seen_keys.add(key)
            unique_chunks.append(c)

        return unique_chunks

    @staticmethod
    def chunk_to_evidence_blocks(
        text: str,
        parser_version: str | None = None,
        detector: SectionDetector | None = None,
        source: EvidenceSource | str = EvidenceSource.RESUME_RAW_TEXT,
        exclude_headings: bool = False,
    ) -> list[EvidenceBlock]:
        """Convert chunked resume directly into typed, validated EvidenceBlock Pydantic models."""
        chunks = TextChunker.chunk_resume(
            text=text,
            parser_version=parser_version,
            detector=detector,
            exclude_headings=exclude_headings,
        )
        blocks: list[EvidenceBlock] = []
        for c in chunks:
            eb = EvidenceBlock(
                block_id=c["block_id"],
                text=c["text"],
                char_start=c["char_start"],
                char_end=c["char_end"],
                section=c.get("section", CVSection.UNKNOWN),
                section_confidence=c.get("section_confidence", 0.0),
                chunk_level=c.get("chunk_level", ChunkLevel.LINE),
                source=source,
                metadata=c.get("metadata", {}),
            )
            blocks.append(eb)
        return blocks
