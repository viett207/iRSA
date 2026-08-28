"""Add candidate response fields to interviews table.

Revision ID: 024_interview_candidate_response
Revises: 023_notifications
"""

from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = "024_interview_candidate_response"
down_revision: Union[str, None] = "023_notifications"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column(
        "interviews",
        sa.Column("candidate_response", sa.String(30), nullable=False, server_default="pending"),
    )
    op.add_column(
        "interviews",
        sa.Column("candidate_response_note", sa.Text(), nullable=True),
    )
    op.add_column(
        "interviews",
        sa.Column("candidate_proposed_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "interviews",
        sa.Column("candidate_responded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_interviews_candidate_response", "interviews", ["candidate_response"])


def downgrade() -> None:
    op.drop_index("ix_interviews_candidate_response", "interviews")
    op.drop_column("interviews", "candidate_responded_at")
    op.drop_column("interviews", "candidate_proposed_date")
    op.drop_column("interviews", "candidate_response_note")
    op.drop_column("interviews", "candidate_response")
