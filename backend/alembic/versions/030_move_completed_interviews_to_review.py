"""Move completed interviews to the round-three decision queue.

Revision ID: 030_completed_to_review
Revises: 029_company_list_indexes
"""

from typing import Union

from alembic import op


revision: str = "030_completed_to_review"
down_revision: Union[str, None] = "029_company_list_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE applications
        SET status = 'offered', public_status = 'shortlisted'
        WHERE status = 'interviewing'
          AND EXISTS (
            SELECT 1
            FROM interviews AS completed_interview
            WHERE completed_interview.application_id = applications.id
              AND completed_interview.status = 'completed'
              AND NOT EXISTS (
                SELECT 1
                FROM interviews AS newer_interview
                WHERE newer_interview.application_id = applications.id
                  AND newer_interview.id > completed_interview.id
              )
          )
        """
    )


def downgrade() -> None:
    # The previous status cannot be reconstructed safely after HR decisions.
    pass
