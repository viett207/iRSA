"""Add raw_text column to resumes table.

Stores extracted plain text from PDF/DOCX for future
full-text search and AI analysis.

Revision ID: 012_add_raw_text
Revises: 011_remove_unused_profile
Create Date: 2026-03-07
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "012_add_raw_text"
down_revision: Union[str, None] = "011_remove_unused_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("resumes", sa.Column("raw_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("resumes", "raw_text")
