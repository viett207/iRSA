"""One-time maintenance script: reset non-admin user passwords and verify emails.

Usage (from the backend directory):
    python scripts/reset_non_admin_users.py --dry-run
    python scripts/reset_non_admin_users.py --execute

Safety:
    - Only affects users where role != 'admin'
    - Always run --dry-run first to see affected accounts
    - Password is hashed with bcrypt (same as the system uses)
"""

import sys
from sqlalchemy import select, update
from app.core.database import SyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User

NEW_PASSWORD = "12345678"


def dry_run(db):
    """Show which accounts would be affected without making changes."""
    all_users = db.execute(
        select(User.id, User.email, User.role, User.email_verified, User.is_active)
        .order_by(User.id)
    ).all()

    print("=" * 70)
    print("SAFETY CHECK — DRY RUN (no changes will be made)")
    print("=" * 70)
    print()

    admins = [u for u in all_users if u.role == "admin"]
    non_admins = [u for u in all_users if u.role != "admin"]

    print(f"Total users in database: {len(all_users)}")
    print(f"Admin accounts (EXCLUDED): {len(admins)}")
    for a in admins:
        print(f"  [SKIP] ID {a.id} | {a.email} | role={a.role}")
    print()

    print(f"Non-admin accounts (WILL BE UPDATED): {len(non_admins)}")
    for u in non_admins:
        print(f"  [UPDATE] ID {u.id} | {u.email} | role={u.role} | verified={u.email_verified} | active={u.is_active}")
    print()

    print("Changes that will be applied:")
    print(f"  1. Password -> '{NEW_PASSWORD}' (bcrypt hashed)")
    print(f"  2. email_verified -> True")
    print()
    print(f"To execute, run with --execute flag.")
    return len(non_admins)


def execute(db):
    """Apply password reset and email verification to non-admin users."""
    # Count affected
    non_admins = db.execute(
        select(User.id, User.email, User.role)
        .where(User.role != "admin")
        .order_by(User.id)
    ).all()

    if not non_admins:
        print("No non-admin accounts found. Nothing to update.")
        return

    print(f"Updating {len(non_admins)} non-admin accounts...")
    print()

    # Hash the new password once (bcrypt)
    hashed = get_password_hash(NEW_PASSWORD)

    # Bulk update all non-admin users
    db.execute(
        update(User)
        .where(User.role != "admin")
        .values(password_hash=hashed, email_verified=True)
    )
    db.commit()

    # Verify changes
    for u in non_admins:
        print(f"  [DONE] ID {u.id} | {u.email} | role={u.role}")

    print()
    print(f"Successfully updated {len(non_admins)} accounts.")
    print(f"  - Password: {NEW_PASSWORD} (bcrypt hashed)")
    print(f"  - email_verified: True")

    # Double-check admin was NOT touched
    admin_check = db.execute(
        select(User.id, User.email, User.email_verified)
        .where(User.role == "admin")
    ).all()
    print()
    print("Admin verification (should be UNCHANGED):")
    for a in admin_check:
        print(f"  ID {a.id} | {a.email} | verified={a.email_verified}")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("--dry-run", "--execute"):
        print("Usage:")
        print("  python scripts/reset_non_admin_users.py --dry-run")
        print("  python scripts/reset_non_admin_users.py --execute")
        sys.exit(1)

    db = SyncSessionLocal()
    try:
        if sys.argv[1] == "--dry-run":
            dry_run(db)
        elif sys.argv[1] == "--execute":
            execute(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
