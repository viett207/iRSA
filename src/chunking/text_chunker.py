"""Multi-level text chunking strategy for CV analysis with standardized block_id, exact offset tracking, and span+level deduplication."""

import hashlib
import re
from typing import List, Dict, Any, Optional, Set, Tuple


class TextChunker:
    """Split CV text into multi-level chunks for vector search & precision extraction."""

    PARSER_VERSION: str = "v1"

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
    def chunk_lines(
        text: str,
        parser_version: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Extract line-level chunks with exact character offsets and standardized block_id from raw text.

        Preserves leading whitespace and guarantees raw_text[char_start:char_end] == block['text'].
        Deduplicates strictly by (char_start, char_end) span.
        Supports both LF (Unix) and CRLF (Windows) line endings.
        """
        if not text or not text.strip():
            return []

        version = parser_version or TextChunker.PARSER_VERSION
        line_chunks: List[Dict[str, Any]] = []
        seen_spans: Set[Tuple[int, int]] = set()

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
                "chunk_level": "line",
                "level": "line",               # Backward compatibility
                "char_length": len(line_text), # Backward compatibility
                "source": "resume_raw_text",
            })

        return line_chunks

    @staticmethod
    def chunk_windows(
        text: str,
        window_size: int = 30,
        stride: Optional[int] = None,
        level_name: str = "window_30",
        legacy_level: str = "small_window",
        parser_version: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Extract sliding word-window chunks with exact character offsets and standardized block_id from raw text.

        Uses regex token matching to identify start/end spans without destroying original
        whitespace, multiple spaces, tabs, or newlines.
        Deduplicates strictly by (char_start, char_end) span.
        Guarantees raw_text[char_start:char_end] == chunk['text'].
        """
        if not text or not text.strip():
            return []

        version = parser_version or TextChunker.PARSER_VERSION
        if stride is None:
            stride = max(1, window_size // 2)

        # Extract all non-whitespace token spans (start, end, token_str)
        tokens = [(m.start(), m.end(), m.group(0)) for m in re.finditer(r"\S+", text)]
        if not tokens:
            return []

        window_chunks: List[Dict[str, Any]] = []
        seen_spans: Set[Tuple[int, int]] = set()

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
                "chunk_level": level_name,
                "level": legacy_level,          # Backward compatibility
                "char_length": len(chunk_text), # Backward compatibility
                "source": "resume_raw_text",
            })

        return window_chunks

    @staticmethod
    def chunk_resume(
        text: str,
        parser_version: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Split resume into 3 levels with exact character offsets, standardized block_id, and span+level deduplication:
        1. Line-level (with exact char_start and char_end offsets)
        2. Small window (30 words, 50% overlap = 15 words stride)
        3. Medium window (80 words, 50% overlap = 40 words stride)
        """
        if not text or not text.strip():
            return []

        version = parser_version or TextChunker.PARSER_VERSION
        chunks: List[Dict[str, Any]] = []

        # Level 1: Line-level with exact offsets
        chunks.extend(TextChunker.chunk_lines(text, parser_version=version))

        # Level 2: Small word chunks (30 words, 50% overlap)
        chunks.extend(
            TextChunker.chunk_windows(
                text=text,
                window_size=30,
                stride=15,
                level_name="window_30",
                legacy_level="small_window",
                parser_version=version,
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
            )
        )

        # Global deduplication strictly based on (chunk_level, char_start, char_end)
        seen_keys: Set[Tuple[Any, Any, Any]] = set()
        unique_chunks: List[Dict[str, Any]] = []

        for c in chunks:
            key = (c.get("chunk_level"), c.get("char_start"), c.get("char_end"))
            if key in seen_keys:
                continue
            seen_keys.add(key)
            unique_chunks.append(c)

        return unique_chunks
