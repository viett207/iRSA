"""Scoring result model for resume-job matching evaluation."""

from datetime import datetime
from sqlalchemy import Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import TimestampMixin


class ScoringResult(Base, TimestampMixin):
    """Stores resume scoring evaluation results."""

    __tablename__ = "scoring_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        index=True,
    )

    # Scores (0-100 scale)
    total_score: Mapped[float] = mapped_column(Float, default=0.0)
    skill_match_score: Mapped[float] = mapped_column(Float, default=0.0)
    experience_score: Mapped[float] = mapped_column(Float, default=0.0)
    education_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Detailed breakdown stored as JSON
    match_details: Mapped[dict] = mapped_column(JSONB, default=dict)

    # AI evaluation (populated by Gemini on shortlisting)
    ai_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_evaluation: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_evaluated_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Scoring metadata
    scored_at: Mapped[datetime] = mapped_column(server_default=func.now())
    scoring_version: Mapped[str] = mapped_column(String(20), default="1.0")

    # One score per application (latest wins)
    __table_args__ = (
        UniqueConstraint(
            "application_id", name="uq_scoring_result_application"
        ),
    )

    # Relationships
    application: Mapped["Application"] = relationship(
        "Application", back_populates="scoring_result"
    )
