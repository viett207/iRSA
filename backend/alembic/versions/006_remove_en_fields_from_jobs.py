"""Remove title_en, description_en, requirements_en from jobs.

Revision ID: 006_remove_en_fields
Revises: 005_salary_columns
Create Date: 2026-03-02

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "006_remove_en_fields"
down_revision: Union[str, None] = "005_salary_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("jobs", "title_en")
    op.drop_column("jobs", "description_en")
    op.drop_column("jobs", "requirements_en")


def downgrade() -> None:
    op.add_column("jobs", sa.Column("requirements_en", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("description_en", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("title_en", sa.String(255), nullable=True))
