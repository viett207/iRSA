"""Associate every job posting with a company profile.

Revision ID: 025_job_company
Revises: 024_company_description
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "025_job_company"
down_revision: Union[str, None] = "024_company_description"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("company_code", sa.String(50), nullable=True))
    op.create_foreign_key(
        "fk_jobs_company_code",
        "jobs",
        "companies",
        ["company_code"],
        ["company_code"],
        ondelete="SET NULL",
    )
    op.create_index("ix_jobs_company_code", "jobs", ["company_code"])

    # Preserve known company ownership, then place legacy system jobs under iRSA.
    op.execute("""
        UPDATE jobs
        SET company_code = users.company_code
        FROM users
        WHERE jobs.created_by = users.id
          AND jobs.company_code IS NULL
          AND users.company_code IS NOT NULL
    """)
    op.execute("""
        INSERT INTO companies (company_code, company_name, description)
        VALUES (
            'IRSA',
            'iRSA',
            'iRSA là nền tảng tuyển dụng và quản trị nhân sự. Hồ sơ công ty này quản lý các tin tuyển dụng hệ thống chưa có đơn vị đăng tuyển riêng.'
        )
        ON CONFLICT (company_code) DO NOTHING
    """)
    op.execute("UPDATE jobs SET company_code = 'IRSA' WHERE company_code IS NULL")


def downgrade() -> None:
    op.drop_index("ix_jobs_company_code", table_name="jobs")
    op.drop_constraint("fk_jobs_company_code", "jobs", type_="foreignkey")
    op.drop_column("jobs", "company_code")
