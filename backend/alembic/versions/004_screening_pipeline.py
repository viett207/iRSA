"""Phase 4: Screening pipeline schema.

Revision ID: 004_screening_pipeline
Revises: 003_portal
Create Date: 2025-12-27

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004_screening_pipeline"
down_revision: Union[str, None] = "003_portal"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename parsed_content to parsed_data in resumes table
    op.alter_column(
        "resumes",
        "parsed_content",
        new_column_name="parsed_data",
        existing_type=postgresql.JSONB(),
        existing_nullable=True,
    )

    # Create analysis_results table
    op.create_table(
        "analysis_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("resume_id", sa.Integer(), nullable=False),
        # Scores
        sa.Column("overall_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skills_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("experience_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("education_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("culture_score", sa.Integer(), nullable=False, server_default="0"),
        # Text
        sa.Column("fit_summary", sa.Text(), nullable=True),
        # Arrays
        sa.Column("strengths", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("weaknesses", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("culture_signals", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("red_flags", postgresql.ARRAY(sa.String()), nullable=True),
        # JSON
        sa.Column("interview_questions", postgresql.JSONB(), nullable=True),
        # Metadata
        sa.Column("llm_provider", sa.String(50), nullable=True),
        sa.Column(
            "analyzed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["application_id"],
            ["applications.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["job_id"],
            ["jobs.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["resume_id"],
            ["resumes.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("application_id", name="uq_analysis_application"),
    )

    # Create indexes
    op.create_index(
        "ix_analysis_results_application_id",
        "analysis_results",
        ["application_id"],
    )
    op.create_index(
        "ix_analysis_results_job_id",
        "analysis_results",
        ["job_id"],
    )
    op.create_index(
        "ix_analysis_results_overall_score",
        "analysis_results",
        ["overall_score"],
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_analysis_results_overall_score", table_name="analysis_results")
    op.drop_index("ix_analysis_results_job_id", table_name="analysis_results")
    op.drop_index("ix_analysis_results_application_id", table_name="analysis_results")

    # Drop table
    op.drop_table("analysis_results")

    # Rename back
    op.alter_column(
        "resumes",
        "parsed_data",
        new_column_name="parsed_content",
        existing_type=postgresql.JSONB(),
        existing_nullable=True,
    )
