"""Add a company introduction field.

Revision ID: 024_company_description
Revises: 023_notifications
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "024_company_description"
down_revision: Union[str, None] = "023_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "description")
