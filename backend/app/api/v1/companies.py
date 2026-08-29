from fastapi import APIRouter, Query

from app.api.deps import DBSession, AdminUser
from app.schemas.company import (
    CompanyResponse, CompanyCreate, CompanyUpdate, CompanyList, CompanyOverview,
)
from app.services.company import CompanyService

router = APIRouter()


@router.get("", response_model=CompanyList)
async def list_companies(
    db: DBSession,
    _: AdminUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    industry: str | None = Query(None),
    location: str | None = Query(None),
):
    """List all companies (admin only)."""
    service = CompanyService(db)
    return await service.get_companies(
        page=page, page_size=page_size, search=search,
        industry=industry, location=location,
    )


@router.post("", response_model=CompanyResponse, status_code=201)
async def create_company(data: CompanyCreate, db: DBSession, _: AdminUser):
    """Create a new company (admin only)."""
    service = CompanyService(db)
    return await service.create_company(data)


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: int, db: DBSession, _: AdminUser):
    """Get company by ID (admin only)."""
    service = CompanyService(db)
    return await service.get_company(company_id)


@router.get("/{company_id}/overview", response_model=CompanyOverview)
async def get_company_overview(company_id: int, db: DBSession, _: AdminUser):
    """Get company details with recruitment metrics and newest job postings."""
    service = CompanyService(db)
    return await service.get_company_overview(company_id)


@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: int, data: CompanyUpdate, db: DBSession, _: AdminUser,
):
    """Update company (admin only)."""
    service = CompanyService(db)
    return await service.update_company(company_id, data)


@router.delete("/{company_id}", status_code=204)
async def delete_company(company_id: int, db: DBSession, _: AdminUser):
    """Delete company (admin only)."""
    service = CompanyService(db)
    await service.delete_company(company_id)
