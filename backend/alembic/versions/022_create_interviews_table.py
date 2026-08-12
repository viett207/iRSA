"""Create interviews table for interview scheduling.

Revision ID: 022_interviews
Revises: 021_add_approval_status
"""

from typing import Union
import sqlalchemy as sa
from alembic import op

revision: str = "022_interviews"
down_revision: Union[str, None] = "021_approval_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "interviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "application_id",
            sa.Integer(),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "scheduled_by",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=False,
            index=True,
        ),
        sa.Column("interview_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("interview_type", sa.String(20), nullable=False, server_default="online"),
        sa.Column("location", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("interviews")
