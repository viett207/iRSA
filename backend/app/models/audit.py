"""Audit log model for tracking entity changes."""

from datetime import datetime
from sqlalchemy import String, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuditLog(Base):
    """Audit log for tracking all entity state changes."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(
        String(50), index=True
    )  # job|resume|application
    entity_id: Mapped[int] = mapped_column(index=True)
    action: Mapped[str] = mapped_column(
        String(50), index=True
    )  # create|update|submit|approve|reject|publish
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relationship
    actor: Mapped["User | None"] = relationship("User")
