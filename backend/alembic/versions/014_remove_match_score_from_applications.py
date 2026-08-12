"""Remove match_score and match_details from applications.

Scoring functionality has been removed from the platform.

Revision ID: 014_remove_match_score
Revises: 013_add_match_score
Create Date: 2026-03-07
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "014_remove_match_score"
down_revision: Union[str, None] = "013_add_match_score"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("applications", "match_details")
    op.drop_column("applications", "match_score")


def downgrade() -> None:
    op.add_column(
        "applications",
        sa.Column("match_score", sa.Float(), nullable=True),
    )
    op.add_column(
        "applications",
        sa.Column("match_details", JSONB(), nullable=True),
    )
