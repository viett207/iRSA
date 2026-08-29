"""Add question, answer, and evaluation fields to interviews.

Revision ID: 024_interview_evaluation
Revises: 023_notifications
"""

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "024_interview_evaluation"
down_revision: Union[str, None] = "023_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "interviews",
        sa.Column(
            "questions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "interviews",
        sa.Column(
            "answers",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column("interviews", sa.Column("overall_score", sa.Float(), nullable=True))
    op.add_column("interviews", sa.Column("overall_feedback", sa.Text(), nullable=True))
    op.add_column("interviews", sa.Column("recommendation", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("interviews", "recommendation")
    op.drop_column("interviews", "overall_feedback")
    op.drop_column("interviews", "overall_score")
    op.drop_column("interviews", "answers")
    op.drop_column("interviews", "questions")
