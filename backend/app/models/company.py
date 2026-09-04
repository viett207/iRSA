from sqlalchemy import String, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Company(Base, TimestampMixin):
    """Company model for managing organizations."""

    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True
    )
    company_name: Mapped[str] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    users: Mapped[list["User"]] = relationship(
        "User", back_populates="company", foreign_keys="User.company_code",
        primaryjoin="Company.company_code == foreign(User.company_code)",
    )

    __table_args__ = (
        Index("ix_companies_name", "company_name"),
    )
