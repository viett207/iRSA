from math import ceil
from datetime import datetime
from sqlalchemy import select, func, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.company import Company
from app.models.user import User
from app.models.job import Job
from app.models.application import Application
from app.schemas.company import (
    CompanyCreate, CompanyUpdate, CompanyResponse, CompanyList,
    CompanyOverview, CompanyOverviewStats, CompanyJobSummary, CompanyOverviewResponse,
    PublicCompanyItem, PublicCompanyListResponse,
)


class CompanyService:
    """Service for company management operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_companies(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        industry: str | None = None,
        location: str | None = None,
    ) -> CompanyList:
        """Get paginated list of companies."""
        query = select(Company)

        if search:
            query = query.where(
                Company.company_name.ilike(f"%{search}%")
                | Company.company_code.ilike(f"%{search}%")
            )
        if industry:
            query = query.where(Company.industry == industry)
        if location:
            query = query.where(Company.location == location)

        # Return the page and its total in one database round trip. This matters
        # when the API and PostgreSQL are hosted in different networks.
        offset = (page - 1) * page_size
        filtered_query = query
        query = filtered_query.add_columns(
            func.count().over().label("total_count")
        ).order_by(
            Company.created_at.desc(), Company.id.desc()
        ).offset(offset).limit(page_size)

        rows = (await self.db.execute(query)).all()
        companies = [row[0] for row in rows]
        total = rows[0].total_count if rows else 0

        # A stale/out-of-range page should still report the real total so the
        # client can recover its paginator. Normal requests use one query.
        if not rows and page > 1:
            count_query = select(func.count()).select_from(
                filtered_query.with_only_columns(Company.id).subquery()
            )
            total = (await self.db.execute(count_query)).scalar() or 0

        return CompanyList(
            items=[CompanyResponse.model_validate(c) for c in companies],
            total=total,
            page=page,
            page_size=page_size,
            pages=ceil(total / page_size) if total > 0 else 1,
        )

    async def get_company(self, company_id: int) -> Company:
        """Get company by ID."""
        result = await self.db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = result.scalar_one_or_none()
        if not company:
            raise NotFoundException(f"Company with ID {company_id} not found")
        return company

    async def get_company_overview(self, company_id: int) -> CompanyOverview:
        company = await self.get_company(company_id)
        company_job_ids = (
            select(Job.id)
            .join(User, Job.created_by == User.id)
            .where(User.company_code == company.company_code)
        )
        total_jobs_query = select(func.count()).select_from(
            company_job_ids.subquery()
        ).scalar_subquery()
        active_jobs_query = select(func.count(Job.id)).where(
            Job.id.in_(company_job_ids),
            Job.is_published.is_(True),
        ).scalar_subquery()
        total_applications_query = select(func.count(Application.id)).where(
            Application.job_id.in_(company_job_ids)
        ).scalar_subquery()
        in_progress_applications_query = select(func.count(Application.id)).where(
            Application.job_id.in_(company_job_ids),
            Application.status.not_in(("hired", "rejected")),
        ).scalar_subquery()
        hr_members_query = select(func.count(User.id)).where(
            User.company_code == company.company_code,
            User.role.in_(("admin", "leader", "recruiter")),
            User.is_active.is_(True),
        ).scalar_subquery()
        stats = (
            await self.db.execute(
                select(
                    total_jobs_query.label("total_jobs"),
                    active_jobs_query.label("active_jobs"),
                    total_applications_query.label("total_applications"),
                    in_progress_applications_query.label("in_progress_applications"),
                    hr_members_query.label("hr_members"),
                )
            )
        ).one()
        total_jobs = stats.total_jobs or 0
        active_jobs = stats.active_jobs or 0
        total_applications = stats.total_applications or 0
        in_progress_applications = stats.in_progress_applications or 0
        hr_members = stats.hr_members or 0

        application_count = (
            select(func.count(Application.id))
            .where(Application.job_id == Job.id)
            .correlate(Job)
            .scalar_subquery()
        )
        job_rows = (
            await self.db.execute(
                select(Job, application_count.label("applications_count"))
                .where(Job.id.in_(company_job_ids))
                .order_by(Job.created_at.desc())
                .limit(20)
            )
        ).all()
        jobs = [
            CompanyJobSummary(
                id=job.id,
                title_vi=job.title_vi,
                department=job.department,
                location=job.location,
                employment_type=job.employment_type,
                status=job.status,
                applications_count=count,
                created_at=job.created_at,
                application_deadline=job.application_deadline,
            )
            for job, count in job_rows
        ]
        return CompanyOverview(
            company=CompanyResponse.model_validate(company),
            stats=CompanyOverviewStats(
                total_jobs=total_jobs,
                active_jobs=active_jobs,
                total_applications=total_applications,
                in_progress_applications=in_progress_applications,
                hr_members=hr_members,
            ),
            jobs=jobs,
        )

    async def create_company(self, data: CompanyCreate) -> Company:
        """Create a new company."""
        # Check company_code uniqueness
        result = await self.db.execute(
            select(Company).where(Company.company_code == data.company_code)
        )
        if result.scalar_one_or_none():
            raise ConflictException(
                f"Company code '{data.company_code}' already exists"
            )

        company = Company(
            company_code=data.company_code,
            company_name=data.company_name,
            location=data.location,
            industry=data.industry,
            description=data.description,
        )
        self.db.add(company)
        await self.db.commit()
        await self.db.refresh(company)
        return company

    async def update_company(
        self, company_id: int, data: CompanyUpdate
    ) -> Company:
        """Update an existing company."""
        company = await self.get_company(company_id)

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(company, field, value)

        await self.db.commit()
        await self.db.refresh(company)
        return company

    async def delete_company(self, company_id: int) -> None:
        """Delete a company."""
        company = await self.get_company(company_id)
        await self.db.delete(company)
        await self.db.commit()

    async def get_company_overview(
        self, identifier: int | str, public_only: bool = False
    ) -> CompanyOverviewResponse:
        """Get full overview of a company including statistics and jobs."""
        company = None
        if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
            comp_id = int(identifier)
            res = await self.db.execute(select(Company).where(Company.id == comp_id))
            company = res.scalar_one_or_none()

        if not company:
            res = await self.db.execute(
                select(Company).where(Company.company_code == str(identifier))
            )
            company = res.scalar_one_or_none()

        if not company:
            raise NotFoundException(f"Company '{identifier}' not found")

        # HR members count
        hr_count_res = await self.db.execute(
            select(func.count(User.id)).where(User.company_code == company.company_code)
        )
        hr_members = hr_count_res.scalar() or 0

        # Subquery for application count per job
        app_count_sub = (
            select(func.count(Application.id))
            .where(Application.job_id == Job.id)
            .correlate(Job)
            .scalar_subquery()
        )

        # Base query for company jobs
        jobs_query = (
            select(Job, app_count_sub.label("app_count"))
            .join(User, Job.created_by == User.id)
            .where(User.company_code == company.company_code)
        )

        if public_only:
            jobs_query = jobs_query.where(
                (Job.is_published == True) | (Job.status.in_(["published", "active", "approved"]))
            )

        jobs_query = jobs_query.order_by(Job.created_at.desc())
        jobs_res = await self.db.execute(jobs_query)
        job_rows = jobs_res.all()

        # Stats
        total_jobs_res = await self.db.execute(
            select(func.count(Job.id))
            .join(User, Job.created_by == User.id)
            .where(User.company_code == company.company_code)
        )
        total_jobs_count = total_jobs_res.scalar() or 0

        active_jobs_res = await self.db.execute(
            select(func.count(Job.id))
            .join(User, Job.created_by == User.id)
            .where(
                User.company_code == company.company_code,
                (Job.is_published == True) | (Job.status.in_(["published", "active", "approved"]))
            )
        )
        active_jobs_count = active_jobs_res.scalar() or 0

        total_app_res = await self.db.execute(
            select(func.count(Application.id))
            .join(Job, Application.job_id == Job.id)
            .join(User, Job.created_by == User.id)
            .where(User.company_code == company.company_code)
        )
        total_applications = total_app_res.scalar() or 0

        in_prog_app_res = await self.db.execute(
            select(func.count(Application.id))
            .join(Job, Application.job_id == Job.id)
            .join(User, Job.created_by == User.id)
            .where(
                User.company_code == company.company_code,
                Application.status.in_(["submitted", "in_review", "shortlisted", "interviewing", "interview_passed", "in_progress"])
            )
        )
        in_progress_applications = in_prog_app_res.scalar() or 0

        stats = CompanyOverviewStats(
            total_jobs=total_jobs_count,
            active_jobs=active_jobs_count,
            total_applications=total_applications,
            in_progress_applications=in_progress_applications,
            hr_members=hr_members,
        )

        job_summaries = []
        for j, app_count in job_rows:
            deadline_dt = None
            if j.application_deadline:
                if isinstance(j.application_deadline, datetime):
                    deadline_dt = j.application_deadline
                else:
                    deadline_dt = datetime.combine(j.application_deadline, datetime.min.time())

            job_summaries.append(
                CompanyJobSummary(
                    id=j.id,
                    slug=j.slug,
                    title_vi=j.title_vi,
                    department=j.department,
                    location=j.location,
                    employment_type=j.employment_type,
                    status=j.status,
                    applications_count=app_count or 0,
                    created_at=j.created_at,
                    application_deadline=deadline_dt,
                    salary_min=j.salary_min,
                    salary_max=j.salary_max,
                )
            )

        company_resp = CompanyResponse.model_validate(company)

        return CompanyOverviewResponse(
            company=company_resp,
            stats=stats,
            jobs=job_summaries,
            company_code=company.company_code,
            company_name=company.company_name,
            location=company.location,
            industry=company.industry,
            description=getattr(company, "description", None),
            total_jobs=active_jobs_count if public_only else total_jobs_count,
        )

    async def get_public_companies(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        industry: str | None = None,
        location: str | None = None,
    ) -> PublicCompanyListResponse:
        """Get paginated public list of companies with active job counts."""
        active_job_counts = (
            select(
                User.company_code.label("company_code"),
                func.count(Job.id).label("active_jobs_count"),
            )
            .join(Job, Job.created_by == User.id)
            .where(
                (Job.is_published.is_(True))
                | (Job.status.in_(["published", "active", "approved"]))
            )
            .group_by(User.company_code)
            .subquery()
        )
        query = select(
            Company,
            func.coalesce(active_job_counts.c.active_jobs_count, 0).label(
                "active_jobs_count"
            ),
            func.count().over().label("total_count"),
        ).outerjoin(
            active_job_counts,
            active_job_counts.c.company_code == Company.company_code,
        )

        if search:
            query = query.where(
                Company.company_name.ilike(f"%{search}%")
                | Company.company_code.ilike(f"%{search}%")
            )
        if industry:
            query = query.where(Company.industry == industry)
        if location:
            query = query.where(Company.location == location)

        offset = (page - 1) * page_size
        rows = (
            await self.db.execute(
                query.order_by(Company.company_name.asc(), Company.id.asc())
                .offset(offset)
                .limit(page_size)
            )
        ).all()
        total = rows[0].total_count if rows else 0
        if not rows and page > 1:
            total = (
                await self.db.execute(
                    select(func.count()).select_from(
                        query.with_only_columns(Company.id).subquery()
                    )
                )
            ).scalar() or 0

        items = [
            PublicCompanyItem(
                id=c.id,
                company_code=c.company_code,
                company_name=c.company_name,
                location=c.location,
                industry=c.industry,
                description=f"Doanh nghiệp hoạt động tại {c.location}" if c.location else None,
                active_jobs_count=active_jobs_count,
                created_at=c.created_at,
            )
            for c, active_jobs_count, _ in rows
        ]

        return PublicCompanyListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=ceil(total / page_size) if total > 0 else 1,
        )
