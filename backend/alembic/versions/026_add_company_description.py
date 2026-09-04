"""Add company profile description.

Revision ID: 026_company_description
Revises: 025_interview_candidate_response
"""

from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = "026_company_description"
down_revision: Union[str, None] = "025_interview_candidate_response"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("companies")}
    if "description" not in columns:
        op.add_column("companies", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("companies")}
    if "description" in columns:
        op.drop_column("companies", "description")
