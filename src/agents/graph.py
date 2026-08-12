"""LangGraph StateGraph builder for the AI Evaluation Agent."""

import logging
from langgraph.graph import StateGraph, END

from src.agents.state import AgentState
from src.agents.nodes.extractor_node import extractor_node
from src.agents.nodes.evaluator_node import evaluator_node
from src.agents.nodes.question_gen_node import question_gen_node
from src.agents.nodes.verifier_node import verifier_node

logger = logging.getLogger(__name__)


def should_reflect(state: AgentState) -> str:
    """Conditional router: If verification fails and attempts < 2, re-evaluate. Else proceed to END."""
    passed = state.get("verification_passed", False)
    attempts = state.get("reflection_attempts", 0)

    if not passed and attempts < 2:
        logger.warning(f"[Graph Router] Verification failed (attempt {attempts}). Re-routing to evaluator_node...")
        return "evaluator"
    
    return END


def build_evaluation_agent_graph() -> StateGraph:
    """Construct & compile the LangGraph StateGraph pipeline."""
    workflow = StateGraph(AgentState)

    # 1. Add Nodes
    workflow.add_node("extractor", extractor_node)
    workflow.add_node("evaluator", evaluator_node)
    workflow.add_node("question_gen", question_gen_node)
    workflow.add_node("verifier", verifier_node)

    # 2. Add Edges
    workflow.set_entry_point("extractor")
    workflow.add_edge("extractor", "evaluator")
    workflow.add_edge("evaluator", "question_gen")
    workflow.add_edge("question_gen", "verifier")

    # 3. Add Conditional Edge (Self-Reflection Re-entry or END)
    workflow.add_conditional_edges("verifier", should_reflect)

    return workflow.compile()


# Export compiled agent graph
agent_graph = build_evaluation_agent_graph()
