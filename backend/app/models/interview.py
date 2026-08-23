from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, DateTime, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Interview(Base, TimestampMixin):
    """Interview schedule and live evaluation for a job application."""

    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    scheduled_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    # Schedule info
    interview_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    interview_type: Mapped[str] = mapped_column(
        String(20), default="online"
    )  # online|offline
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Notes for candidate
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status: scheduled|completed|cancelled
    status: Mapped[str] = mapped_column(
        String(20), default="scheduled", index=True
    )

    # Question set & Live recording evaluations (Stored in JSONB)
    questions: Mapped[list | None] = mapped_column(JSONB, default=list, nullable=True)
    answers: Mapped[dict | None] = mapped_column(JSONB, default=dict, nullable=True)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(String(50), nullable=True)  # STRONG_HIRE|HIRE|CONSIDER|REJECT

    # Relationships
    application: Mapped["Application"] = relationship(
        "Application", back_populates="interviews"
    )
    scheduler: Mapped["User"] = relationship("User", foreign_keys=[scheduled_by])

