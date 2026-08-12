"""Portal schema - resumes, applications, profile updates

Revision ID: 003_portal
Revises: 002_jobs
Create Date: 2025-12-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "003_portal"
down_revision: Union[str, None] = "002_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add linkedin/portfolio URLs to candidate_profiles
    op.add_column(
        "candidate_profiles",
        sa.Column("linkedin_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("portfolio_url", sa.String(500), nullable=True),
    )

    # Create resumes table
    op.create_table(
        "resumes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=True),
        # File info
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("minio_path", sa.String(500), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        # Processing status
        sa.Column(
            "stage",
            sa.String(50),
            nullable=False,
            server_default="uploaded",
        ),
        # Parsing results (Phase 4)
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column(
            "parsed_content",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "rules_result",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        # User preferences
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        # Constraints
        sa.ForeignKeyConstraint(
            ["candidate_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["job_id"], ["jobs.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resumes_candidate_id", "resumes", ["candidate_id"], unique=False)
    op.create_index("ix_resumes_job_id", "resumes", ["job_id"], unique=False)

    # Create applications table
    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("resume_id", sa.Integer(), nullable=False),
        # Application content
        sa.Column("cover_letter", sa.Text(), nullable=True),
        # Status
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="submitted",
        ),
        sa.Column(
            "public_status",
            sa.String(50),
            nullable=False,
            server_default="in_review",
        ),
        # Screening results (Phase 4)
        sa.Column("screening_score", sa.Integer(), nullable=True),
        sa.Column("screening_notes", sa.Text(), nullable=True),
        # Timestamps
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        # Constraints
        sa.ForeignKeyConstraint(
            ["job_id"], ["jobs.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["candidate_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["resume_id"], ["resumes.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "job_id", "candidate_id", name="uq_application_job_candidate"
        ),
    )
    op.create_index("ix_applications_job_id", "applications", ["job_id"], unique=False)
    op.create_index(
        "ix_applications_candidate_id", "applications", ["candidate_id"], unique=False
    )
    op.create_index(
        "ix_applications_resume_id", "applications", ["resume_id"], unique=False
    )
    op.create_index("ix_applications_status", "applications", ["status"], unique=False)


def downgrade() -> None:
    # Drop applications
    op.drop_index("ix_applications_status", table_name="applications")
    op.drop_index("ix_applications_resume_id", table_name="applications")
    op.drop_index("ix_applications_candidate_id", table_name="applications")
    op.drop_index("ix_applications_job_id", table_name="applications")
    op.drop_table("applications")

    # Drop resumes
    op.drop_index("ix_resumes_job_id", table_name="resumes")
    op.drop_index("ix_resumes_candidate_id", table_name="resumes")
    op.drop_table("resumes")

    # Drop linkedin/portfolio columns from candidate_profiles
    op.drop_column("candidate_profiles", "portfolio_url")
    op.drop_column("candidate_profiles", "linkedin_url")
