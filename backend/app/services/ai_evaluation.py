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
    """Run Gemini AI evaluation for a shortlisted application.

    Fetches application data, sends to Gemini, stores result in ScoringResult.
    """
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not configured, skipping AI evaluation")
        return None

    # Fetch application with all needed relationships
    app = db.execute(
        select(Application)
        .options(
            selectinload(Application.resume),
            selectinload(Application.job).selectinload(Job.criteria),
        )
        .where(Application.id == application_id)
    ).scalar_one_or_none()

    if not app or not app.resume or not app.resume.raw_text:
        logger.warning(f"Application {application_id}: no resume text for AI evaluation")
        return None

    criteria = app.job.criteria if app.job else None
    if not criteria:
        logger.warning(f"Application {application_id}: no job criteria for AI evaluation")
        return None

    # Build prompt
    prompt = _build_evaluation_prompt(
        resume_text=app.resume.raw_text,
        must_have_skills=criteria.must_have_skills or [],
        nice_to_have_skills=criteria.nice_to_have_skills or [],
        min_experience_years=criteria.min_experience_years or 0,
        max_experience_years=criteria.max_experience_years,
        min_education=criteria.min_education,
        job_title=app.job.title_vi if app.job else "Unknown",
    )

    # Call Gemini API
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        response_text = response.text.strip()

        # Parse JSON from response (handle markdown code blocks)
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        ai_result = json.loads(response_text)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response for app {application_id}: {e}")
        ai_result = {
            "overall_score": 0,
            "overall_assessment": "AI evaluation failed: invalid response format",
            "recommendation": "WEAK_FIT",
            "error": str(e),
        }
    except Exception as e:
        logger.error(f"Gemini API error for app {application_id}: {e}")
        raise

    # Update ScoringResult with AI evaluation
    ai_score = float(ai_result.get("overall_score", 0))

    existing = db.execute(
        select(ScoringResult).where(ScoringResult.application_id == application_id)
    ).scalar_one_or_none()

    if existing:
        existing.ai_score = ai_score
        existing.ai_evaluation = ai_result
        existing.ai_evaluated_at = datetime.utcnow()
        result = existing
    else:
        # Create new ScoringResult if none exists (edge case)
        result = ScoringResult(
            application_id=application_id,
            ai_score=ai_score,
            ai_evaluation=ai_result,
            ai_evaluated_at=datetime.utcnow(),
        )
        db.add(result)

    db.commit()
    db.refresh(result)

    logger.info(
        f"AI evaluated app {application_id}: "
        f"score={ai_score}, recommendation={ai_result.get('recommendation')}"
    )
    return result
