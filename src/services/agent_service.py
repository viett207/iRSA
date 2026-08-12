"""Agent Service wrapper for executing the AI Evaluation Agent graph."""

import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from src.agents.graph import agent_graph
from src.agents.tools.db_tools import fetch_application_data, save_agent_evaluation
from src.agents.tools.notification_tools import send_hr_notification_async
from src.models.schemas import AiEvaluationOutput

logger = logging.getLogger(__name__)


async def run_evaluation_agent(db: Session, application_id: int) -> Optional[Dict[str, Any]]:
    """Execute the full AI Evaluation Agent for a given application ID.
    
    Flow:
    1. Fetch Application + CV + Job Criteria from DB.
    2. Invoke LangGraph Agent Graph (Extractor -> Evaluator -> QuestionGen -> Verifier).
    3. Save final evaluation output to scoring_results table.
    4. Send email notification to HR recruiter.
    """
    logger.info(f"Starting AI Evaluation Agent for Application ID: {application_id}")

    # 1. Fetch DB data
    input_data = fetch_application_data(db, application_id)
    if not input_data:
        logger.error(f"Cannot run Agent: Application {application_id} data missing or invalid.")
        return None

    # 2. Invoke Agent Graph
    try:
        final_state = await agent_graph.ainvoke(input_data)
    except Exception as e:
        logger.exception(f"Error executing agent_graph for App {application_id}: {e}")
        return None

    # 3. Format Evaluation Result
    ai_score = float(final_state.get("overall_score", 75.0))
    evaluation_dict = {
        "overall_score": ai_score,
        "overall_assessment": final_state.get("overall_assessment", ""),
        "recommendation": final_state.get("recommendation", "GOOD_FIT"),
        "skill_assessments": final_state.get("skill_assessments", []),
        "experience_assessment": final_state.get("experience_assessment", {}),
        "education_assessment": final_state.get("education_assessment", {}),
        "strengths": final_state.get("strengths", []),
        "concerns": final_state.get("concerns", []),
        "interview_questions": final_state.get("interview_questions", []),
    }

    # Validate output schema
    try:
        validated_output = AiEvaluationOutput(**evaluation_dict)
        evaluation_dict = validated_output.model_dump()
    except Exception as e:
        logger.warning(f"Schema validation warning: {e}")

    # 4. Save to Database
    save_agent_evaluation(db, application_id, ai_score, evaluation_dict)

    # 5. Trigger HR Notification Tool
    recruiter_email = input_data.get("recruiter_email")
    recruiter_name = input_data.get("recruiter_name", "HR Manager")
    candidate_name = input_data.get("candidate_name", "Ứng viên")
    job_title = input_data.get("job_title", "Position")

    email_sent = False
    if recruiter_email:
        email_sent = await send_hr_notification_async(
            recruiter_email=recruiter_email,
            recruiter_name=recruiter_name,
            candidate_name=candidate_name,
            job_title=job_title,
            ai_result=evaluation_dict,
        )

    logger.info(f"AI Evaluation Agent completed successfully for App {application_id}. Score: {ai_score}")
    return {
        "application_id": application_id,
        "ai_score": ai_score,
        "evaluation": evaluation_dict,
        "email_sent": email_sent,
    }
