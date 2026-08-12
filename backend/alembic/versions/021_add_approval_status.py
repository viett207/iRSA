"""Add approval_status to users table.

Supports HR registration flow: pending -> approved/rejected.

Revision ID: 021_approval_status
Revises: 020_companies
Create Date: 2026-03-18
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "021_approval_status"
down_revision: Union[str, None] = "020_companies"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "approval_status",
            sa.String(20),
            nullable=False,
            server_default="none",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "approval_status")
