"""Create scoring_results table.

Stores resume-job matching evaluation scores and detailed breakdown.

Revision ID: 016_scoring_results
Revises: 015_remove_salary_rejection
Create Date: 2026-03-07
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "016_scoring_results"
down_revision: Union[str, None] = "015_remove_salary_rejection"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scoring_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "application_id",
            sa.Integer(),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("total_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("skill_match_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("experience_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("education_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("match_details", JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "scored_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("scoring_version", sa.String(20), server_default="1.0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("application_id", name="uq_scoring_result_application"),
    )


def downgrade() -> None:
    op.drop_table("scoring_results")
