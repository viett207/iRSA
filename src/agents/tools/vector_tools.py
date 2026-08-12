"""Vector search tools for Agent to query CV chunks."""

import logging
from typing import List, Dict, Any
from src.chunking.vector_store import LocalVectorStore

logger = logging.getLogger(__name__)

_vector_store = LocalVectorStore()


def search_cv_evidence(query_skill: str, chunks: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
    """Vector tool: Find candidate CV evidence chunks for a specific skill."""
    if not query_skill or not chunks:
        return []
    return _vector_store.search_chunks(query_skill, chunks, top_k=top_k)
