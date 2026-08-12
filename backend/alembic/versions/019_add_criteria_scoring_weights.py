"""Add scoring weight columns to job_criteria.

Allows per-job customization of skill/experience/education weights.

Revision ID: 019_criteria_weights
Revises: 018_password_reset
Create Date: 2026-03-18
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "019_criteria_weights"
down_revision: Union[str, None] = "018_password_reset"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("job_criteria", sa.Column("weight_skills", sa.Integer(), nullable=False, server_default="60"))
    op.add_column("job_criteria", sa.Column("weight_experience", sa.Integer(), nullable=False, server_default="30"))
    op.add_column("job_criteria", sa.Column("weight_education", sa.Integer(), nullable=False, server_default="10"))


def downgrade() -> None:
    op.drop_column("job_criteria", "weight_education")
    op.drop_column("job_criteria", "weight_experience")
    op.drop_column("job_criteria", "weight_skills")
