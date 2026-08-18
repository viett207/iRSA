"""Job service for job management and workflow operations."""

import uuid
from math import ceil
from datetime import datetime, UTC
from slugify import slugify
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException, ForbiddenException
from app.models.job import Job, JobCriteria
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.job import (
    JobCreate,
    JobUpdate,
    JobResponse,
    JobListResponse,
    JobCriteriaResponse,
)


class JobService:
    """Service for job management operations."""

    VALID_TRANSITIONS = {
        "draft": ["pending_approval"],
        "pending_approval": ["approved", "rejected"],
        "rejected": ["pending_approval"],
        "approved": ["active"],
        "active": ["approved", "closed"],
        "closed": [],
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_slug(self, title: str) -> str:
        """Generate unique slug from title."""
        base_slug = slugify(title, lowercase=True, max_length=200)
        unique_suffix = uuid.uuid4().hex[:6]
        return f"{base_slug}-{unique_suffix}"

    async def _log_action(
        self,
        entity_type: str,
        entity_id: int,
        action: str,
        actor_id: int,
        details: dict | None = None,
    ) -> None:
        """Log an audit action."""
        log = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            details=details,
        )
        self.db.add(log)

    @staticmethod
    def _format_salary(salary_min: int | None, salary_max: int | None) -> str | None:
        """Generate salary display text from numeric fields."""
        if salary_min is not None and salary_max is not None and salary_min > 0 and salary_max > 0:
            return f"{salary_min} triệu" if salary_min == salary_max else f"{salary_min} - {salary_max} triệu"
        if salary_max is not None and salary_max > 0:
            return f"Lên đến {salary_max} triệu"
        if salary_min is not None and salary_min > 0:
            return f"Từ {salary_min} triệu"
        return None

    def _build_job_response(self, job: Job) -> JobResponse:
        """Build JobResponse from Job model."""
        criteria_response = None
        if job.criteria:
            criteria_response = JobCriteriaResponse(
                id=job.criteria.id,
                must_have_skills=job.criteria.must_have_skills or [],
                nice_to_have_skills=job.criteria.nice_to_have_skills or [],
                min_experience_years=job.criteria.min_experience_years,
                max_experience_years=job.criteria.max_experience_years,
                min_education=job.criteria.min_education,
            )

        return JobResponse(
            id=job.id,
            title_vi=job.title_vi,
            description_vi=job.description_vi,
            requirements_vi=job.requirements_vi,
            slug=job.slug,
            department=job.department,
            location=job.location,
            employment_type=job.employment_type,
            salary_min=job.salary_min,
            salary_max=job.salary_max,
            status=job.status,
            is_published=job.is_published,
            published_at=job.published_at,
            application_deadline=job.application_deadline,
            created_by=job.created_by,
            creator_name=job.creator.full_name if job.creator else "Unknown",
            approved_by=job.approved_by,
            approver_name=job.approver.full_name if job.approver else None,
            approved_at=job.approved_at,
            criteria=criteria_response,
            applications_count=0,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )

    async def list_jobs(
        self,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
        created_by: int | None = None,
        department: str | None = None,
        company_code: str | None = None,
        search: str | None = None,
    ) -> JobListResponse:
        """Get paginated list of jobs with filters."""
        query = select(Job).options(
            selectinload(Job.creator),
            selectinload(Job.approver),
            selectinload(Job.criteria),
        )

        if status:
            query = query.where(Job.status == status)
        if created_by:
            query = query.where(Job.created_by == created_by)
        if department:
            query = query.where(Job.department.ilike(f"%{department}%"))
        if search:
            search_term = f"%{search}%"
            query = query.where(
                Job.title_vi.ilike(search_term)
                | Job.description_vi.ilike(search_term)
                | Job.requirements_vi.ilike(search_term)
                | Job.department.ilike(search_term)
            )
        if company_code:
            query = query.join(User, Job.created_by == User.id).where(
                User.company_code == company_code
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size).order_by(Job.created_at.desc())

        result = await self.db.execute(query)
        jobs = result.scalars().all()

        return JobListResponse(
            items=[self._build_job_response(job) for job in jobs],
            total=total,
            page=page,
            page_size=page_size,
            pages=ceil(total / page_size) if total > 0 else 1,
        )

    async def get_job(self, job_id: int) -> Job:
        """Get job by ID with relationships."""
        result = await self.db.execute(
            select(Job)
            .options(
                selectinload(Job.creator),
                selectinload(Job.approver),
                selectinload(Job.criteria),
            )
            .where(Job.id == job_id)
        )
        job = result.scalar_one_or_none()

        if not job:
            raise NotFoundException(f"Job with ID {job_id} not found")

        return job

    async def get_job_response(self, job_id: int) -> JobResponse:
        """Get job response by ID."""
        job = await self.get_job(job_id)
        return self._build_job_response(job)

    async def create_job(self, data: JobCreate, user_id: int) -> JobResponse:
        """Create a new job in draft status."""
        slug = self._generate_slug(data.title_vi)

        job = Job(
            title_vi=data.title_vi,
            description_vi=data.description_vi,
            requirements_vi=data.requirements_vi,
            slug=slug,
            department=data.department,
            location=data.location,
            employment_type=data.employment_type,
            salary_min=data.salary_min,
            salary_max=data.salary_max,
            application_deadline=data.application_deadline,
            status="draft",
            created_by=user_id,
        )
        self.db.add(job)
        await self.db.flush()

        if data.criteria:
            criteria = JobCriteria(
                job_id=job.id,
                must_have_skills=data.criteria.must_have_skills,
                nice_to_have_skills=data.criteria.nice_to_have_skills,
                min_experience_years=data.criteria.min_experience_years,
                max_experience_years=data.criteria.max_experience_years,
                min_education=data.criteria.min_education,
            )
            self.db.add(criteria)

        await self._log_action("job", job.id, "create", user_id)
        await self.db.commit()

        return await self.get_job_response(job.id)

    async def update_job(
        self, job_id: int, data: JobUpdate, user: User
    ) -> JobResponse:
        """Update job (only draft or rejected)."""
        job = await self.get_job(job_id)

        if job.created_by != user.id and user.role != "admin":
            raise ForbiddenException("Only job creator or admin can update")

        if job.status not in ["draft", "rejected"]:
            raise BadRequestException("Can only edit jobs in draft or rejected status")

        update_data = data.model_dump(exclude_unset=True, exclude={"criteria"})
        for field, value in update_data.items():
            setattr(job, field, value)

        if data.criteria is not None:
            if job.criteria:
                criteria_data = data.criteria.model_dump()
                for field, value in criteria_data.items():
                    setattr(job.criteria, field, value)
            else:
                criteria = JobCriteria(job_id=job.id, **data.criteria.model_dump())
                self.db.add(criteria)

        await self._log_action("job", job.id, "update", user.id, {"fields": list(update_data.keys())})
        await self.db.commit()

        return await self.get_job_response(job.id)

    async def delete_job(self, job_id: int, user: User) -> None:
        """Delete job (only draft status)."""
        job = await self.get_job(job_id)

        if job.created_by != user.id and user.role != "admin":
            raise ForbiddenException("Only job creator or admin can delete")

        if job.status != "draft":
            raise BadRequestException("Can only delete jobs in draft status")

        await self._log_action("job", job.id, "delete", user.id)
        await self.db.delete(job)
        await self.db.commit()

    async def submit_job(self, job_id: int, user: User) -> JobResponse:
        """Submit job for approval."""
        job = await self.get_job(job_id)

        if job.created_by != user.id and user.role != "admin":
            raise ForbiddenException("Only job creator or admin can submit")

        if "pending_approval" not in self.VALID_TRANSITIONS.get(job.status, []):
            raise BadRequestException(
                f"Cannot submit job from {job.status} status"
            )

        job.status = "pending_approval"

        await self._log_action("job", job.id, "submit", user.id)
        await self.db.commit()

        return await self.get_job_response(job.id)

    async def approve_job(
        self, job_id: int, user: User, comment: str | None = None
    ) -> JobResponse:
        """Approve job (leader/admin only)."""
        job = await self.get_job(job_id)

        if user.role not in ["leader", "admin"]:
            raise ForbiddenException("Only leader or admin can approve jobs")

        if "approved" not in self.VALID_TRANSITIONS.get(job.status, []):
            raise BadRequestException(
                f"Cannot approve job from {job.status} status"
            )

        job.status = "approved"
        job.approved_by = user.id
        job.approved_at = datetime.now(UTC)

        await self._log_action(
            "job", job.id, "approve", user.id, {"comment": comment}
        )

        # Notify the recruiter who created the job
        from app.services.notification_service import notify_job_approved
        await notify_job_approved(self.db, job.created_by, job.title_vi or "N/A", job.id)

        await self.db.commit()

        return await self.get_job_response(job.id)

    async def reject_job(
        self, job_id: int, user: User, reason: str
    ) -> JobResponse:
        """Reject job (leader/admin only)."""
        job = await self.get_job(job_id)

        if user.role not in ["leader", "admin"]:
            raise ForbiddenException("Only leader or admin can reject jobs")

        if "rejected" not in self.VALID_TRANSITIONS.get(job.status, []):
            raise BadRequestException(
                f"Cannot reject job from {job.status} status"
            )

        job.status = "rejected"
        job.approved_by = user.id
        job.approved_at = datetime.now(UTC)

        await self._log_action("job", job.id, "reject", user.id, {"reason": reason})

        # Notify the recruiter who created the job
        from app.services.notification_service import notify_job_rejected
        await notify_job_rejected(self.db, job.created_by, job.title_vi or "N/A", job.id, reason)

        await self.db.commit()

        return await self.get_job_response(job.id)

    async def publish_job(self, job_id: int, user: User) -> JobResponse:
        """Publish approved job."""
        job = await self.get_job(job_id)

        if (
            job.created_by != user.id
            and user.role not in ["recruiter", "admin"]
        ):
            raise ForbiddenException("Only job creator or recruiter/admin can publish")

        if "active" not in self.VALID_TRANSITIONS.get(job.status, []):
            raise BadRequestException(
                f"Cannot publish job from {job.status} status"
            )

        job.status = "active"
        job.is_published = True
        job.published_at = datetime.now(UTC)

        await self._log_action("job", job.id, "publish", user.id)
        await self.db.commit()

        return await self.get_job_response(job.id)

    async def unpublish_job(self, job_id: int, user: User) -> JobResponse:
        """Unpublish active job (back to approved)."""
        job = await self.get_job(job_id)

        if (
            job.created_by != user.id
            and user.role not in ["recruiter", "admin"]
        ):
            raise ForbiddenException("Only job creator or recruiter/admin can unpublish")

        if job.status != "active":
            raise BadRequestException("Can only unpublish active jobs")

        job.status = "approved"
        job.is_published = False

        await self._log_action("job", job.id, "unpublish", user.id)
        await self.db.commit()

        return await self.get_job_response(job.id)

    async def close_job(self, job_id: int, user: User) -> JobResponse:
        """Close active job (no more applications)."""
        job = await self.get_job(job_id)

        if (
            job.created_by != user.id
            and user.role not in ["recruiter", "admin"]
        ):
            raise ForbiddenException("Only job creator or recruiter/admin can close")

        if job.status != "active":
            raise BadRequestException("Can only close active jobs")

        job.status = "closed"
        job.is_published = False

        await self._log_action("job", job.id, "close", user.id)
        await self.db.commit()

        return await self.get_job_response(job.id)
