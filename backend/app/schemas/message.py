from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class MessageCreateRequest(BaseModel):
    content: str


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    sender_id: int | None = None
    sender_role: str
    sender_name: str | None = None
    content: str
    message_type: str = "text"
    metadata_json: dict[str, Any] | None = None
    is_read: bool = False
    created_at: datetime


class ConversationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    application_id: int
    job_id: int
    job_title: str
    candidate_id: int
    candidate_name: str
    candidate_email: str | None = None
    company_name: str | None = None
    latest_message: MessageResponse | None = None
    unread_count: int = 0
    interview_id: int | None = None
    interview_status: str | None = None
    candidate_response: str | None = None
    interview_date: datetime | None = None
    interview_type: str | None = None
    location: str | None = None


class ConversationListResponse(BaseModel):
    items: list[ConversationItem]
    total: int
