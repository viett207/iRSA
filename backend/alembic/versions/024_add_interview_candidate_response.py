"""Add candidate response fields to interviews table.

Revision ID: 025_interview_candidate_response
Revises: 024_interview_evaluation
"""

from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = "025_interview_candidate_response"
down_revision: Union[str, None] = "024_interview_evaluation"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {c["name"] for c in inspector.get_columns("interviews")}

    if "candidate_response" not in existing_cols:
        op.add_column(
            "interviews",
            sa.Column("candidate_response", sa.String(30), nullable=False, server_default="pending"),
        )
    if "candidate_response_note" not in existing_cols:
        op.add_column(
            "interviews",
            sa.Column("candidate_response_note", sa.Text(), nullable=True),
        )
    if "candidate_proposed_date" not in existing_cols:
        op.add_column(
            "interviews",
            sa.Column("candidate_proposed_date", sa.DateTime(timezone=True), nullable=True),
        )
    if "candidate_responded_at" not in existing_cols:
        op.add_column(
            "interviews",
            sa.Column("candidate_responded_at", sa.DateTime(timezone=True), nullable=True),
        )

    existing_indices = {i["name"] for i in inspector.get_indexes("interviews")}
    if "ix_interviews_candidate_response" not in existing_indices:
        op.create_index("ix_interviews_candidate_response", "interviews", ["candidate_response"])


def downgrade() -> None:
    op.drop_index("ix_interviews_candidate_response", "interviews")
    op.drop_column("interviews", "candidate_responded_at")
    op.drop_column("interviews", "candidate_proposed_date")
    op.drop_column("interviews", "candidate_response_note")
    op.drop_column("interviews", "candidate_response")
