"""Remove email verification fields from users.

Revision ID: 007_remove_email_verification
Revises: 006_remove_en_fields
Create Date: 2026-03-05

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "007_remove_email_verification"
down_revision: Union[str, None] = "006_remove_en_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "email_verified")
    op.drop_column("users", "email_verification_token")
    op.drop_column("users", "email_verification_sent_at")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "email_verification_sent_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column("email_verification_token", sa.String(255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "email_verified",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
