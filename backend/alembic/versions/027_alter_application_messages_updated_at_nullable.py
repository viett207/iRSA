"""Alter application_messages updated_at column to be nullable.

Revision ID: 027_app_msg_updated_at_null
Revises: 026_application_messages
"""

from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = "027_app_msg_updated_at_null"
down_revision: Union[str, None] = "026_application_messages"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c["name"]: c for c in inspector.get_columns("application_messages")}
    if "updated_at" in cols and not cols["updated_at"]["nullable"]:
        op.alter_column("application_messages", "updated_at", nullable=True)


def downgrade() -> None:
    op.alter_column("application_messages", "updated_at", nullable=False)
