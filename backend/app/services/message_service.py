from datetime import datetime, timezone
import logging
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.ws_manager import ws_manager
from app.models.application import Application
from app.models.interview import Interview
from app.models.message import ApplicationMessage
from app.models.user import User
from app.schemas.message import ConversationItem, MessageResponse

logger = logging.getLogger(__name__)


class MessageService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_messages(self, application_id: int) -> list[ApplicationMessage]:
        query = (
            select(ApplicationMessage)
            .where(ApplicationMessage.application_id == application_id)
            .order_by(ApplicationMessage.created_at.asc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def send_message(
        self,
        application_id: int,
        sender_id: int,
        sender_role: str,
        sender_name: str,
        content: str,
        message_type: str = "text",
        metadata_json: dict | None = None,
    ) -> ApplicationMessage:
        msg = ApplicationMessage(
            application_id=application_id,
            sender_id=sender_id,
            sender_role=sender_role,
            sender_name=sender_name,
            content=content,
            message_type=message_type,
            metadata_json=metadata_json,
            is_read=False,
            updated_at=datetime.now(timezone.utc),
        )
        self.db.add(msg)
        try:
            await self.db.commit()
            await self.db.refresh(msg)
        except Exception:
            await self.db.rollback()
            raise

        # Determine recipient for real-time WebSocket push
        try:
            app_query = (
                select(Application)
                .options(
                    selectinload(Application.candidate),
                    selectinload(Application.job),
                )
                .where(Application.id == application_id)
            )
            app_res = await self.db.execute(app_query)
            app = app_res.scalar_one_or_none()

            if app:
                recipient_id = None
                if sender_role in ("hr", "system"):
                    recipient_id = app.candidate_id
                else:
                    # Candidate sent message -> notify HR scheduler or job creator
                    latest_iv_res = await self.db.execute(
                        select(Interview)
                        .where(Interview.application_id == application_id)
                        .order_by(Interview.id.desc())
                    )
                    latest_iv = latest_iv_res.scalars().first()
                    if latest_iv and latest_iv.scheduled_by:
                        recipient_id = latest_iv.scheduled_by
                    elif app.job and app.job.created_by:
                        recipient_id = app.job.created_by

                msg_data = {
                    "id": msg.id,
                    "application_id": msg.application_id,
                    "sender_id": msg.sender_id,
                    "sender_role": msg.sender_role,
                    "sender_name": msg.sender_name,
                    "content": msg.content,
                    "message_type": msg.message_type,
                    "metadata_json": msg.metadata_json,
                    "is_read": msg.is_read,
                    "created_at": msg.created_at.isoformat() if msg.created_at else None,
                }

                # Push to recipient if known
                if recipient_id:
                    await ws_manager.send_to_user(
                        recipient_id,
                        {
                            "type": "chat_message",
                            "message": msg_data,
                            "application_id": application_id,
                        },
                    )

                # Also broadcast to sender to confirm sync
                await ws_manager.send_to_user(
                    sender_id,
                    {
                        "type": "chat_message",
                        "message": msg_data,
                        "application_id": application_id,
                    },
                )
        except Exception as e:
            logger.warning(f"Error broadcasting chat message via WS: {e}")

        return msg

    async def mark_as_read(self, application_id: int, reader_role: str) -> None:
        other_role = "candidate" if reader_role == "hr" else "hr"
        stmt = (
            update(ApplicationMessage)
            .where(
                ApplicationMessage.application_id == application_id,
                ApplicationMessage.sender_role == other_role,
                ApplicationMessage.is_read.is_(False),
            )
            .values(is_read=True)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def get_candidate_conversations(self, candidate_id: int) -> list[ConversationItem]:
        # Fetch applications for candidate
        query = (
            select(Application)
            .options(
                selectinload(Application.job),
                selectinload(Application.candidate),
                selectinload(Application.interviews),
                selectinload(Application.messages),
            )
            .where(Application.candidate_id == candidate_id)
            .order_by(Application.created_at.desc())
        )
        result = await self.db.execute(query)
        apps = result.scalars().all()

        items = []
        for app in apps:
            job = app.job
            latest_msg = None
            if app.messages:
                sorted_msgs = sorted(app.messages, key=lambda m: m.created_at, reverse=True)
                latest_msg = MessageResponse.model_validate(sorted_msgs[0])

            # Get latest interview info
            latest_iv = None
            if app.interviews:
                sorted_ivs = sorted(app.interviews, key=lambda i: i.id, reverse=True)
                latest_iv = sorted_ivs[0]

            unread = sum(1 for m in app.messages if m.sender_role == "hr" and not m.is_read)

            items.append(
                ConversationItem(
                    application_id=app.id,
                    job_id=job.id if job else 0,
                    job_title=job.title_vi if job else "N/A",
                    candidate_id=candidate_id,
                    candidate_name=app.candidate.full_name or "Ứng viên",
                    candidate_email=app.candidate.email,
                    company_name=job.company_name if job and hasattr(job, "company_name") else "Nhà tuyển dụng",
                    latest_message=latest_msg,
                    unread_count=unread,
                    interview_id=latest_iv.id if latest_iv else None,
                    interview_status=latest_iv.status if latest_iv else None,
                    candidate_response=latest_iv.candidate_response if latest_iv else None,
                    interview_date=latest_iv.interview_date if latest_iv else None,
                    interview_type=latest_iv.interview_type if latest_iv else None,
                    location=latest_iv.location if latest_iv else None,
                )
            )
        return items

    async def get_hr_conversations(self, hr_user_id: int) -> list[ConversationItem]:
        # Fetch applications that have messages or scheduled interviews
        query = (
            select(Application)
            .options(
                selectinload(Application.job),
                selectinload(Application.candidate),
                selectinload(Application.interviews),
                selectinload(Application.messages),
            )
            .order_by(Application.created_at.desc())
        )
        result = await self.db.execute(query)
        apps = result.scalars().all()

        items = []
        for app in apps:
            if not app.messages and not app.interviews:
                continue

            job = app.job
            latest_msg = None
            if app.messages:
                sorted_msgs = sorted(app.messages, key=lambda m: m.created_at, reverse=True)
                latest_msg = MessageResponse.model_validate(sorted_msgs[0])

            latest_iv = None
            if app.interviews:
                sorted_ivs = sorted(app.interviews, key=lambda i: i.id, reverse=True)
                latest_iv = sorted_ivs[0]

            unread = sum(1 for m in app.messages if m.sender_role == "candidate" and not m.is_read)

            items.append(
                ConversationItem(
                    application_id=app.id,
                    job_id=job.id if job else 0,
                    job_title=job.title_vi if job else "N/A",
                    candidate_id=app.candidate_id,
                    candidate_name=app.candidate.full_name or app.candidate.email or "Ứng viên",
                    candidate_email=app.candidate.email,
                    company_name=job.company_name if job and hasattr(job, "company_name") else "Nhà tuyển dụng",
                    latest_message=latest_msg,
                    unread_count=unread,
                    interview_id=latest_iv.id if latest_iv else None,
                    interview_status=latest_iv.status if latest_iv else None,
                    candidate_response=latest_iv.candidate_response if latest_iv else None,
                    interview_date=latest_iv.interview_date if latest_iv else None,
                    interview_type=latest_iv.interview_type if latest_iv else None,
                    location=latest_iv.location if latest_iv else None,
                )
            )
        return items
