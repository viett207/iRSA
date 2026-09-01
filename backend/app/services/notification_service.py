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


async def notify_hr_interview_response(
    db: AsyncSession,
    hr_user_id: int,
    candidate_name: str,
    job_title: str,
    response_type: str,
    interview_date_str: str,
    proposed_date_str: str | None = None,
    note: str | None = None,
    job_id: int | None = None,
    application_id: int | None = None,
    interview_id: int | None = None,
):
    """Notify HR when a candidate responds to an interview invitation."""
    if response_type == "accepted":
        title = "Ứng viên đã xác nhận phỏng vấn"
        msg = f"{candidate_name} đã xác nhận tham gia phỏng vấn vị trí {job_title} vào lúc {interview_date_str}"
        notif_type = "interview_accepted"
    elif response_type == "declined":
        title = "Ứng viên từ chối phỏng vấn"
        msg = f"{candidate_name} đã từ chối lịch phỏng vấn vị trí {job_title}"
        if note:
            msg += f'. Lý do: "{note}"'
        notif_type = "interview_declined"
    else:  # reschedule_requested
        title = "Ứng viên yêu cầu đổi lịch phỏng vấn"
        msg = f"{candidate_name} xin đổi lịch PV vị trí {job_title}"
        if proposed_date_str:
            msg += f" sang {proposed_date_str}"
        if note:
            msg += f'. Lý do: "{note}"'
        notif_type = "interview_reschedule"

    await create_and_push(
        db, hr_user_id,
        type=notif_type,
        title=title,
        message=msg,
        data={
            "job_id": job_id,
            "application_id": application_id,
            "interview_id": interview_id,
            "response": response_type,
        },
    )

