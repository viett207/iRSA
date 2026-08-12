"""Remove salary_range and rejection_reason from jobs.

These columns are no longer used in the application.

Revision ID: 015_remove_salary_rejection
Revises: 014_remove_match_score
Create Date: 2026-03-07
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "015_remove_salary_rejection"
down_revision: Union[str, None] = "014_remove_match_score"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("jobs", "salary_range")
    op.drop_column("jobs", "rejection_reason")


def downgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column("salary_range", sa.String(100), nullable=True),
    )
    op.add_column(
        "jobs",
        sa.Column("rejection_reason", sa.Text(), nullable=True),
    )
