from math import ceil
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.company import Company
from app.models.application import Application
from app.models.job import Job
from app.models.user import User
from app.schemas.company import (
    CompanyCreate, CompanyUpdate, CompanyResponse, CompanyList,
    CompanyOverview, CompanyOverviewStats, CompanyJobSummary,
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

        # Total count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        # Paginate
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size).order_by(
            Company.created_at.desc()
        )

        result = await self.db.execute(query)
        companies = result.scalars().all()

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
        """Get a company's recruitment metrics and its newest job postings."""
        company = await self.get_company(company_id)

        company_jobs = (
            select(Job.id)
            .where(Job.company_code == company.company_code)
        )

        total_jobs = (await self.db.execute(
            select(func.count()).select_from(company_jobs.subquery())
        )).scalar() or 0
        active_jobs = (await self.db.execute(
            select(func.count())
            .select_from(Job)
            .where(
                Job.company_code == company.company_code,
                Job.status == "active",
            )
        )).scalar() or 0
        total_applications = (await self.db.execute(
            select(func.count(Application.id))
            .select_from(Application)
            .join(Job, Application.job_id == Job.id)
            .where(Job.company_code == company.company_code)
        )).scalar() or 0
        in_progress_applications = (await self.db.execute(
            select(func.count(Application.id))
            .select_from(Application)
            .join(Job, Application.job_id == Job.id)
            .where(
                Job.company_code == company.company_code,
                Application.status.in_([
                    "submitted", "reviewing", "shortlisted", "interviewing", "offered",
                ]),
            )
        )).scalar() or 0
        hr_members = (await self.db.execute(
            select(func.count(User.id)).where(
                User.company_code == company.company_code,
                User.role.in_(["recruiter", "leader"]),
                User.is_active.is_(True),
            )
        )).scalar() or 0

        application_count = (
            select(func.count(Application.id))
            .where(Application.job_id == Job.id)
            .correlate(Job)
            .scalar_subquery()
        )
        jobs_result = await self.db.execute(
            select(Job, application_count.label("applications_count"))
            .where(Job.company_code == company.company_code)
            .order_by(Job.created_at.desc())
            .limit(12)
        )
        jobs = [
            CompanyJobSummary(
                id=job.id,
                title_vi=job.title_vi,
                department=job.department,
                location=job.location,
                employment_type=job.employment_type,
                status=job.status,
                applications_count=applications_count,
                created_at=job.created_at,
                application_deadline=job.application_deadline,
            )
            for job, applications_count in jobs_result.all()
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
