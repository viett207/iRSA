from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from src.agents.graph import agent_graph
from src.services.agent_service import run_evaluation_agent
from src.models.schemas import AgentEvaluationRequest

router = APIRouter()


@router.post("/evaluate")
async def evaluate_candidate_agent(request: AgentEvaluationRequest):
    """Trigger the LangGraph AI Evaluation Agent for a candidate application."""
    from app.core.database import get_sync_session

    def _execute():
        with get_sync_session() as db:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(run_evaluation_agent(db, request.application_id))

    import asyncio
    res = await asyncio.to_thread(_execute)

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
