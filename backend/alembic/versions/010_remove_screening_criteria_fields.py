"""Remove screening-specific fields from job_criteria.

Drop LLM/scoring fields no longer needed after screening removal:
skill_match_threshold, custom_rules, analysis_focus, custom_prompt, weights.

Revision ID: 010_remove_criteria_fields
Revises: 009_remove_screening
Create Date: 2026-03-06

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "010_remove_criteria_fields"
down_revision: Union[str, None] = "009_remove_screening"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("job_criteria", "skill_match_threshold")
    op.drop_column("job_criteria", "custom_rules")
    op.drop_column("job_criteria", "analysis_focus")
    op.drop_column("job_criteria", "custom_prompt")
    op.drop_column("job_criteria", "weights")


def downgrade() -> None:
    op.add_column(
        "job_criteria",
        sa.Column("skill_match_threshold", sa.Integer(), server_default="80"),
    )
    op.add_column(
        "job_criteria",
        sa.Column("custom_rules", JSONB(), server_default="[]"),
    )
    op.add_column(
        "job_criteria",
        sa.Column("analysis_focus", JSONB(), server_default="[]"),
    )
    op.add_column(
        "job_criteria",
        sa.Column("custom_prompt", sa.Text(), nullable=True),
    )
    op.add_column(
        "job_criteria",
        sa.Column(
            "weights",
            JSONB(),
            server_default='{"skills": 40, "experience": 30, "education": 20, "culture": 10}',
        ),
    )
