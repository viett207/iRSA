"""Node 1: Extractor Node — Chunk CV text & perform initial vector pre-search."""

import logging
from src.agents.state import AgentState
from src.chunking.text_chunker import TextChunker
from src.agents.tools.vector_tools import search_cv_evidence

logger = logging.getLogger(__name__)


async def extractor_node(state: AgentState) -> dict:
    """Extract and chunk candidate CV text into multi-level chunks.
    Pre-search vector evidence for must-have and nice-to-have skills.
    """
    resume_text = state.get("resume_text", "")
    must_have = state.get("must_have_skills", [])
    nice_to_have = state.get("nice_to_have_skills", [])

    logger.info(f"[Node 1: Extractor] Processing CV text ({len(resume_text)} chars)...")

    # 1. Multi-level Chunking
    chunks = TextChunker.chunk_resume(resume_text)

    # 2. Pre-search Vector Evidence for each skill
    vector_search_results = {}
    all_skills = must_have + nice_to_have
    for skill in all_skills:
        found_chunks = search_cv_evidence(skill, chunks, top_k=3)
        vector_search_results[skill] = found_chunks

    logger.info(f"[Node 1: Extractor] Created {len(chunks)} chunks & performed vector search for {len(all_skills)} skills.")

    return {
        "chunks": chunks,
        "vector_search_results": vector_search_results,
    }
