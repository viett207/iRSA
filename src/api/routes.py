from fastapi import APIRouter, HTTPException

from src.agents.graph import agent_graph
from src.services.agent_service import run_evaluation_agent
from src.models.schemas import AgentEvaluationRequest

router = APIRouter()


@router.post("/evaluate")
async def evaluate_candidate_agent(request: AgentEvaluationRequest):
    """Trigger the LangGraph AI Evaluation Agent for a candidate application."""
    res = await run_evaluation_agent(None, request.application_id)

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
