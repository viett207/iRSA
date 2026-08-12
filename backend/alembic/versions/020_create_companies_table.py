"""Create companies table and add company_code to users.

Revision ID: 020_companies
Revises: 019_criteria_weights
Create Date: 2026-03-18
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "020_companies"
down_revision: Union[str, None] = "019_criteria_weights"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create companies table
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "company_code", sa.String(50), nullable=False, unique=True,
        ),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("industry", sa.String(255), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_companies_company_code", "companies", ["company_code"])
    op.create_index("ix_companies_name", "companies", ["company_name"])

    # Add company_code column to users
    op.add_column(
        "users",
        sa.Column("company_code", sa.String(50), nullable=True),
    )
    op.create_foreign_key(
        "fk_users_company_code",
        "users",
        "companies",
        ["company_code"],
        ["company_code"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_company_code", "users", ["company_code"])


def downgrade() -> None:
    op.drop_index("ix_users_company_code", table_name="users")
    op.drop_constraint("fk_users_company_code", "users", type_="foreignkey")
    op.drop_column("users", "company_code")
    op.drop_index("ix_companies_name", table_name="companies")
    op.drop_index("ix_companies_company_code", table_name="companies")
    op.drop_table("companies")
