"""Vector Store helper with memory-safe fallback for chunk similarity matching."""

import logging
from typing import List, Dict, Any, Optional
import re

logger = logging.getLogger(__name__)


class LocalVectorStore:
    """In-memory similarity search with lightweight fallback."""

    def __init__(self, model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        self.model_name = model_name
        self._model = None
        self._load_attempted = False

    def _ensure_model(self):
        if not self._load_attempted:
            self._load_attempted = True
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading embedding model in LocalVectorStore: {self.model_name}")
                self._model = SentenceTransformer(self.model_name)
            except Exception as e:
                logger.warning(f"Embedding model unavailable ({e}). Using lightweight token search fallback.")
                self._model = None

    def search_chunks(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: int = 3,
        threshold: float = 0.3,
        section: Optional[str] = None,
        fallback_to_all_sections: bool = True,
    ) -> List[Dict[str, Any]]:
        """Search top-k chunks matching the query string.

        Supports section-targeted filtering with full-text fallback:
        - If section is provided and matching chunks exist, searches within that section.
        - If section matching yields 0 chunks (or section detection failed/unknown), gracefully falls back to searching all chunks across the full document.
        - Preserves all chunk metadata (block_id, offsets, section, confidence, is_heading).
        """
        if not query or not chunks:
            return []

        # 1. Resolve candidate chunks with fallback logic
        candidate_chunks = chunks
        fallback_active = False

        if section and section.strip() and section.strip().lower() != "unknown":
            sec_target = section.strip().lower()
            filtered = [c for c in chunks if c.get("section") == sec_target]
            if filtered:
                candidate_chunks = filtered
            elif fallback_to_all_sections:
                candidate_chunks = chunks
                fallback_active = True

        self._ensure_model()

        # Lightweight keyword & overlap fallback search
        if not self._model:
            results = []
            clean_query = query.strip().lower()
            escaped_q = re.escape(clean_query)

            for c in candidate_chunks:
                text = c["text"]
                text_lower = text.lower()

                # 1. Exact phrase / substring match (highest score)
                if clean_query in text_lower or re.search(rf"\b{escaped_q}\b", text_lower, re.IGNORECASE):
                    results.append({
                        "chunk": text,
                        "block_id": c.get("block_id"),
                        "char_start": c.get("char_start"),
                        "char_end": c.get("char_end"),
                        "section": c.get("section", "unknown"),
                        "section_confidence": c.get("section_confidence", 0.0),
                        "is_heading": c.get("is_heading", False),
                        "similarity": 1.0,
                        "level": c.get("level", c.get("chunk_level", "unknown")),
                        "fallback_full_text": fallback_active,
                    })
                    continue

                # 2. Multi-word query token matching
                q_words = [w for w in re.findall(r"\w+", clean_query) if len(w) > 1]
                if len(q_words) > 1:
                    matched_words = [w for w in q_words if re.search(rf"\b{re.escape(w)}\b", text_lower, re.IGNORECASE)]
                    overlap = len(matched_words) / len(q_words)
                    # Only accept if at least 70% of tokens match
                    if overlap >= 0.7:
                        results.append({
                            "chunk": text,
                            "block_id": c.get("block_id"),
                            "char_start": c.get("char_start"),
                            "char_end": c.get("char_end"),
                            "section": c.get("section", "unknown"),
                            "section_confidence": c.get("section_confidence", 0.0),
                            "is_heading": c.get("is_heading", False),
                            "similarity": round(float(overlap), 4),
                            "level": c.get("level", c.get("chunk_level", "unknown")),
                            "fallback_full_text": fallback_active,
                        })

            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]

        try:
            import numpy as np
            chunk_texts = [c["text"] for c in candidate_chunks]
            query_emb = self._model.encode([query], normalize_embeddings=True)[0]
            chunk_embs = self._model.encode(chunk_texts, normalize_embeddings=True)

            similarities = np.dot(chunk_embs, query_emb)
            top_indices = np.argsort(similarities)[::-1][:top_k]

            results = []
            for idx in top_indices:
                sim = float(similarities[idx])
                if sim >= threshold:
                    c = candidate_chunks[idx]
                    results.append({
                        "chunk": c["text"],
                        "block_id": c.get("block_id"),
                        "char_start": c.get("char_start"),
                        "char_end": c.get("char_end"),
                        "section": c.get("section", "unknown"),
                        "section_confidence": c.get("section_confidence", 0.0),
                        "is_heading": c.get("is_heading", False),
                        "similarity": round(sim, 4),
                        "level": c.get("level", c.get("chunk_level", "unknown")),
                        "fallback_full_text": fallback_active,
                    })
            return results
        except Exception as e:
            logger.warning(f"Vector calculation failed for '{query}': {e}")
            return []
