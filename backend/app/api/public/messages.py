from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CandidateUser, DBSession
from app.schemas.message import ConversationItem, MessageCreateRequest, MessageResponse
from app.services.message_service import MessageService

router = APIRouter(prefix="/inbox", tags=["inbox"])


@router.get("/conversations", response_model=list[ConversationItem])
async def get_candidate_conversations(
    user: CandidateUser,
    db: DBSession,
):
    """List all application conversations/inbox threads for the candidate."""
    service = MessageService(db)
    return await service.get_candidate_conversations(user.id)


@router.get("/applications/{application_id}/messages", response_model=list[MessageResponse])
async def get_candidate_messages(
    application_id: int,
    user: CandidateUser,
    db: DBSession,
):
    """Get all messages in an application thread."""
    service = MessageService(db)
    messages = await service.get_messages(application_id)
    return [MessageResponse.model_validate(m) for m in messages]


@router.post("/applications/{application_id}/messages", response_model=MessageResponse)
async def send_candidate_message(
    application_id: int,
    body: MessageCreateRequest,
    user: CandidateUser,
    db: DBSession,
):
    """Send a message from candidate to HR."""
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống")

    service = MessageService(db)
    msg = await service.send_message(
        application_id=application_id,
        sender_id=user.id,
        sender_role="candidate",
        sender_name=user.full_name or "Ứng viên",
        content=body.content.strip(),
        message_type="text",
    )
    return MessageResponse.model_validate(msg)


@router.patch("/applications/{application_id}/read")
async def mark_candidate_messages_read(
    application_id: int,
    user: CandidateUser,
    db: DBSession,
):
    """Mark messages as read by candidate."""
    service = MessageService(db)
    await service.mark_as_read(application_id, reader_role="candidate")
    return {"status": "ok"}
