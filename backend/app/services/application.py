"""Application service for job applications."""

from fastapi import UploadFile, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, defer

from app.models import Application, Job, Resume
from app.services.resume import ResumeService
from app.services.storage import get_storage_service


class ApplicationService:
    """Service for managing job applications."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.resume_service = ResumeService(db)
        self.storage = get_storage_service()

    async def apply(
        self,
        job_slug: str,
        user_id: int,
        resume_id: int | None = None,
        file: UploadFile | None = None,
        cover_letter: str | None = None,
    ) -> Application:
        """Apply to a job with existing or new resume."""
        # Get job by slug
        job = await self._get_published_job(job_slug)

        # Check not already applied
        existing = await self._get_existing_application(job.id, user_id)
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "ALREADY_APPLIED",
                    "message": "Bạn đã ứng tuyển vị trí này trước đó.",
                },
            )

        # Handle resume
        if file:
            # Upload new resume for this application
            resume = await self.resume_service.upload(file, user_id, job.id)
        elif resume_id:
            # Use existing resume
            resume = await self.resume_service.get(resume_id, user_id)
        else:
            # Use default resume
            resume = await self.resume_service.get_default(user_id)
            if not resume:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "RESUME_REQUIRED",
                        "message": "Vui lòng tải lên CV hoặc chọn một CV đã lưu.",
                    },
                )

        # Create application
        application = Application(
            job_id=job.id,
            candidate_id=user_id,
            resume_id=resume.id,
            cover_letter=cover_letter,
        )

        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)

        # Load relationships for response
        await self.db.refresh(application, ["job", "resume"])

        return application

    async def list_by_user(
        self, user_id: int, page: int = 1, size: int = 20
    ) -> tuple[list[Application], int, dict[str, int]]:
        """List user's applications with pagination and status counts."""
        # Count total
        count_result = await self.db.execute(
            select(func.count()).where(Application.candidate_id == user_id)
        )
        total = count_result.scalar() or 0

        # Aggregate status counts
        status_rows = (
            await self.db.execute(
                select(Application.public_status, func.count())
                .where(Application.candidate_id == user_id)
                .group_by(Application.public_status)
            )
        ).all()
        status_counts = {row[0]: row[1] for row in status_rows}

        # Get page
        offset = (page - 1) * size
        result = await self.db.execute(
            select(Application)
            .options(selectinload(Application.job), selectinload(Application.resume).defer(Resume.raw_text))
            .where(Application.candidate_id == user_id)
            .order_by(Application.submitted_at.desc())
            .offset(offset)
            .limit(size)
        )
        applications = list(result.scalars().all())

        return applications, total, status_counts

    async def get_applied_job_ids(self, user_id: int) -> list[int]:
        """Return all job IDs the user has applied to."""
        result = await self.db.execute(
            select(Application.job_id).where(Application.candidate_id == user_id)
        )
        return list(result.scalars().all())

    async def get(self, app_id: int, user_id: int) -> Application:
        """Get application by ID, verifying ownership."""
        result = await self.db.execute(
            select(Application)
            .options(selectinload(Application.job), selectinload(Application.resume).defer(Resume.raw_text))
            .where(Application.id == app_id, Application.candidate_id == user_id)
        )
        application = result.scalar_one_or_none()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        return application

    async def get_with_resume_url(
        self, app_id: int, user_id: int
    ) -> tuple[Application, str]:
        """Get application with resume download URL."""
        application = await self.get(app_id, user_id)
        url = self.storage.get_presigned_url(application.resume.minio_path)
        return application, url

    async def _get_published_job(self, slug: str) -> Job:
        """Get a published job by slug."""
        result = await self.db.execute(
            select(Job).where(Job.slug == slug, Job.is_published == True)
        )
        job = result.scalar_one_or_none()
        if not job:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "JOB_NOT_ACCEPTING_APPLICATIONS",
                    "message": "Tin tuyển dụng không tồn tại hoặc đã ngừng nhận hồ sơ.",
                },
            )
        return job

    async def _get_existing_application(
        self, job_id: int, user_id: int
    ) -> Application | None:
        """Check if user already applied to job."""
        result = await self.db.execute(
            select(Application).where(
                Application.job_id == job_id, Application.candidate_id == user_id
            )
        )
        return result.scalar_one_or_none()
