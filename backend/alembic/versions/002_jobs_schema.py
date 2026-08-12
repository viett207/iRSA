"""Jobs schema with job_criteria and audit_log

Revision ID: 002_jobs
Revises: 001_initial
Create Date: 2025-12-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "002_jobs"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create jobs table
    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        # Vietnamese content
        sa.Column("title_vi", sa.String(255), nullable=False),
        sa.Column("description_vi", sa.Text(), nullable=True),
        sa.Column("requirements_vi", sa.Text(), nullable=True),
        # English content
        sa.Column("title_en", sa.String(255), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column("requirements_en", sa.Text(), nullable=True),
        # Common fields
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("employment_type", sa.String(50), nullable=True),
        sa.Column("salary_range", sa.String(100), nullable=True),
        # Status workflow
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("application_deadline", sa.Date(), nullable=True),
        # Approval info
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
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
            ["created_by"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["approved_by"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_jobs_slug", "jobs", ["slug"], unique=True)
    op.create_index("ix_jobs_status", "jobs", ["status"], unique=False)
    op.create_index("ix_jobs_created_by", "jobs", ["created_by"], unique=False)
    op.create_index(
        "ix_jobs_status_created_by", "jobs", ["status", "created_by"], unique=False
    )
    op.create_index("ix_jobs_is_published", "jobs", ["is_published"], unique=False)

    # Create job_criteria table
    op.create_table(
        "job_criteria",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        # Stage 2 - Rule-based matching
        sa.Column(
            "must_have_skills",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "nice_to_have_skills",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("skill_match_threshold", sa.Integer(), nullable=False, server_default="80"),
        sa.Column("min_experience_years", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_experience_years", sa.Integer(), nullable=True),
        sa.Column("min_education", sa.String(50), nullable=True),
        sa.Column(
            "custom_rules",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        # Stage 3 - LLM analysis
        sa.Column(
            "analysis_focus",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("custom_prompt", sa.Text(), nullable=True),
        sa.Column(
            "weights",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default='{"skills": 40, "experience": 30, "education": 20, "culture": 10}',
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
            ["job_id"], ["jobs.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_criteria_job_id", "job_criteria", ["job_id"], unique=True)

    # Create audit_log table
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column(
            "details",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Constraints
        sa.ForeignKeyConstraint(
            ["actor_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_log_entity_type", "audit_log", ["entity_type"], unique=False)
    op.create_index("ix_audit_log_entity_id", "audit_log", ["entity_id"], unique=False)
    op.create_index("ix_audit_log_action", "audit_log", ["action"], unique=False)


def downgrade() -> None:
    # Drop audit_log
    op.drop_index("ix_audit_log_action", table_name="audit_log")
    op.drop_index("ix_audit_log_entity_id", table_name="audit_log")
    op.drop_index("ix_audit_log_entity_type", table_name="audit_log")
    op.drop_table("audit_log")

    # Drop job_criteria
    op.drop_index("ix_job_criteria_job_id", table_name="job_criteria")
    op.drop_table("job_criteria")

    # Drop jobs
    op.drop_index("ix_jobs_is_published", table_name="jobs")
    op.drop_index("ix_jobs_status_created_by", table_name="jobs")
    op.drop_index("ix_jobs_created_by", table_name="jobs")
    op.drop_index("ix_jobs_status", table_name="jobs")
    op.drop_index("ix_jobs_slug", table_name="jobs")
    op.drop_table("jobs")
