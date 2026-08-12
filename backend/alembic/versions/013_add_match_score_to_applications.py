"""Add match_score and match_details to applications.

Stores resume-job matching results for recruiter ranking.

Revision ID: 013_add_match_score
Revises: 012_add_raw_text
Create Date: 2026-03-07
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "013_add_match_score"
down_revision: Union[str, None] = "012_add_raw_text"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column("match_score", sa.Float(), nullable=True),
    )
    op.add_column(
        "applications",
        sa.Column("match_details", JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("applications", "match_details")
    op.drop_column("applications", "match_score")
