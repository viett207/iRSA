"""Embedding-based skill scoring using sentence-transformers.

Computes cosine similarity between skill names and resume text chunks.
A skill is considered matched if similarity exceeds the threshold.
"""

import logging
import threading
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# Ngưỡng similarity để coi là match
# Thấp hơn cho skill ngắn (1-2 từ) vì cosine similarity tự nhiên thấp hơn
SIMILARITY_THRESHOLD = 0.3
# Ngưỡng cao hơn = match chắc chắn hơn (dùng cho confidence scoring)
HIGH_CONFIDENCE_THRESHOLD = 0.5


class EmbeddingScorer:
    """Singleton scorer using sentence-transformers embeddings."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._model = None
        return cls._instance

    def _ensure_model(self):
        """Lazy-load sentence-transformers model on first use."""
        if self._model is None:
            with self._lock:
                if self._model is None:
                    try:
                        from sentence_transformers import SentenceTransformer
                        from app.config import get_settings

                        settings = get_settings()
                        model_name = settings.EMBEDDING_MODEL
                        logger.info(f"Loading embedding model: {model_name}")
                        self._model = SentenceTransformer(model_name)
                        logger.info("Embedding model loaded successfully")
                    except Exception as e:
                        logger.error(f"Failed to load embedding model: {e}")
                        raise

    def _chunk_text(self, text: str) -> list[str]:
        """Split resume text into multi-level chunks for better matching.

        Kết hợp 3 cấp:
        1. Từng dòng (line-level) — match tốt nhất cho skill ngắn (HTML, CSS)
        2. Đoạn nhỏ 30 từ — match cho skill 2-3 từ (Machine Learning)
        3. Đoạn vừa 80 từ — match cho skill dài/ngữ cảnh (Google Data Analytics)
        """
        chunks = []

        # Level 1: Line-level — mỗi dòng non-empty là 1 chunk
        lines = [line.strip() for line in text.split("\n") if line.strip() and len(line.strip()) > 2]
        chunks.extend(lines)

        # Level 2: Small word chunks (30 từ, 50% overlap)
        words = text.split()
        for i in range(0, len(words), 15):
            chunk = " ".join(words[i:i + 30])
            if chunk.strip():
                chunks.append(chunk)

        # Level 3: Medium word chunks (80 từ, 50% overlap)
        for i in range(0, len(words), 40):
            chunk = " ".join(words[i:i + 80])
            if chunk.strip():
                chunks.append(chunk)

        return chunks if chunks else [text]

    def score_skills(
        self,
        resume_text: str,
        must_have_skills: list[str],
        nice_to_have_skills: list[str],
    ) -> dict:
        """Score skills using embedding cosine similarity.

        So sánh embedding của mỗi skill với các chunk của CV.
        Lấy similarity cao nhất cho mỗi skill.

        Returns:
            Dict chứa score và chi tiết matching (cùng format với keyword scorer)
        """
        self._ensure_model()

        all_skills = must_have_skills + nice_to_have_skills
        if not all_skills:
            return {
                "score": 0.0,
                "matched_must": [],
                "matched_nice": [],
                "missing_must": [],
                "missing_nice": [],
                "match_sections": {},
                "search_section": "embedding",
                "similarity_scores": {},
            }

        # Tạo chunks từ CV text
        chunks = self._chunk_text(resume_text)

        # Encode tất cả cùng lúc cho hiệu quả
        skill_embeddings = self._model.encode(all_skills, normalize_embeddings=True)
        chunk_embeddings = self._model.encode(chunks, normalize_embeddings=True)

        # Tính cosine similarity matrix: (num_skills x num_chunks)
        # Vì đã normalize nên dot product = cosine similarity
        similarity_matrix = np.dot(skill_embeddings, chunk_embeddings.T)

        # Lấy max similarity cho mỗi skill
        max_similarities = similarity_matrix.max(axis=1)

        # Phân loại matched/missing dựa trên threshold
        matched_must = []
        matched_nice = []
        missing_must = []
        missing_nice = []
        similarity_scores = {}

        for i, skill in enumerate(all_skills):
            sim = float(max_similarities[i])
            similarity_scores[skill] = round(sim, 3)

            is_must = i < len(must_have_skills)
            if sim >= SIMILARITY_THRESHOLD:
                if is_must:
                    matched_must.append(skill)
                else:
                    matched_nice.append(skill)
            else:
                if is_must:
                    missing_must.append(skill)
                else:
                    missing_nice.append(skill)

        # Tính điểm weighted (cùng công thức với keyword scorer)
        total_weight = len(must_have_skills) * 2 + len(nice_to_have_skills)
        earned_points = len(matched_must) * 2 + len(matched_nice)
        score = (earned_points / total_weight * 100) if total_weight > 0 else 0

        match_sections = {s: "embedding" for s in matched_must + matched_nice}

        return {
            "score": score,
            "matched_must": matched_must,
            "missing_must": missing_must,
            "matched_nice": matched_nice,
            "missing_nice": missing_nice,
            "match_sections": match_sections,
            "search_section": "embedding",
            "similarity_scores": similarity_scores,
        }


def get_embedding_scorer() -> EmbeddingScorer:
    """Get the singleton EmbeddingScorer instance."""
    return EmbeddingScorer()
