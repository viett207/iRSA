from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DBSession, HRUser
from app.schemas.message import ConversationItem, MessageCreateRequest, MessageResponse
from app.services.message_service import MessageService

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/conversations", response_model=list[ConversationItem])
async def get_hr_conversations(
    current_user: HRUser,
    db: DBSession,
):
    """List all candidate conversations for HR."""
    service = MessageService(db)
    return await service.get_hr_conversations(current_user.id)


@router.get("/applications/{application_id}", response_model=list[MessageResponse])
async def get_application_messages(
    application_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Get all messages for an application."""
    service = MessageService(db)
    messages = await service.get_messages(application_id)
    return [MessageResponse.model_validate(m) for m in messages]


@router.post("/applications/{application_id}", response_model=MessageResponse)
async def send_hr_message(
    application_id: int,
    body: MessageCreateRequest,
    current_user: HRUser,
    db: DBSession,
):
    """Send a message from HR to the candidate."""
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống")

    service = MessageService(db)
    msg = await service.send_message(
        application_id=application_id,
        sender_id=current_user.id,
        sender_role="hr",
        sender_name=current_user.full_name or "Nhà tuyển dụng",
        content=body.content.strip(),
        message_type="text",
    )
    return MessageResponse.model_validate(msg)


@router.patch("/applications/{application_id}/read")
async def mark_hr_messages_read(
    application_id: int,
    current_user: HRUser,
    db: DBSession,
):
    """Mark messages in conversation as read by HR."""
    service = MessageService(db)
    await service.mark_as_read(application_id, reader_role="hr")
    return {"status": "ok"}
