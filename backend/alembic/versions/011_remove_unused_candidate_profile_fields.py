"""Remove unused columns from candidate_profiles.

Drop legacy/dead columns never exposed through the API:
resume_url (obsolete - resumes in separate table),
experience_years, skills, education, work_experience, expected_salary.

Revision ID: 011_remove_unused_profile
Revises: 010_remove_criteria_fields
Create Date: 2026-03-07

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "011_remove_unused_profile"
down_revision: Union[str, None] = "010_remove_criteria_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("candidate_profiles", "resume_url")
    op.drop_column("candidate_profiles", "experience_years")
    op.drop_column("candidate_profiles", "skills")
    op.drop_column("candidate_profiles", "education")
    op.drop_column("candidate_profiles", "work_experience")
    op.drop_column("candidate_profiles", "expected_salary")


def downgrade() -> None:
    op.add_column(
        "candidate_profiles",
        sa.Column("resume_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("experience_years", sa.Integer(), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("skills", sa.Text(), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("education", sa.Text(), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("work_experience", sa.Text(), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("expected_salary", sa.String(100), nullable=True),
    )
