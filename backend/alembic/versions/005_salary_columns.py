"""Add salary_min and salary_max columns to jobs.

Revision ID: 005_salary_columns
Revises: 004_screening_pipeline
Create Date: 2026-03-01

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "005_salary_columns"
down_revision: Union[str, None] = "004_screening_pipeline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("salary_min", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("salary_max", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "salary_max")
    op.drop_column("jobs", "salary_min")
