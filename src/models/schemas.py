from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class SkillAssessment(BaseModel):
    skill: str = Field(description="Name of skill from requirements")
    found: bool = Field(description="True if evidence of skill is found in CV")
    confidence: float = Field(default=0.0, ge=0.0, le=100.0, description="Confidence percentage 0-100")
    evidence: str = Field(default="", description="Snippet/evidence found in CV or 'Không tìm thấy'")
    level: Literal["beginner", "intermediate", "advanced", "expert", "unknown"] = "unknown"


class ExperienceAssessment(BaseModel):
    detected_years: float = Field(default=0.0, description="Total years of work experience detected")
    relevant_years: float = Field(default=0.0, description="Relevant years for job domain")
    confidence: float = Field(default=0.0, ge=0.0, le=100.0)
    summary: str = Field(default="", description="Summary of work history evaluation in Vietnamese")


class EducationAssessment(BaseModel):
    detected_level: Literal["high_school", "bachelor", "master", "phd", "unknown"] = "unknown"
    field_relevant: bool = Field(default=False)
    summary: str = Field(default="", description="Summary of education evaluation in Vietnamese")


class InterviewQuestion(BaseModel):
    question: str = Field(description="Interview question text in Vietnamese")
    category: str = Field(default="technical", description="Category: technical, behavioral, experience, situational, architecture")
    target_skill: Optional[str] = Field(default=None, description="Related skill or criteria")
    purpose: str = Field(default="", description="Purpose of this question in Vietnamese")
    good_signs: List[str] = Field(default_factory=list, description="Key points / green flags in good answer for HR to verify")
    red_flags: List[str] = Field(default_factory=list, description="Warning signs / poor answers for HR to watch out for")
    grading_guide: Optional[str] = Field(default="", description="Quick grading criteria guide for non-tech HR")



class ProcessStep(BaseModel):
    step_number: int = Field(default=1)
    step_name: str = Field(description="Step title in Vietnamese")
    agent_node: str = Field(description="Agent node name")
    status: str = Field(default="completed", description="Status: completed, in_progress, warning, skipped")
    summary: str = Field(description="Summary of step result in Vietnamese")
    details: Optional[str] = Field(default=None, description="Detailed explanation")


class AiEvaluationOutput(BaseModel):
    overall_score: float = Field(ge=0.0, le=100.0, description="Overall match score 0-100")
    overall_assessment: str = Field(description="2-3 sentence overall evaluation summary in Vietnamese")
    recommendation: Literal["STRONG_FIT", "GOOD_FIT", "PARTIAL_FIT", "WEAK_FIT", "NOT_FIT"]
    skill_assessments: List[SkillAssessment] = Field(default_factory=list)
    experience_assessment: ExperienceAssessment = Field(default_factory=ExperienceAssessment)
    education_assessment: EducationAssessment = Field(default_factory=EducationAssessment)
    strengths: List[str] = Field(default_factory=list, description="Candidate strengths in Vietnamese")
    concerns: List[str] = Field(default_factory=list, description="Points of concern in Vietnamese")
    interview_questions: List[InterviewQuestion] = Field(default_factory=list, description="8-10 generated interview questions")
    process_steps: List[ProcessStep] = Field(default_factory=list, description="Timeline of CV analysis & scoring process steps")
    verification_passed: bool = Field(default=True, description="Whether self-reflection verification passed")
    verification_feedback: Optional[str] = Field(default="", description="Feedback from verification node")
    reflection_attempts: int = Field(default=0, description="Number of reflection loops")


class AgentEvaluationRequest(BaseModel):
    application_id: int = Field(description="Application ID to evaluate")
    force_reevaluate: bool = Field(default=False, description="Force re-evaluation if score exists")


class AgentEvaluationResponse(BaseModel):
    application_id: int
    candidate_name: str
    job_title: str
    overall_score: float
    recommendation: str
    evaluation_result: AiEvaluationOutput
    email_notification_sent: bool
    evaluated_at: datetime
