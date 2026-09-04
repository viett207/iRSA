from datetime import datetime
from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """Mixin for created_at and updated_at columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=func.now,
        onupdate=func.now(),
        nullable=True,
    )
