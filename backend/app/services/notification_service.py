"""Service to create notifications and push them via WebSocket."""

import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.core.ws_manager import ws_manager

logger = logging.getLogger(__name__)


async def create_and_push(
    db: AsyncSession,
    user_id: int,
    type: str,
    title: str,
    message: str,
    data: dict | None = None,
):
    """Create a notification in DB and push it to the user via WebSocket."""
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        data=data,
        is_read=False,
    )
    db.add(notif)
    await db.flush()  # Get the ID

    # Push via WebSocket
    payload = {
        "type": "notification",
        "notification": {
            "id": notif.id,
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "data": notif.data,
            "is_read": False,
            "created_at": notif.created_at.isoformat() if notif.created_at else "",
        },
    }
    try:
        await ws_manager.send_to_user(user_id, payload)
    except Exception as e:
        logger.warning(f"Failed to push WS notification to user {user_id}: {e}")

    return notif


async def notify_hr_for_new_application(
    db: AsyncSession,
    hr_user_id: int,
    candidate_name: str,
    job_title: str,
    job_id: int,
    application_id: int,
):
    """Notify HR when a new application is submitted."""
    await create_and_push(
        db, hr_user_id,
        type="application",
        title="Hồ sơ ứng tuyển mới",
        message=f"{candidate_name} đã ứng tuyển vị trí {job_title}",
        data={"job_id": job_id, "application_id": application_id},
    )


async def notify_candidate_status_change(
    db: AsyncSession,
    candidate_user_id: int,
    job_title: str,
    new_status: str,
    job_id: int,
    application_id: int,
):
    """Notify candidate when their application status changes."""
    status_labels = {
        "reviewing": "đang được xem xét",
        "shortlisted": "đã lọt vòng sàng lọc",
        "interviewing": "được mời phỏng vấn",
        "offered": "được đề xuất tuyển dụng",
        "hired": "đã được tuyển dụng",
        "rejected": "không được chọn",
    }
    label = status_labels.get(new_status, new_status)
    await create_and_push(
        db, candidate_user_id,
        type="application",
        title="Cập nhật trạng thái ứng tuyển",
        message=f"Hồ sơ ứng tuyển {job_title} của bạn {label}",
        data={"job_id": job_id, "application_id": application_id, "status": new_status},
    )


async def notify_job_approved(
    db: AsyncSession,
    recruiter_user_id: int,
    job_title: str,
    job_id: int,
):
    """Notify recruiter when their job posting is approved."""
    await create_and_push(
        db, recruiter_user_id,
        type="job",
        title="Tin tuyển dụng đã duyệt",
        message=f'Tin "{job_title}" đã được phê duyệt',
        data={"job_id": job_id},
    )


async def notify_job_rejected(
    db: AsyncSession,
    recruiter_user_id: int,
    job_title: str,
    job_id: int,
    reason: str | None = None,
):
    """Notify recruiter when their job posting is rejected."""
    msg = f'Tin "{job_title}" đã bị từ chối'
    if reason:
        msg += f". Lý do: {reason}"
    await create_and_push(
        db, recruiter_user_id,
        type="job",
        title="Tin tuyển dụng bị từ chối",
        message=msg,
        data={"job_id": job_id},
    )


async def notify_interview_scheduled(
    db: AsyncSession,
    candidate_user_id: int,
    job_title: str,
    interview_date: str,
    interview_type: str,
    job_id: int,
    application_id: int,
):
    """Notify candidate when an interview is scheduled."""
    type_label = "online" if interview_type == "online" else "tại văn phòng"
    await create_and_push(
        db, candidate_user_id,
        type="interview",
        title="Lịch phỏng vấn mới",
        message=f"Bạn có lịch phỏng vấn {type_label} cho vị trí {job_title} vào {interview_date}",
        data={"job_id": job_id, "application_id": application_id},
    )


async def notify_hr_ai_evaluation_completed(
    db: AsyncSession,
    hr_user_id: int,
    candidate_name: str,
    job_title: str,
    job_id: int,
    application_id: int,
    ai_score: float | None = None,
    recommendation: str | None = None,
):
    """Notify HR when AI evaluation and scoring has completed for an application."""
    score_str = f" - Điểm AI: {ai_score}/100" if ai_score is not None else ""
    rec_labels = {
        "STRONG_FIT": "Rất phù hợp",
        "GOOD_FIT": "Phù hợp",
        "PARTIAL_FIT": "Phù hợp 1 phần",
        "WEAK_FIT": "Ít phù hợp",
        "NOT_FIT": "Không phù hợp",
    }
    rec_label = rec_labels.get(recommendation, recommendation) if recommendation else None
    rec_str = f" ({rec_label})" if rec_label else ""
    await create_and_push(
        db, hr_user_id,
        type="application",
        title="AI đã chấm xong hồ sơ",
        message=f"AI đã hoàn tất chấm điểm hồ sơ của {candidate_name} cho vị trí {job_title}{score_str}{rec_str}",
        data={
            "job_id": job_id,
            "application_id": application_id,
            "ai_score": ai_score,
            "recommendation": recommendation,
        },
    )

