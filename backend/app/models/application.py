"""Application model for job applications."""

from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import TimestampMixin


class Application(Base, TimestampMixin):
    """Job application model linking candidates to jobs."""

    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), index=True
    )
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    resume_id: Mapped[int | None] = mapped_column(
        ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Application content
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Internal status (HR sees full status)
    # submitted|shortlisted|interviewing|rejected
    status: Mapped[str] = mapped_column(String(50), default="submitted", index=True)

    # Public status (candidate sees simplified status)
    # in_review|shortlisted|not_selected
    public_status: Mapped[str] = mapped_column(String(50), default="in_review")

    # Timestamps
    submitted_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Unique constraint: one application per job per candidate
    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", name="uq_application_job_candidate"),
    )

    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="applications")
    candidate: Mapped["User"] = relationship("User", back_populates="applications")
    resume: Mapped["Resume | None"] = relationship("Resume", back_populates="applications")
    scoring_result: Mapped["ScoringResult | None"] = relationship(
        "ScoringResult", back_populates="application", uselist=False, cascade="all, delete-orphan"
    )
    interviews: Mapped[list["Interview"]] = relationship(
        "Interview", back_populates="application", cascade="all, delete-orphan"
    )
