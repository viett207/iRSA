"""Interview scheduling, question management, audio transcription, streaming, and AI live recording evaluation endpoints."""

import asyncio
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DBSession, HRUser
from app.models import Application, User, Job, ScoringResult
from app.models.interview import Interview
from app.services.storage import get_storage_service
from src.services.stt_service import STTTemporarilyUnavailableError, transcribe_audio
from src.services.interview_eval_service import (
    evaluate_single_answer,
    summarize_full_interview,
    generate_extra_interview_questions,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Schemas ---

class InterviewCreateRequest(BaseModel):
    interview_date: datetime
    interview_type: str = "online"  # online|offline
    location: str | None = None
    notes: str | None = None


class InterviewUpdateRequest(BaseModel):
    interview_date: datetime | None = None
    interview_type: str | None = None
    location: str | None = None
    notes: str | None = None
    status: str | None = None  # scheduled|completed|cancelled


class CalendarInterviewEvent(BaseModel):
    id: int
    application_id: int
    job_id: int
    job_title: str
    candidate_id: int | None = None
    candidate_name: str
    candidate_email: str
    interview_date: datetime
    interview_type: str = "online"
    location: str | None = None
    status: str
    notes: str | None = None
    scheduler_name: str | None = None
    ai_score: float | None = None
    question_status: str = "unreviewed"
    question_count: int = 0
    question_edited_count: int = 0

    class Config:
        from_attributes = True


class InterviewResponse(BaseModel):
    id: int
    application_id: int
    scheduled_by: int
    scheduler_name: str | None = None
    interview_date: datetime
    interview_type: str
    location: str | None
    notes: str | None
    status: str
    candidate_response: str = "pending"
    candidate_response_note: str | None = None
    candidate_proposed_date: datetime | None = None
    candidate_responded_at: datetime | None = None
    questions: list | None = None
    answers: dict | None = None
    overall_score: float | None = None
    overall_feedback: str | None = None
    recommendation: str | None = None
    created_at: datetime | None
    updated_at: datetime | None

    class Config:
        from_attributes = True


class SaveQuestionsRequest(BaseModel):
    questions: List[Dict[str, Any]]


class AddCustomQuestionRequest(BaseModel):
    question: str
    category: str = "technical"
    target_skill: str | None = None
    purpose: str | None = None
    good_signs: List[str] | None = None
    red_flags: List[str] | None = None
    grading_guide: str | None = None


class GenerateQuestionsRequest(BaseModel):
    focus_topic: str = "technical"
    count: int = 3


class EvaluateAnswerRequest(BaseModel):
    transcript: str


# --- Helper to get or create active interview record ---

async def _get_or_create_interview(
    db: DBSession, app: Application, user_id: int
) -> Interview:
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.scheduler))
        .where(Interview.application_id == app.id)
        .order_by(Interview.id.desc())
    )
    interview = result.scalars().first()
    if not interview:
        default_qs = []
        if app.scoring_result and app.scoring_result.ai_evaluation:
            default_qs = app.scoring_result.ai_evaluation.get("interview_questions", [])

        interview = Interview(
            application_id=app.id,
            scheduled_by=user_id,
            interview_date=datetime.now(),
            interview_type="online",
            status="scheduled",
            questions=default_qs,
            answers={},
        )
        db.add(interview)
        await db.commit()
        await db.refresh(interview)
    return interview


# --- Endpoints ---

@router.get(
    "/jobs/{job_id}/applications/{app_id}/interview-data",
)
async def get_interview_data(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """
    Get full interview workspace data for an application:
    candidate info, job criteria, suggested questions from screening,
    official question set, audio answers, and AI evaluations.
    """
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job).selectinload(Job.criteria),
            selectinload(Application.scoring_result),
            selectinload(Application.interviews).selectinload(Interview.scheduler),
        )
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    active_interview = await _get_or_create_interview(db, app, current_user.id)

    suggested_questions = []
    if app.scoring_result and app.scoring_result.ai_evaluation:
        suggested_questions = app.scoring_result.ai_evaluation.get("interview_questions", [])

    official_questions = active_interview.questions if active_interview.questions else suggested_questions
    answers = active_interview.answers or {}

    return {
        "application_id": app.id,
        "job_id": app.job_id,
        "job_title": app.job.title_vi if app.job else "Vị trí tuyển dụng",
        "job_description": app.job.description_vi if app.job else "",
        "job_criteria": {
            "must_have_skills": app.job.criteria.must_have_skills if app.job and app.job.criteria else [],
            "nice_to_have_skills": app.job.criteria.nice_to_have_skills if app.job and app.job.criteria else [],
            "min_experience_years": app.job.criteria.min_experience_years if app.job and app.job.criteria else 0,
        },
        "candidate": {
            "id": app.candidate.id if app.candidate else None,
            "name": app.candidate.full_name if app.candidate else "Ứng viên",
            "email": app.candidate.email if app.candidate else "",
            "phone": getattr(app.candidate, "phone", "") or "",
        },
        "application_status": app.status,
        "screening_ai_score": app.scoring_result.ai_score if app.scoring_result else None,
        "screening_total_score": app.scoring_result.total_score if app.scoring_result else None,
        "interview": {
            "id": active_interview.id,
            "interview_date": active_interview.interview_date,
            "interview_type": active_interview.interview_type or "online",
            "location": active_interview.location,
            "status": active_interview.status or "scheduled",
            "notes": active_interview.notes,
            "candidate_response": getattr(active_interview, "candidate_response", "pending") or "pending",
            "candidate_response_note": getattr(active_interview, "candidate_response_note", None),
            "candidate_proposed_date": getattr(active_interview, "candidate_proposed_date", None),
            "candidate_responded_at": getattr(active_interview, "candidate_responded_at", None),
            "overall_score": active_interview.overall_score,
            "overall_feedback": active_interview.overall_feedback,
            "recommendation": active_interview.recommendation,
        },
        "suggested_questions": suggested_questions,
        "questions": official_questions,
        "answers": answers,
    }


@router.post(
    "/jobs/{job_id}/applications/{app_id}/interview-questions",
)
async def save_interview_questions(
    job_id: int,
    app_id: int,
    body: SaveQuestionsRequest,
    current_user: HRUser,
    db: DBSession,
):
    """Save / Accept the official set of questions for candidate interview."""
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.scoring_result))
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    interview = await _get_or_create_interview(db, app, current_user.id)
    interview.questions = body.questions
    await db.commit()
    await db.refresh(interview)

    return {
        "status": "success",
        "message": f"Đã lưu {len(body.questions)} câu hỏi phỏng vấn chính thức",
        "questions": interview.questions,
    }


@router.post(
    "/jobs/{job_id}/applications/{app_id}/interview-questions/add-custom",
)
async def add_custom_question(
    job_id: int,
    app_id: int,
    body: AddCustomQuestionRequest,
    current_user: HRUser,
    db: DBSession,
):
    """Add a custom question to the interview question list."""
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.scoring_result))
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    interview = await _get_or_create_interview(db, app, current_user.id)
    questions = list(interview.questions or [])

    new_q = {
        "question": body.question,
        "category": body.category,
        "target_skill": body.target_skill,
        "purpose": body.purpose or "Đánh giá theo yêu cầu người phỏng vấn",
        "good_signs": body.good_signs or ["Trả lời rõ ràng, đúng trọng tâm"],
        "red_flags": body.red_flags or ["Không trả lời được hoặc né tránh"],
        "grading_guide": body.grading_guide or "Đánh giá tính thuyết phục và kinh nghiệm thực tế",
        "is_custom": True,
    }
    questions.append(new_q)
    interview.questions = questions
    await db.commit()
    await db.refresh(interview)

    return {
        "status": "success",
        "message": "Đã thêm câu hỏi tùy chỉnh",
        "question": new_q,
        "questions": interview.questions,
    }


@router.post(
    "/jobs/{job_id}/applications/{app_id}/interview-questions/generate-ai",
)
async def generate_ai_questions(
    job_id: int,
    app_id: int,
    body: GenerateQuestionsRequest,
    current_user: HRUser,
    db: DBSession,
):
    """Generate extra interview questions tailored to candidate and job using AI."""
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job).selectinload(Job.criteria),
        )
        .where(Application.id == app_id, Application.job_id == job_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job_title = app.job.title_vi if app.job else "Vị trí tuyển dụng"
    must_have = app.job.criteria.must_have_skills if app.job and app.job.criteria else []
    candidate_name = app.candidate.full_name if app.candidate else "Ứng viên"

    try:
        generated = await generate_extra_interview_questions(
            job_title=job_title,
            must_have_skills=must_have,
            candidate_name=candidate_name,
            focus_topic=body.focus_topic,
            count=body.count,
        )
    except Exception as e:
        logger.error(f"Generate questions failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi AI sinh câu hỏi phỏng vấn: {str(e)}",
        )

    return {
        "status": "success",
        "count": len(generated),
        "questions": generated,
    }


@router.post(
    "/jobs/{job_id}/applications/{app_id}/interviews/{interview_id}/questions/{question_index}/transcribe",
)
async def transcribe_interview_audio_endpoint(
    job_id: int,
    app_id: int,
    interview_id: int,
    question_index: int,
    current_user: HRUser,
    db: DBSession,
    audio_file: UploadFile = File(...),
):
    """Transcribe recorded audio file to text via Speech-to-Text and save into session."""
    result = await db.execute(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.application_id == app_id,
        )
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    audio_bytes = await audio_file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="File âm thanh không hợp lệ hoặc rỗng.")

    storage = get_storage_service()
    audio_path, audio_url = await storage.upload_audio_bytes(
        contents=audio_bytes,
        filename=audio_file.filename or f"q_{question_index + 1}.webm",
        application_id=app_id,
        question_index=question_index,
        content_type=audio_file.content_type or "audio/webm",
    )

    try:
        transcript = await transcribe_audio(
            audio_bytes=audio_bytes,
            mime_type=audio_file.content_type or "audio/webm",
            filename=audio_file.filename or "recording.webm",
        )
    except STTTemporarilyUnavailableError as e:
        logger.warning("STT provider temporarily unavailable: %s", e)
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"STT transcription failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Không thể hoàn thiện bản chép lời. Bản ghi âm vẫn được giữ để thử lại.",
        )

    # Persist audio_url, audio_path and transcript into interview.answers immediately
    questions = interview.questions or []
    target_q = questions[question_index] if 0 <= question_index < len(questions) else {"question": f"Câu hỏi #{question_index + 1}"}
    
    answers = dict(interview.answers or {})
    existing_ans = answers.get(str(question_index), {})
    answers[str(question_index)] = {
        **existing_ans,
        "question_index": question_index,
        "question_text": target_q.get("question", ""),
        "audio_url": audio_url,
        "audio_path": audio_path,
        "transcript": transcript,
        "transcribed_at": datetime.now().isoformat(),
    }
    interview.answers = answers
    await db.commit()
    await db.refresh(interview)

    return {
        "status": "success",
        "transcript": transcript,
        "audio_url": audio_url,
        "audio_path": audio_path,
    }


@router.get(
    "/jobs/{job_id}/applications/{app_id}/interviews/{interview_id}/questions/{question_index}/audio",
)
async def stream_interview_question_audio(
    job_id: int,
    app_id: int,
    interview_id: int,
    question_index: int,
    db: DBSession,
):
    """Stream stored interview audio directly to browser with proper Content-Type."""
    result = await db.execute(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.application_id == app_id,
        )
    )
    interview = result.scalar_one_or_none()
    if not interview or not interview.answers:
        raise HTTPException(status_code=404, detail="Audio answer not found")

    ans = interview.answers.get(str(question_index)) or interview.answers.get(question_index)
    if not ans:
        raise HTTPException(status_code=404, detail="Question answer not found")

    storage = get_storage_service()
    path = ans.get("audio_path")
    if not path and ans.get("audio_url"):
        path = ans["audio_url"].split("/resumes/")[-1]

    if not path:
        raise HTTPException(status_code=404, detail="Audio file path not available")

    try:
        audio_bytes = await asyncio.to_thread(storage.download, path)
        content_type = "audio/webm"
        p_lower = path.lower()
        if p_lower.endswith(".wav"):
            content_type = "audio/wav"
        elif p_lower.endswith(".mp3"):
            content_type = "audio/mpeg"
        elif p_lower.endswith(".ogg"):
            content_type = "audio/ogg"
        elif p_lower.endswith(".m4a") or p_lower.endswith(".mp4"):
            content_type = "audio/mp4"

        return Response(
            content=audio_bytes,
            media_type=content_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(audio_bytes)),
                "Content-Type": content_type,
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            },
        )
    except Exception as e:
        logger.error(f"Failed to stream audio file {path}: {e}")
        raise HTTPException(status_code=404, detail=f"Không thể tải file âm thanh: {e}")


@router.post(
    "/jobs/{job_id}/applications/{app_id}/interviews/{interview_id}/questions/{question_index}/evaluate-answer",
)
async def evaluate_interview_answer(
    job_id: int,
    app_id: int,
    interview_id: int,
    question_index: int,
    current_user: HRUser,
    db: DBSession,
    audio_file: Optional[UploadFile] = File(None),
    transcript: Optional[str] = Form(None),
):
    """
    Evaluate candidate's answer for a specific question:
    1. If audio file provided -> upload to Supabase Storage and transcribe with STT.
    2. If transcript provided -> use provided transcript.
    3. Run AI Evaluation Agent to score the answer (STAR analysis, strengths, improvements, follow-up).
    4. Save result into interview.answers[question_index].
    """
    result = await db.execute(
        select(Interview)
        .options(
            selectinload(Interview.application).selectinload(Application.candidate),
            selectinload(Interview.application).selectinload(Application.job).selectinload(Job.criteria),
        )
        .where(Interview.id == interview_id, Interview.application_id == app_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    app = interview.application
    job_title = app.job.title_vi if app.job else "Vị trí tuyển dụng"
    must_have = app.job.criteria.must_have_skills if app.job and app.job.criteria else []
    candidate_name = app.candidate.full_name if app.candidate else "Ứng viên"

    questions = interview.questions or []
    if question_index < 0 or question_index >= len(questions):
        target_q = {"question": f"Câu hỏi #{question_index + 1}", "category": "technical"}
    else:
        target_q = questions[question_index]

    audio_url = None
    audio_path = None
    final_transcript = (transcript or "").strip()

    if audio_file:
        audio_bytes = await audio_file.read()
        if audio_bytes:
            storage = get_storage_service()
            audio_path, audio_url = await storage.upload_audio_bytes(
                contents=audio_bytes,
                filename=audio_file.filename or f"q_{question_index + 1}.webm",
                application_id=app_id,
                question_index=question_index,
                content_type=audio_file.content_type or "audio/webm",
            )
            if not final_transcript:
                try:
                    stt_result = await transcribe_audio(
                        audio_bytes=audio_bytes,
                        mime_type=audio_file.content_type or "audio/webm",
                        filename=audio_file.filename or "recording.webm",
                    )
                    if stt_result:
                        final_transcript = stt_result
                except STTTemporarilyUnavailableError as e:
                    logger.warning("STT provider temporarily unavailable: %s", e)
                    raise HTTPException(status_code=503, detail=str(e))
                except Exception as e:
                    logger.error(f"STT transcription failed: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail="Không thể hoàn thiện bản chép lời. Bản ghi âm vẫn được giữ để thử lại.",
                    )

    if not final_transcript:
        raise HTTPException(
            status_code=400,
            detail="Không có nội dung âm thanh ghi âm hoặc văn bản câu trả lời để chấm điểm.",
        )

    try:
        eval_result = await evaluate_single_answer(
            question_text=target_q.get("question", ""),
            answer_transcript=final_transcript,
            job_title=job_title,
            must_have_skills=must_have,
            candidate_name=candidate_name,
            category=target_q.get("category", "technical"),
            target_skill=target_q.get("target_skill"),
            purpose=target_q.get("purpose"),
            good_signs=target_q.get("good_signs"),
            red_flags=target_q.get("red_flags"),
            grading_guide=target_q.get("grading_guide"),
        )
    except Exception as e:
        logger.error(f"AI evaluation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi AI chấm điểm câu trả lời: {str(e)}",
        )

    answers = dict(interview.answers or {})
    answers[str(question_index)] = {
        "question_index": question_index,
        "question_text": target_q.get("question", ""),
        "audio_url": audio_url or answers.get(str(question_index), {}).get("audio_url"),
        "audio_path": audio_path or answers.get(str(question_index), {}).get("audio_path"),
        "transcript": final_transcript,
        "score": eval_result.get("score", 0.0),
        "assessment": eval_result.get("assessment", ""),
        "strengths": eval_result.get("strengths", []),
        "improvements": eval_result.get("improvements", []),
        "star_analysis": eval_result.get("star_analysis"),
        "follow_up_question": eval_result.get("follow_up_question"),
        "evaluated_at": datetime.now().isoformat(),
    }

    interview.answers = answers
    await db.commit()
    await db.refresh(interview)

    return {
        "status": "success",
        "question_index": question_index,
        "answer_data": answers[str(question_index)],
    }


@router.post(
    "/jobs/{job_id}/applications/{app_id}/interviews/{interview_id}/summary",
)
async def summarize_interview(
    job_id: int,
    app_id: int,
    interview_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """
    Summarize the full interview session with AI:
    calculates average score, overall qualitative feedback, and recommendation.
    """
    result = await db.execute(
        select(Interview)
        .options(
            selectinload(Interview.application).selectinload(Application.candidate),
            selectinload(Interview.application).selectinload(Application.job),
        )
        .where(Interview.id == interview_id, Interview.application_id == app_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    app = interview.application
    job_title = app.job.title_vi if app.job else "Vị trí tuyển dụng"
    candidate_name = app.candidate.full_name if app.candidate else "Ứng viên"

    try:
        summary_data = await summarize_full_interview(
            job_title=job_title,
            candidate_name=candidate_name,
            questions=interview.questions or [],
            answers=interview.answers or {},
        )
    except Exception as e:
        logger.error(f"AI summarize failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi AI tổng kết buổi phỏng vấn: {str(e)}",
        )

    interview.overall_score = summary_data.get("overall_score", 0.0)
    interview.overall_feedback = summary_data.get("overall_feedback", "")
    interview.recommendation = summary_data.get("recommendation", "CONSIDER")
    interview.status = "completed"

    await db.commit()
    await db.refresh(interview)

    return {
        "status": "success",
        "summary": summary_data,
        "interview_id": interview.id,
        "overall_score": interview.overall_score,
        "recommendation": interview.recommendation,
    }


@router.post(
    "/jobs/{job_id}/applications/{app_id}/interviews",
    response_model=InterviewResponse,
)
async def schedule_interview(
    job_id: int,
    app_id: int,
    body: InterviewCreateRequest,
    current_user: HRUser,
    db: DBSession,
):
    """Schedule a new interview for an application."""
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.candidate),
            selectinload(Application.job),
            selectinload(Application.scoring_result),
        )
        .where(
            Application.id == app_id,
            Application.job_id == job_id,
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    default_questions = []
    if app.scoring_result and app.scoring_result.ai_evaluation:
        default_questions = app.scoring_result.ai_evaluation.get("interview_questions", [])

    # One application has only one current schedule in this recruitment round.
    # Re-submitting the scheduling form updates that schedule instead of creating
    # a second active record. Older duplicate schedules are retired defensively.
    interviews_result = await db.execute(
        select(Interview)
        .where(Interview.application_id == app_id)
        .order_by(Interview.id.desc())
    )
    existing_interviews = list(interviews_result.scalars().all())
    latest_interview = existing_interviews[0] if existing_interviews else None

    for stale_interview in existing_interviews[1:]:
        if stale_interview.status == "scheduled":
            stale_interview.status = "cancelled"

    if latest_interview and latest_interview.status == "scheduled":
        interview = latest_interview
        interview.scheduled_by = current_user.id
        interview.interview_date = body.interview_date
        interview.interview_type = body.interview_type
        interview.location = body.location
        interview.notes = body.notes
        interview.candidate_response = "pending"
        interview.candidate_response_note = None
        interview.candidate_proposed_date = None
        interview.candidate_responded_at = None
        if not interview.questions:
            interview.questions = default_questions
    else:
        interview = Interview(
            application_id=app_id,
            scheduled_by=current_user.id,
            interview_date=body.interview_date,
            interview_type=body.interview_type,
            location=body.location,
            notes=body.notes,
            status="scheduled",
            questions=default_questions,
            answers={},
        )
        db.add(interview)

    if app.status in ("submitted", "shortlisted"):
        app.status = "interviewing"
        app.public_status = "shortlisted"

    await db.commit()
    await db.refresh(interview)

    try:
        from app.services.notification_service import notify_interview_scheduled
        await notify_interview_scheduled(
            db, app.candidate.id,
            job_title=app.job.title_vi or "N/A",
            interview_date=interview.interview_date.strftime("%d/%m/%Y %H:%M"),
            interview_type=interview.interview_type,
            job_id=job_id, application_id=app_id,
        )
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to push interview notification: {e}")

    try:
        from app.services.message_service import MessageService
        msg_service = MessageService(db)
        interview_date_str = interview.interview_date.strftime("%d/%m/%Y %H:%M")
        type_str = "Trực tuyến" if interview.interview_type == "online" else "Trực tiếp"
        content_text = f"Lời mời phỏng vấn ({type_str}): {interview_date_str}."
        if interview.location:
            content_text += f" Địa điểm/Liên kết: {interview.location}."
        if interview.notes:
            content_text += f" Ghi chú: {interview.notes}."

        metadata = {
            "interview_id": interview.id,
            "interview_date": interview.interview_date.isoformat() if interview.interview_date else None,
            "interview_type": interview.interview_type,
            "location": interview.location,
            "notes": interview.notes,
            "status": interview.status,
            "candidate_response": getattr(interview, "candidate_response", "pending") or "pending",
        }
        await msg_service.send_message(
            application_id=app_id,
            sender_id=current_user.id,
            sender_role="hr",
            sender_name=current_user.full_name or "Nhà tuyển dụng",
            content=content_text,
            message_type="interview_invitation",
            metadata_json=metadata,
        )
    except Exception as e:
        logger.warning(f"Failed to create interview invitation message: {e}")

    return InterviewResponse(
        id=interview.id,
        application_id=interview.application_id,
        scheduled_by=interview.scheduled_by,
        scheduler_name=current_user.full_name,
        interview_date=interview.interview_date,
        interview_type=interview.interview_type,
        location=interview.location,
        notes=interview.notes,
        status=interview.status,
        candidate_response=getattr(interview, "candidate_response", "pending") or "pending",
        candidate_response_note=getattr(interview, "candidate_response_note", None),
        candidate_proposed_date=getattr(interview, "candidate_proposed_date", None),
        candidate_responded_at=getattr(interview, "candidate_responded_at", None),
        questions=interview.questions,
        answers=interview.answers,
        overall_score=interview.overall_score,
        overall_feedback=interview.overall_feedback,
        recommendation=interview.recommendation,
        created_at=interview.created_at,
        updated_at=interview.updated_at,
    )


@router.get("/interviews/calendar", response_model=list[CalendarInterviewEvent])
@router.get("/calendar", response_model=list[CalendarInterviewEvent])
async def list_calendar_interviews(
    current_user: HRUser,
    db: DBSession,
):
    """List all scheduled interviews for calendar display with candidate and job metadata."""
    query = (
        select(Interview)
        .join(Application, Interview.application_id == Application.id)
        .join(Job, Application.job_id == Job.id)
        .options(
            selectinload(Interview.scheduler),
            selectinload(Interview.application).selectinload(Application.candidate),
            selectinload(Interview.application).selectinload(Application.job),
            selectinload(Interview.application).selectinload(Application.scoring_result),
        )
        .order_by(Interview.interview_date.asc())
    )

    if current_user.role in ("recruiter", "leader") and current_user.company_code:
        query = query.where(Job.company_code == current_user.company_code)

    result = await db.execute(query.order_by(None).order_by(Interview.id.desc()))
    all_interviews = result.scalars().all()

    # Historical duplicate rows may exist from the old create-on-reschedule flow.
    # The newest row is authoritative; only expose it when it is still scheduled.
    latest_by_application: dict[int, Interview] = {}
    for interview in all_interviews:
        latest_by_application.setdefault(interview.application_id, interview)
    interviews = sorted(
        (iv for iv in latest_by_application.values() if iv.status == "scheduled"),
        key=lambda iv: iv.interview_date,
    )

    events = []
    for iv in interviews:
        app = iv.application
        if not app:
            continue
        questions = iv.questions if isinstance(iv.questions, list) else []
        reviewed_questions = [
            question for question in questions
            if isinstance(question, dict) and question.get("hr_reviewed") is True
        ]
        edited_questions = [
            question for question in questions
            if isinstance(question, dict) and question.get("hr_edited") is True
        ]
        events.append(
            CalendarInterviewEvent(
                id=iv.id,
                application_id=iv.application_id,
                job_id=app.job_id,
                job_title=app.job.title_vi if app.job else "Vị trí tuyển dụng",
                candidate_id=app.candidate.id if app.candidate else None,
                candidate_name=app.candidate.full_name if app.candidate else "N/A",
                candidate_email=app.candidate.email if app.candidate else "N/A",
                interview_date=iv.interview_date,
                interview_type=iv.interview_type or "online",
                location=iv.location,
                status=iv.status,
                notes=iv.notes,
                scheduler_name=iv.scheduler.full_name if iv.scheduler else None,
                ai_score=app.scoring_result.ai_score if app.scoring_result else None,
                question_status="ready" if reviewed_questions else "unreviewed",
                question_count=len(questions),
                question_edited_count=len(edited_questions),
            )
        )
    return events


@router.get(
    "/jobs/{job_id}/applications/{app_id}/interviews",
    response_model=list[InterviewResponse],
)
async def list_interviews(
    job_id: int,
    app_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """List all interviews for an application."""
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.scheduler))
        .where(Interview.application_id == app_id)
        .order_by(Interview.interview_date.desc())
    )
    interviews = result.scalars().all()

    return [
        InterviewResponse(
            id=iv.id,
            application_id=iv.application_id,
            scheduled_by=iv.scheduled_by,
            scheduler_name=iv.scheduler.full_name if iv.scheduler else None,
            interview_date=iv.interview_date,
            interview_type=iv.interview_type,
            location=iv.location,
            notes=iv.notes,
            status=iv.status,
            candidate_response=getattr(iv, "candidate_response", "pending") or "pending",
            candidate_response_note=getattr(iv, "candidate_response_note", None),
            candidate_proposed_date=getattr(iv, "candidate_proposed_date", None),
            candidate_responded_at=getattr(iv, "candidate_responded_at", None),
            questions=iv.questions,
            answers=iv.answers,
            overall_score=iv.overall_score,
            overall_feedback=iv.overall_feedback,
            recommendation=iv.recommendation,
            created_at=iv.created_at,
            updated_at=iv.updated_at,
        )
        for iv in interviews
    ]


@router.patch(
    "/jobs/{job_id}/applications/{app_id}/interviews/{interview_id}",
    response_model=InterviewResponse,
)
async def update_interview(
    job_id: int,
    app_id: int,
    interview_id: int,
    body: InterviewUpdateRequest,
    current_user: HRUser,
    db: DBSession,
):
    """Update an existing interview (reschedule, change location, mark completed)."""
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.scheduler))
        .where(
            Interview.id == interview_id,
            Interview.application_id == app_id,
        )
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    date_changed = False
    if body.interview_date is not None:
        interview.interview_date = body.interview_date
        interview.candidate_response = "pending"
        interview.candidate_proposed_date = None
        date_changed = True
    if body.interview_type is not None:
        interview.interview_type = body.interview_type
    if body.location is not None:
        interview.location = body.location
    if body.notes is not None:
        interview.notes = body.notes
    if body.status is not None:
        if body.status not in ("scheduled", "completed", "cancelled"):
            raise HTTPException(status_code=400, detail="Invalid status")
        interview.status = body.status

    await db.commit()
    await db.refresh(interview)

    if date_changed:
        try:
            from app.services.notification_service import notify_interview_scheduled
            app_result = await db.execute(
                select(Application)
                .options(selectinload(Application.candidate), selectinload(Application.job))
                .where(Application.id == app_id)
            )
            app_obj = app_result.scalar_one_or_none()
            if app_obj and app_obj.candidate:
                await notify_interview_scheduled(
                    db,
                    candidate_user_id=app_obj.candidate.id,
                    job_title=app_obj.job.title_vi if app_obj.job else "N/A",
                    interview_date=interview.interview_date.strftime("%d/%m/%Y %H:%M"),
                    interview_type=interview.interview_type,
                    job_id=job_id,
                    application_id=app_id,
                )
                await db.commit()
        except Exception as e:
            logger.warning(f"Failed to push updated interview notification: {e}")

    return InterviewResponse(
        id=interview.id,
        application_id=interview.application_id,
        scheduled_by=interview.scheduled_by,
        scheduler_name=interview.scheduler.full_name if interview.scheduler else None,
        interview_date=interview.interview_date,
        interview_type=interview.interview_type,
        location=interview.location,
        notes=interview.notes,
        status=interview.status,
        candidate_response=getattr(interview, "candidate_response", "pending") or "pending",
        candidate_response_note=getattr(interview, "candidate_response_note", None),
        candidate_proposed_date=getattr(interview, "candidate_proposed_date", None),
        candidate_responded_at=getattr(interview, "candidate_responded_at", None),
        questions=interview.questions,
        answers=interview.answers,
        overall_score=interview.overall_score,
        overall_feedback=interview.overall_feedback,
        recommendation=interview.recommendation,
        created_at=interview.created_at,
        updated_at=interview.updated_at,
    )


@router.delete(
    "/jobs/{job_id}/applications/{app_id}/interviews/{interview_id}",
)
async def cancel_interview(
    job_id: int,
    app_id: int,
    interview_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Cancel an interview."""
    result = await db.execute(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.application_id == app_id,
        )
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview.status = "cancelled"
    await db.commit()

    return {"message": "Interview cancelled"}
