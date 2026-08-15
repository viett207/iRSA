from fastapi import APIRouter, HTTPException

from src.agents.graph import agent_graph
from src.services.agent_service import run_evaluation_agent
from src.models.schemas import AgentEvaluationRequest

router = APIRouter()


@router.post("/evaluate")
async def evaluate_candidate_agent(request: AgentEvaluationRequest):
    """Trigger the LangGraph AI Evaluation Agent for a candidate application."""
    # Imported lazily: app.core.database builds its engines at import time, which the
    # standalone src/main.py app (src.config, no app.config) must not be forced to do.
    from app.core.database import get_sync_session

    # Already on the server's event loop, so await the coroutine directly. Spawning a
    # per-request loop in a worker thread leaked its selector/self-pipe fds and the
    # nested to_thread workers; the Celery _run_async() idiom belongs only in sync tasks.
    with get_sync_session() as db:
        res = await run_evaluation_agent(db, request.application_id)

    if not res:
        raise HTTPException(status_code=400, detail=f"Failed to evaluate Application {request.application_id}")

    return {
        "status": "success",
        "message": f"AI Evaluation Agent finished for application {request.application_id}",
        "result": res,
    }


@router.get("/status")
async def agent_status():
    """Check AI Evaluation Agent status & graph nodes."""
    nodes = list(agent_graph.nodes.keys()) if hasattr(agent_graph, "nodes") else ["extractor", "evaluator", "question_gen", "verifier"]
    return {
        "status": "ready",
        "agent": "LangGraph AI CV Evaluation Agent v2.0",
        "architecture": "Hybrid Vector + LLM Deep Evaluation + Self-Reflection",
        "nodes": nodes,
    }
