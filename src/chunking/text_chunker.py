"""Multi-level text chunking strategy for CV analysis."""

import re
from typing import List, Dict, Any


class TextChunker:
    """Split CV text into multi-level chunks for vector search & precision extraction."""

    @staticmethod
    def chunk_resume(text: str) -> List[Dict[str, Any]]:
        """Split resume into 3 levels:
        1. Line-level (for exact/short skills)
        2. Small window (30 words, 50% overlap)
        3. Medium window (80 words, 50% overlap)
        """
        if not text or not text.strip():
            return []

        chunks: List[Dict[str, Any]] = []

        # Level 1: Line-level
        lines = [line.strip() for line in text.split("\n") if line.strip() and len(line.strip()) > 2]
        for line in lines:
            chunks.append({
                "text": line,
                "level": "line",
                "char_length": len(line),
            })

        # Level 2: Small word chunks (30 words)
        words = text.split()
        for i in range(0, len(words), 15):
            chunk_words = words[i:i + 30]
            if chunk_words:
                chunk_str = " ".join(chunk_words).strip()
                if chunk_str:
                    chunks.append({
                        "text": chunk_str,
                        "level": "small_window",
                        "char_length": len(chunk_str),
                    })

        # Level 3: Medium word chunks (80 words)
        for i in range(0, len(words), 40):
            chunk_words = words[i:i + 80]
            if chunk_words:
                chunk_str = " ".join(chunk_words).strip()
                if chunk_str:
                    chunks.append({
                        "text": chunk_str,
                        "level": "medium_window",
                        "char_length": len(chunk_str),
                    })

        return chunks
