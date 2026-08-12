"""Resume model for candidate CV storage."""

from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import TimestampMixin


class Resume(Base, TimestampMixin):
    """Resume/CV model for candidate uploads."""

    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # File info
    original_filename: Mapped[str] = mapped_column(String(255))
    minio_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int] = mapped_column(Integer)
    content_type: Mapped[str] = mapped_column(String(100))

    # Extracted text content (for search/AI analysis)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # User preferences
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    uploaded_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relationships
    candidate: Mapped["User"] = relationship("User", back_populates="resumes")
    job: Mapped["Job | None"] = relationship("Job")
    applications: Mapped[list["Application"]] = relationship(
        "Application", back_populates="resume"
    )
