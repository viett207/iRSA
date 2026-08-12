from math import ceil
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.company import Company
from app.schemas.company import (
    CompanyCreate, CompanyUpdate, CompanyResponse, CompanyList,
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
