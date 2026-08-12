"""Job models for job postings and criteria."""

from datetime import date, datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Date, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Job(Base, TimestampMixin):
    """Job posting model with approval workflow."""

    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Basic info - Vietnamese
    title_vi: Mapped[str] = mapped_column(String(255))
    description_vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    requirements_vi: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Common fields
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    salary_min: Mapped[int | None] = mapped_column(nullable=True)  # millions VND
    salary_max: Mapped[int | None] = mapped_column(nullable=True)  # millions VND

    # Status workflow
    status: Mapped[str] = mapped_column(
        String(50), default="draft", index=True
    )  # draft|pending_approval|approved|rejected|active|closed
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    application_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Approval info
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    approved_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Relationships
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    approver: Mapped["User | None"] = relationship("User", foreign_keys=[approved_by])
    criteria: Mapped["JobCriteria | None"] = relationship(
        "JobCriteria", back_populates="job", uselist=False, cascade="all, delete-orphan"
    )
    applications: Mapped[list["Application"]] = relationship(
        "Application", back_populates="job", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_jobs_status_created_by", "status", "created_by"),
        Index("ix_jobs_is_published", "is_published"),
    )


class JobCriteria(Base, TimestampMixin):
    """Job requirements criteria for candidate matching."""

    __tablename__ = "job_criteria"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, index=True
    )

    # Skills
    must_have_skills: Mapped[list] = mapped_column(JSONB, default=list)
    nice_to_have_skills: Mapped[list] = mapped_column(JSONB, default=list)

    # Experience & education
    min_experience_years: Mapped[int] = mapped_column(default=0)
    max_experience_years: Mapped[int | None] = mapped_column(nullable=True)
    min_education: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # high_school|bachelor|master|phd

    # Scoring weights (must sum to 100)
    weight_skills: Mapped[int] = mapped_column(default=60)
    weight_experience: Mapped[int] = mapped_column(default=30)
    weight_education: Mapped[int] = mapped_column(default=10)

    # Relationship
    job: Mapped["Job"] = relationship("Job", back_populates="criteria")
