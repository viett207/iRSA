"""LangGraph State definition for the AI Evaluation Agent."""

from typing import TypedDict, List, Dict, Any, Optional


class AgentState(TypedDict, total=False):
    """Shared state dictionary passed across all nodes in the Agent graph."""

    # Input data
    application_id: int
    resume_text: str
    job_title: str
    must_have_skills: List[str]
    nice_to_have_skills: List[str]
    min_experience_years: int
    max_experience_years: Optional[int]
    min_education: Optional[str]
    recruiter_email: Optional[str]
    recruiter_name: Optional[str]
    candidate_name: str

    # Extractor & Chunking outputs
    chunks: List[Dict[str, Any]]
    vector_search_results: Dict[str, List[Dict[str, Any]]]

    # Evaluator output
    overall_score: float
    overall_assessment: str
    recommendation: str
    skill_assessments: List[Dict[str, Any]]
    experience_assessment: Dict[str, Any]
    education_assessment: Dict[str, Any]
    strengths: List[str]
    concerns: List[str]

    # Question Gen output
    interview_questions: List[Dict[str, Any]]

    # Verifier / Self-Reflection output
    verification_passed: bool
    verification_feedback: str
    reflection_attempts: int

    # Final Execution status
    email_sent: bool
    saved_to_db: bool
    error: Optional[str]
