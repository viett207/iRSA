"""Create application_messages table for HR-Candidate chat and interview invitations.

Revision ID: 026_application_messages
Revises: 025_interview_candidate_response
"""

from typing import Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "026_application_messages"
down_revision: Union[str, None] = "025_interview_candidate_response"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "application_messages" not in tables:
        op.create_table(
            "application_messages",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
            sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("sender_role", sa.String(20), nullable=False),
            sa.Column("sender_name", sa.String(255), nullable=True),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("message_type", sa.String(30), nullable=False, server_default="text"),
            sa.Column("metadata_json", JSONB(), nullable=True),
            sa.Column("is_read", sa.Boolean(), default=False, server_default="false", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_app_messages_app_created", "application_messages", ["application_id", "created_at"])
        op.create_index("ix_app_messages_sender", "application_messages", ["sender_id"])


def downgrade() -> None:
    op.drop_index("ix_app_messages_sender", "application_messages")
    op.drop_index("ix_app_messages_app_created", "application_messages")
    op.drop_table("application_messages")
