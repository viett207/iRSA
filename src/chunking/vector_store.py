"""Vector Store helper with memory-safe fallback for chunk similarity matching."""

import logging
from typing import List, Dict, Any
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
    ) -> List[Dict[str, Any]]:
        """Search top-k chunks matching the query string."""
        if not query or not chunks:
            return []

        self._ensure_model()

        # Lightweight keyword & overlap fallback search
        if not self._model:
            results = []
            clean_query = query.strip().lower()
            # Escape query for regex boundary search
            escaped_q = re.escape(clean_query)
            
            for c in chunks:
                text = c["text"]
                text_lower = text.lower()
                
                # 1. Exact phrase / substring match (highest score)
                if clean_query in text_lower or re.search(rf"\b{escaped_q}\b", text_lower, re.IGNORECASE):
                    results.append({
                        "chunk": text,
                        "similarity": 1.0,
                        "level": c.get("level", "unknown"),
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
                            "similarity": round(float(overlap), 4),
                            "level": c.get("level", "unknown"),
                        })
            
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]

        try:
            import numpy as np
            chunk_texts = [c["text"] for c in chunks]
            query_emb = self._model.encode([query], normalize_embeddings=True)[0]
            chunk_embs = self._model.encode(chunk_texts, normalize_embeddings=True)

            similarities = np.dot(chunk_embs, query_emb)
            top_indices = np.argsort(similarities)[::-1][:top_k]

            results = []
            for idx in top_indices:
                sim = float(similarities[idx])
                if sim >= threshold:
                    results.append({
                        "chunk": chunk_texts[idx],
                        "similarity": round(sim, 4),
                        "level": chunks[idx].get("level", "unknown"),
                    })
            return results
        except Exception as e:
            logger.warning(f"Vector calculation failed for '{query}': {e}")
            return []
