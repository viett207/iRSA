"""Seed idempotent published job postings for local UI testing.

Run from the repository root:
    .venv\Scripts\python.exe backend\scripts\seed_mock_jobs.py
"""

import sys
import secrets
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from sqlalchemy import select

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SyncSessionLocal  # noqa: E402
from app.models.job import Job, JobCriteria  # noqa: E402
from app.models.user import User  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402


MOCK_JOBS = [
    ("Kỹ sư Backend Python", "Công nghệ", "Hà Nội", "full_time", 25, 45,
     ["Python", "FastAPI", "PostgreSQL"], ["Docker", "Redis", "AWS"], 2),
    ("Frontend Developer Angular", "Công nghệ", "TP. Hồ Chí Minh", "full_time", 22, 40,
     ["Angular", "TypeScript", "HTML/CSS"], ["RxJS", "Ng Zorro", "Figma"], 2),
    ("Kỹ sư AI/Machine Learning", "Trí tuệ nhân tạo", "Hà Nội", "full_time", 30, 55,
     ["Python", "Machine Learning", "PyTorch"], ["LLM", "LangChain", "MLOps"], 3),
    ("Data Analyst", "Dữ liệu", "Đà Nẵng", "full_time", 18, 30,
     ["SQL", "Excel", "Power BI"], ["Python", "Tableau", "Thống kê"], 1),
    ("UI/UX Designer", "Thiết kế sản phẩm", "TP. Hồ Chí Minh", "full_time", 18, 32,
     ["Figma", "Design System", "User Research"], ["Prototyping", "Adobe XD"], 2),
    ("DevOps Engineer", "Hạ tầng", "Hà Nội", "full_time", 28, 48,
     ["Docker", "Kubernetes", "CI/CD"], ["Terraform", "AWS", "Grafana"], 3),
    ("Chuyên viên Tuyển dụng", "Nhân sự", "Hà Nội", "full_time", 15, 25,
     ["Tuyển dụng", "Phỏng vấn", "Giao tiếp"], ["Employer Branding", "ATS"], 1),
    ("Product Manager", "Sản phẩm", "TP. Hồ Chí Minh", "full_time", 30, 50,
     ["Product Strategy", "Agile", "Data Analysis"], ["SQL", "UX Research"], 4),
    ("Thực tập sinh Lập trình Web", "Công nghệ", "Remote", "internship", 5, 8,
     ["JavaScript", "Git", "HTML/CSS"], ["Angular", "Python"], 0),
    ("QA Automation Engineer", "Đảm bảo chất lượng", "Đà Nẵng", "full_time", 20, 35,
     ["Automation Testing", "Selenium", "API Testing"], ["Playwright", "CI/CD"], 2),
    ("Mobile Developer Flutter", "Công nghệ", "Remote", "contract", 22, 38,
     ["Flutter", "Dart", "REST API"], ["Firebase", "iOS", "Android"], 2),
    ("Chuyên viên Digital Marketing", "Marketing", "TP. Hồ Chí Minh", "part_time", 10, 18,
     ["Content Marketing", "Facebook Ads", "Google Analytics"], ["SEO", "Canva"], 1),
]


def main() -> None:
    now = datetime.now(UTC)
    deadline = date.today() + timedelta(days=45)

    with SyncSessionLocal() as db:
        owner = db.scalar(
            select(User)
            .where(User.role.in_(["hr", "admin"]), User.is_active.is_(True))
            .order_by(User.role.desc(), User.id)
        )
        if owner is None:
            owner = db.scalar(select(User).where(User.email == "mock.hr@local.test"))
        if owner is None:
            owner = User(
                email="mock.hr@local.test",
                password_hash=get_password_hash(secrets.token_urlsafe(32)),
                full_name="HR Mock Data",
                role="hr",
                is_active=True,
                email_verified=True,
                approval_status="approved",
            )
            db.add(owner)
            db.flush()

        created = 0
        updated = 0
        for index, job_data in enumerate(MOCK_JOBS, start=1):
            title, department, location, employment_type, salary_min, salary_max, must, nice, years = job_data
            slug = f"mock-ui-{index:02d}"
            job = db.scalar(select(Job).where(Job.slug == slug))
            if job is None:
                job = Job(slug=slug, created_by=owner.id)
                db.add(job)
                created += 1
            else:
                updated += 1

            job.title_vi = title
            job.description_vi = (
                f"Chúng tôi đang tìm kiếm {title} tham gia đội ngũ {department}. "
                "Bạn sẽ làm việc trong môi trường năng động, trực tiếp tham gia các dự án thực tế, "
                "được hỗ trợ phát triển chuyên môn và có lộ trình nghề nghiệp rõ ràng."
            )
            job.requirements_vi = (
                f"Có kiến thức và kinh nghiệm phù hợp với vị trí; thành thạo {', '.join(must)}; "
                "chủ động, có tinh thần trách nhiệm và khả năng làm việc nhóm tốt."
            )
            job.department = department
            job.location = location
            job.employment_type = employment_type
            job.salary_min = salary_min
            job.salary_max = salary_max
            job.status = "active"
            job.is_published = True
            job.published_at = now - timedelta(days=index - 1)
            job.application_deadline = deadline + timedelta(days=index)
            job.approved_by = owner.id
            job.approved_at = now

            if job.criteria is None:
                job.criteria = JobCriteria()
            job.criteria.must_have_skills = must
            job.criteria.nice_to_have_skills = nice
            job.criteria.min_experience_years = years
            job.criteria.max_experience_years = years + 3
            job.criteria.min_education = "bachelor"
            job.criteria.weight_skills = 60
            job.criteria.weight_experience = 30
            job.criteria.weight_education = 10

        db.commit()
        print(f"Seeded {len(MOCK_JOBS)} published jobs: {created} created, {updated} updated.")
        print(f"Owner: {owner.email} (id={owner.id}, role={owner.role})")


if __name__ == "__main__":
    main()
