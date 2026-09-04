"""Create or update candidate accounts with verified email status.

Usage:
    .venv\\Scripts\\python.exe backend\\scripts\\create_candidates.py
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select
from app.core.database import SyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User, CandidateProfile

DEFAULT_PASSWORD = "12345abcde"

CANDIDATES = [
    {"email": "y0933194@gmail.com", "full_name": "Ứng viên Y0933194"},
    {"email": "anha32518@gmail.com", "full_name": "Nguyen Văn Anh"},
    {"email": "pyn2145@gmail.com", "full_name": "Phương Yến"},
    {"email": "phyen13112003@gmail.com", "full_name": "Phan Phương Yến"},
    {"email": "phyen13112003@gmail", "full_name": "Phan Phương Yến"},
    {"email": "huyenthu303@gmail.com", "full_name": "Huyền Thu"},
    {"email": "huyenthu0718@gmail.com", "full_name": "Huyền Thu"},
    {"email": "huyenthuzzz@gmail.com", "full_name": "Huyền Thu"},
    {"email": "fco20072003@gmail.com", "full_name": "Ứng viên FCO"},
    {"email": "vietnguyen20703@gmail.com", "full_name": "Nguyễn Văn Việt"},
]


def create_or_update_candidates() -> None:
    hashed_password = get_password_hash(DEFAULT_PASSWORD)
    
    with SyncSessionLocal() as db:
        for item in CANDIDATES:
            email = item["email"].strip().lower()
            full_name = item["full_name"]

            user = db.scalar(select(User).where(User.email == email))
            action = "updated"

            if user is None:
                user = User(
                    email=email,
                    full_name=full_name,
                    role="candidate",
                    is_active=True,
                    email_verified=True,
                    approval_status="none",
                    password_hash=hashed_password,
                )
                db.add(user)
                db.flush()
                action = "created"
            else:
                user.password_hash = hashed_password
                user.role = "candidate"
                user.is_active = True
                user.email_verified = True
                user.approval_status = "none"
                if not user.full_name:
                    user.full_name = full_name
                user.email_verification_token = None
                user.email_verification_sent_at = None
                user.password_reset_token = None
                user.password_reset_sent_at = None

            # Ensure CandidateProfile exists
            profile = db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
            if profile is None:
                profile = CandidateProfile(user_id=user.id)
                db.add(profile)

            db.commit()
            db.refresh(user)
            print(f"[{action.upper()}] ID={user.id} | Email={user.email} | Name={user.full_name} | Verified={user.email_verified} | Role={user.role}")


if __name__ == "__main__":
    create_or_update_candidates()
