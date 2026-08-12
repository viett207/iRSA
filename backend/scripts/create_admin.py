"""Create or update a local administrator account.

Run from the repository root:
    .venv\Scripts\python.exe backend\scripts\create_admin.py \
        --email admin@local.test --password "Admin@123456" \
        --name "Local Admin"
"""

import argparse
import sys
from pathlib import Path

from sqlalchemy import select

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SyncSessionLocal  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models.user import User  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Create/update a local admin account")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Local Admin")
    args = parser.parse_args()

    if len(args.password) < 8:
        parser.error("--password must contain at least 8 characters")

    email = args.email.strip().lower()
    with SyncSessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        action = "updated"
        if user is None:
            user = User(email=email)
            db.add(user)
            action = "created"

        user.password_hash = get_password_hash(args.password)
        user.full_name = args.name.strip() or "Local Admin"
        user.role = "admin"
        user.is_active = True
        user.email_verified = True
        user.approval_status = "approved"
        user.email_verification_token = None
        user.email_verification_sent_at = None
        user.password_reset_token = None
        user.password_reset_sent_at = None

        db.commit()
        db.refresh(user)
        print(f"Admin {action}: id={user.id}, email={user.email}")


if __name__ == "__main__":
    main()
