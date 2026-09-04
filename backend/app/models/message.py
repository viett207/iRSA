from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class ApplicationMessage(Base, TimestampMixin):
    """Message exchanged between HR and Candidate within an application context."""

    __tablename__ = "application_messages"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(
        Integer,
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    sender_role = Column(String(20), nullable=False)  # 'hr', 'candidate', 'system'
    sender_name = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    message_type = Column(
        String(30),
        nullable=False,
        default="text",
        server_default="text",
    )  # 'text', 'interview_invitation', 'interview_response'
    metadata_json = Column(JSONB, nullable=True)
    is_read = Column(Boolean, default=False, server_default="false", nullable=False)

    # Relationships
    application = relationship("Application", backref="messages")
    sender = relationship("User", foreign_keys=[sender_id])
