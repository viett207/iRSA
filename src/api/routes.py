from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


class AgentEvaluationRequest(BaseModel):
    application_id: int

router = APIRouter()


@router.post("/evaluate")
async def evaluate_candidate_agent(request: AgentEvaluationRequest):
    """Trigger the LangGraph AI Evaluation Agent for a candidate application."""
    # Import the AI graph only when this expensive endpoint is used. Loading it
    # during FastAPI startup adds several seconds to every cold start, including
    # ordinary list/detail API traffic that never uses the agent.
    from src.services.agent_service import run_evaluation_agent

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
    return {
        "status": "ready",
        "agent": "LangGraph AI CV Evaluation Agent v2.0",
        "architecture": "Hybrid Vector + LLM Deep Evaluation + Self-Reflection",
        "nodes": ["extractor", "evaluator", "question_gen", "verifier"],
    }
