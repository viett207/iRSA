"""Remove screening/analysis fields and tables.

Drop analysis_results table, screening columns from applications,
and parsing columns from resumes.

Revision ID: 009_remove_screening
Revises: 008_add_email_verification
Create Date: 2026-03-06

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "009_remove_screening"
down_revision: Union[str, None] = "008_add_email_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop analysis_results table
    op.drop_index("ix_analysis_results_overall_score", table_name="analysis_results", if_exists=True)
    op.drop_index("ix_analysis_results_job_id", table_name="analysis_results", if_exists=True)
    op.drop_index("ix_analysis_results_application_id", table_name="analysis_results", if_exists=True)
    op.drop_table("analysis_results")

    # Drop screening columns from applications
    op.drop_column("applications", "screening_score")
    op.drop_column("applications", "screening_notes")

    # Drop parsing/rules columns from resumes
    op.drop_column("resumes", "stage")
    op.drop_column("resumes", "raw_text")
    op.drop_column("resumes", "parsed_data")
    op.drop_column("resumes", "rules_result")


def downgrade() -> None:
    # Re-add resumes columns
    op.add_column("resumes", sa.Column("stage", sa.String(50), server_default="uploaded"))
    op.add_column("resumes", sa.Column("raw_text", sa.Text(), nullable=True))
    op.add_column("resumes", sa.Column("parsed_data", sa.JSON(), nullable=True))
    op.add_column("resumes", sa.Column("rules_result", sa.JSON(), nullable=True))

    # Re-add applications columns
    op.add_column("applications", sa.Column("screening_score", sa.Integer(), nullable=True))
    op.add_column("applications", sa.Column("screening_notes", sa.Text(), nullable=True))

    # Re-create analysis_results table
    op.create_table(
        "analysis_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("skills_score", sa.Float(), nullable=True),
        sa.Column("experience_score", sa.Float(), nullable=True),
        sa.Column("education_score", sa.Float(), nullable=True),
        sa.Column("culture_score", sa.Float(), nullable=True),
        sa.Column("strengths", sa.JSON(), nullable=True),
        sa.Column("weaknesses", sa.JSON(), nullable=True),
        sa.Column("red_flags", sa.JSON(), nullable=True),
        sa.Column("interview_questions", sa.JSON(), nullable=True),
        sa.Column("llm_provider", sa.String(50), nullable=True),
        sa.Column("llm_model", sa.String(100), nullable=True),
        sa.Column("raw_response", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_analysis_results_application_id", "analysis_results", ["application_id"])
    op.create_index("ix_analysis_results_job_id", "analysis_results", ["job_id"])
    op.create_index("ix_analysis_results_overall_score", "analysis_results", ["overall_score"])
