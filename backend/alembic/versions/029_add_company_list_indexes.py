"""Add indexes used by company listing filters and ordering.

Revision ID: 029_company_list_indexes
Revises: 028_company_description
"""

from typing import Union

from alembic import op


revision: str = "029_company_list_indexes"
down_revision: Union[str, None] = "028_company_description"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_companies_industry", "companies", ["industry"])
    op.create_index("ix_companies_location", "companies", ["location"])
    op.create_index("ix_companies_created_at", "companies", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_companies_created_at", table_name="companies")
    op.drop_index("ix_companies_location", table_name="companies")
    op.drop_index("ix_companies_industry", table_name="companies")
