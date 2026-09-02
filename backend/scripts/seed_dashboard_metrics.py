"""Seed idempotent historical records used by the real Dashboard calculations.

This script does not write KPI values. It creates dated jobs and applications;
`GET /api/v1/dashboard/stats` derives trends and time-to-fill from those rows.

Run from the repository root:
    python3 backend/scripts/seed_dashboard_metrics.py
"""

import secrets
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SyncSessionLocal  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models.application import Application  # noqa: E402
from app.models.job import Job  # noqa: E402
from app.models.resume import Resume  # noqa: E402
from app.models.user import User  # noqa: E402


SEED_PREFIX = "dashboard-metrics-v1"


def get_owner(db) -> User:
    owner = db.scalar(
        select(User)
        .where(
            User.role.in_(["admin", "leader", "recruiter", "hr"]),
            User.is_active.is_(True),
        )
        .order_by(
            (User.role == "admin").desc(),
            User.id,
        )
    )
    if owner is None:
        raise RuntimeError("Không tìm thấy tài khoản Admin/HR đang hoạt động để sở hữu dữ liệu seed.")
    return owner


def upsert_candidate(db, index: int, owner: User) -> User:
    email = f"{SEED_PREFIX}-candidate-{index:02d}@example.test"
    candidate = db.scalar(select(User).where(User.email == email))
    if candidate is None:
        candidate = User(
            email=email,
            password_hash=get_password_hash(secrets.token_urlsafe(32)),
            full_name=f"Ứng viên dữ liệu Dashboard {index:02d}",
            role="candidate",
            is_active=True,
            email_verified=True,
            approval_status="approved",
            company_code=owner.company_code,
        )
        db.add(candidate)
        db.flush()
    return candidate


def upsert_job(
    db,
    owner: User,
    slug_suffix: str,
    title: str,
    department: str,
    location: str,
    created_at: datetime,
    published_at: datetime,
) -> Job:
    slug = f"{SEED_PREFIX}-{slug_suffix}"
    job = db.scalar(select(Job).where(Job.slug == slug))
    if job is None:
        job = Job(slug=slug, created_by=owner.id, title_vi=title)
        db.add(job)
        db.flush()

    job.title_vi = title
    job.description_vi = "Dữ liệu lịch sử phục vụ tính toán chỉ số Bảng điều khiển."
    job.requirements_vi = "Bản ghi seed idempotent; không dùng để nhận hồ sơ thật."
    job.department = department
    job.location = location
    job.employment_type = "full_time"
    job.status = "active"
    job.is_published = True
    job.created_at = created_at
    job.published_at = published_at
    job.approved_by = owner.id
    job.approved_at = published_at
    return job


def upsert_application(
    db,
    job: Job,
    candidate: User,
    status: str,
    submitted_at: datetime,
    updated_at: datetime | None,
) -> Application:
    resume = db.scalar(
        select(Resume).where(
            Resume.candidate_id == candidate.id,
            Resume.job_id == job.id,
            Resume.minio_path == f"dashboard-seed/{job.id}/{candidate.id}.pdf",
        )
    )
    if resume is None:
        resume = Resume(
            candidate_id=candidate.id,
            job_id=job.id,
            original_filename=f"CV_Dashboard_{candidate.id}.pdf",
            minio_path=f"dashboard-seed/{job.id}/{candidate.id}.pdf",
            file_size=1,
            content_type="application/pdf",
            raw_text="CV seed phục vụ thống kê Dashboard.",
            is_default=False,
            uploaded_at=submitted_at,
            created_at=submitted_at,
        )
        db.add(resume)
        db.flush()

    application = db.scalar(
        select(Application).where(
            Application.job_id == job.id,
            Application.candidate_id == candidate.id,
        )
    )
    if application is None:
        application = Application(job_id=job.id, candidate_id=candidate.id)
        db.add(application)

    application.status = status
    application.resume_id = resume.id
    application.public_status = "shortlisted" if status == "hired" else "in_review"
    application.submitted_at = submitted_at
    application.created_at = submitted_at
    application.updated_at = updated_at
    application.cover_letter = "Hồ sơ seed phục vụ thống kê Dashboard từ dữ liệu database."
    return application


def main() -> None:
    now = datetime.now(UTC)

    with SyncSessionLocal() as db:
        owner = get_owner(db)
        candidates = [upsert_candidate(db, index, owner) for index in range(1, 15)]

        current_job = upsert_job(
            db,
            owner,
            "current-week",
            "Chuyên viên Phân tích Dữ liệu — Dashboard",
            "Dữ liệu",
            "Hà Nội",
            now - timedelta(days=5),
            now - timedelta(days=4),
        )
        previous_job = upsert_job(
            db,
            owner,
            "previous-week",
            "Kỹ sư Phần mềm — Dashboard",
            "Công nghệ",
            "TP. Hồ Chí Minh",
            now - timedelta(days=12),
            now - timedelta(days=11),
        )
        current_hired_job = upsert_job(
            db,
            owner,
            "hired-current-period",
            "Quản lý Sản phẩm — Dashboard",
            "Sản phẩm",
            "Đà Nẵng",
            now - timedelta(days=23),
            now - timedelta(days=22),
        )
        previous_hired_job = upsert_job(
            db,
            owner,
            "hired-previous-period",
            "Chuyên viên Nhân sự — Dashboard",
            "Nhân sự",
            "Hà Nội",
            now - timedelta(days=55),
            now - timedelta(days=54),
        )
        db.flush()

        # Six applications this week and four in the preceding week create an
        # observable period-over-period application trend.
        for index in range(6):
            submitted_at = now - timedelta(days=1 + index % 5, hours=index)
            upsert_application(db, current_job, candidates[index], "submitted", submitted_at, None)

        for index in range(4):
            submitted_at = now - timedelta(days=8 + index, hours=index)
            upsert_application(db, previous_job, candidates[6 + index], "submitted", submitted_at, None)

        # These persisted completion timestamps yield 18 and 20 days to fill;
        # the API derives the average and the -2 day period trend itself.
        current_hired_at = now - timedelta(days=5)
        previous_hired_at = now - timedelta(days=35)
        upsert_application(
            db,
            current_hired_job,
            candidates[10],
            "hired",
            now - timedelta(days=20),
            current_hired_at,
        )
        upsert_application(
            db,
            previous_hired_job,
            candidates[11],
            "hired",
            now - timedelta(days=50),
            previous_hired_at,
        )

        db.commit()
        print("Đã seed dữ liệu lịch sử Dashboard thành công.")
        print(f"Chủ sở hữu: {owner.email} (id={owner.id}, company={owner.company_code or 'toàn hệ thống'})")
        print("Bản ghi: 4 tin tuyển dụng, 12 hồ sơ (6 tuần này, 4 tuần trước, 2 đã tuyển).")


if __name__ == "__main__":
    main()
