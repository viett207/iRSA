"""Gemini AI deep skill assessment for shortlisted candidates.

Sends resume text + job criteria to Gemini for detailed evaluation.
Returns structured assessment with per-skill analysis and confidence scores.
"""

import json
import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload, Session

from app.config import get_settings
from app.models import Application, Job, JobCriteria
from app.models.scoring_result import ScoringResult

logger = logging.getLogger(__name__)


def _build_evaluation_prompt(
    resume_text: str,
    must_have_skills: list[str],
    nice_to_have_skills: list[str],
    min_experience_years: int,
    max_experience_years: int | None,
    min_education: str | None,
    job_title: str,
) -> str:
    """Build structured prompt for Gemini evaluation."""
    skills_section = ""
    if must_have_skills:
        skills_section += f"Must-have skills: {', '.join(must_have_skills)}\n"
    if nice_to_have_skills:
        skills_section += f"Nice-to-have skills: {', '.join(nice_to_have_skills)}\n"

    exp_section = f"Minimum experience: {min_experience_years} years"
    if max_experience_years:
        exp_section += f" (max {max_experience_years} years)"

    edu_section = f"Minimum education: {min_education or 'Not specified'}"

    return f"""You are an expert HR recruiter evaluating a candidate's CV against job requirements.

## Job: {job_title}

## Requirements
{skills_section}{exp_section}
{edu_section}

## Candidate's CV
{resume_text[:8000]}

## Instructions
Analyze the CV against the job requirements and return a JSON object with this exact structure.

CRITICAL RULES:
- All JSON keys MUST be in English exactly as shown below (do NOT translate keys)
- All text VALUES (overall_assessment, evidence, summary, strengths, concerns) MUST be written in Vietnamese
- Enum values (recommendation, level, detected_level) stay in English as specified

{{
  "overall_score": <number 0-100>,
  "overall_assessment": "<2-3 câu tóm tắt đánh giá bằng tiếng Việt>",
  "recommendation": "<STRONG_FIT|GOOD_FIT|PARTIAL_FIT|WEAK_FIT|NOT_FIT>",
  "skill_assessments": [
    {{
      "skill": "<tên kỹ năng giữ nguyên như yêu cầu>",
      "found": <true|false>,
      "confidence": <number 0-100>,
      "evidence": "<bằng chứng từ CV bằng tiếng Việt hoặc 'Không tìm thấy'>",
      "level": "<beginner|intermediate|advanced|expert|unknown>"
    }}
  ],
  "experience_assessment": {{
    "detected_years": <number>,
    "relevant_years": <number>,
    "confidence": <number 0-100>,
    "summary": "<đánh giá kinh nghiệm bằng tiếng Việt>"
  }},
  "education_assessment": {{
    "detected_level": "<high_school|bachelor|master|phd|unknown>",
    "field_relevant": <true|false>,
    "summary": "<đánh giá học vấn bằng tiếng Việt>"
  }},
  "strengths": ["<điểm mạnh 1 bằng tiếng Việt>", "<điểm mạnh 2>"],
  "concerns": ["<lưu ý 1 bằng tiếng Việt>", "<lưu ý 2>"],
  "interview_questions": [
    {{
      "question": "<câu hỏi phỏng vấn bằng tiếng Việt>",
      "category": "<technical|behavioral|experience>",
      "target_skill": "<tên kỹ năng liên quan hoặc null>",
      "purpose": "<mục đích câu hỏi bằng tiếng Việt>"
    }}
  ]
}}

Generate 8-10 interview questions with a balanced mix:
- 3-4 technical questions probing skill depth (both strengths and gaps)
- 2-3 behavioral questions assessing soft skills and teamwork
- 2-3 experience verification questions confirming CV claims

Return ONLY the JSON object, no markdown or extra text."""


def evaluate_with_gemini(db: Session, application_id: int) -> ScoringResult | None:
    """Run AI Evaluation Agent for a shortlisted application.

    Delegates processing to the LangGraph AI Agent in src/services/agent_service.py.
    """
    import asyncio
    from src.services.agent_service import run_evaluation_agent

    logger.info(f"Delegating evaluation for app {application_id} to LangGraph AI Agent in src/...")

    try:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        agent_res = loop.run_until_complete(run_evaluation_agent(db, application_id))
    except Exception as e:
        logger.error(f"AI Agent execution failed for application {application_id}: {e}")
        return None

    if not agent_res:
        logger.warning(f"AI Agent returned no result for application {application_id}")
        return None

    existing = db.execute(
        select(ScoringResult).where(ScoringResult.application_id == application_id)
    ).scalar_one_or_none()

    return existing

