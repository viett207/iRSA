"""Notifications API: REST endpoints + WebSocket for real-time push."""

import logging
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import decode_token
from app.core.ws_manager import ws_manager
from app.api.deps import CurrentUser
from app.models.notification import Notification

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Schemas ---

class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: str
    data: dict | None
    is_read: bool
    created_at: str

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


# --- REST Endpoints ---

@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=50),
    unread_only: bool = Query(default=False),
):
    """List notifications for current user, newest first."""
    base_q = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        base_q = base_q.where(Notification.is_read == False)

    total = await db.scalar(
        select(func.count(Notification.id)).where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False if unread_only else True)
    ) or 0

    # Re-count properly
    count_q = select(func.count(Notification.id)).where(Notification.user_id == current_user.id)
    if unread_only:
        count_q = count_q.where(Notification.is_read == False)
    total = await db.scalar(count_q) or 0

    unread_count = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    ) or 0

    rows = (await db.execute(
        base_q.order_by(Notification.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )).scalars().all()

    items = [
        NotificationOut(
            id=n.id,
            type=n.type,
            title=n.title,
            message=n.message,
            data=n.data,
            is_read=n.is_read,
            created_at=n.created_at.isoformat() if n.created_at else "",
        )
        for n in rows
    ]

    return NotificationListResponse(items=items, total=total, unread_count=unread_count)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get unread notification count for badge."""
    count = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    ) or 0
    return UnreadCountResponse(unread_count=count)


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"ok": True}


@router.patch("/read-all")
async def mark_all_read(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read for current user."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"ok": True}


# --- WebSocket ---

@router.websocket("/ws")
async def notifications_websocket(ws: WebSocket, token: str = Query(...)):
    """WebSocket endpoint for real-time notifications. Auth via ?token=JWT."""
    # Validate JWT token
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await ws.close(code=4001, reason="Invalid token")
        return

    user_id = int(payload.get("sub", 0))
    if not user_id:
        await ws.close(code=4001, reason="Invalid token")
        return

    await ws_manager.connect(user_id, ws)

    # Send initial unread count
    async with AsyncSessionLocal() as db:
        count = await db.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        ) or 0
    await ws.send_json({"type": "init", "unread_count": count})

    try:
        # Keep connection alive, handle client pings
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, ws)
    except Exception:
        ws_manager.disconnect(user_id, ws)
