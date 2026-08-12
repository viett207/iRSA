"""Add AI evaluation columns to scoring_results.

Stores Gemini AI deep skill assessment results for shortlisted candidates.

Revision ID: 017_ai_evaluation
Revises: 016_scoring_results
Create Date: 2026-03-15
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "017_ai_evaluation"
down_revision: Union[str, None] = "016_scoring_results"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "scoring_results",
        sa.Column("ai_score", sa.Float(), nullable=True),
    )
    op.add_column(
        "scoring_results",
        sa.Column("ai_evaluation", JSONB(), nullable=True),
    )
    op.add_column(
        "scoring_results",
        sa.Column("ai_evaluated_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("scoring_results", "ai_evaluated_at")
    op.drop_column("scoring_results", "ai_evaluation")
    op.drop_column("scoring_results", "ai_score")
