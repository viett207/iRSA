"""Public job endpoints for job portal."""

from fastapi import APIRouter, Query, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import datetime
import logging

from app.api.deps import DBSession, CandidateUser
from app.core.exceptions import NotFoundException, BadRequestException
from app.models import Job, JobCriteria, User, Company
from app.models.application import Application
from app.models.resume import Resume
from app.services.job import JobService
from app.schemas.job import (
    PublicJobResponse,
    PublicJobListItem,
    PublicJobListResponse,
)
from app.schemas.application import ApplicationResponse
from app.services.application import ApplicationService

router = APIRouter(prefix="/jobs", tags=["public-jobs"])
logger = logging.getLogger(__name__)


class ActiveCompanyItem(BaseModel):
    company_code: str
    company_name: str
    location: str | None = None
    industry: str | None = None
    job_count: int
    latest_published_at: datetime | None = None

    class Config:
        from_attributes = True


class ActiveCompanyListResponse(BaseModel):
    items: list[ActiveCompanyItem]
    total: int


class CVJobMatchItem(BaseModel):
    """Single job result from CV-based search."""
    id: int
    slug: str
    title_vi: str
    department: str | None = None
    location: str | None = None
    employment_type: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    published_at: datetime | None = None
    total_score: float
    skill_score: float
    experience_score: float
    education_score: float
    matched_skills: list[str]

    class Config:
        from_attributes = True


class CVJobSearchResponse(BaseModel):
    items: list[CVJobMatchItem]
    total: int
    page: int
    size: int


@router.post("/search-by-cv", response_model=CVJobSearchResponse)
async def search_jobs_by_cv(
    db: DBSession,
    user: CandidateUser,
    resume_id: str | None = Form(None),
    file: UploadFile | None = File(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=500),
):
    """Search jobs by CV similarity. Uses default CV if no resume_id or file provided."""
    # 1. Get resume text
    resume_text: str | None = None

    # Parse resume_id from string (FormData always sends strings)
    parsed_resume_id: int | None = None
    if resume_id and resume_id.strip().isdigit():
        parsed_resume_id = int(resume_id.strip())

    # Check if file is actually uploaded (UploadFile can be present but empty)
    has_file = file and file.filename and file.size and file.size > 0

    if has_file:
        file_bytes = await file.read()
        from app.services.text_extractor import extract_text
        resume_text = extract_text(file_bytes, file.content_type or "application/pdf")
    elif parsed_resume_id:
        result = await db.execute(
            select(Resume).where(Resume.id == parsed_resume_id, Resume.candidate_id == user.id)
        )
        resume = result.scalar_one_or_none()
        if not resume:
            raise NotFoundException("Resume not found")
        resume_text = resume.raw_text
    else:
        result = await db.execute(
            select(Resume).where(Resume.candidate_id == user.id, Resume.is_default == True)
        )
        resume = result.scalar_one_or_none()
        if not resume:
            raise BadRequestException("Bạn chưa có CV mặc định. Vui lòng tải lên CV trước.")
        resume_text = resume.raw_text

    if not resume_text:
        raise BadRequestException("Không thể trích xuất nội dung CV")

    # 2. Get all published jobs with criteria
    jobs_result = await db.execute(
        select(Job)
        .options(selectinload(Job.criteria))
        .where((Job.is_published == True) | (Job.status.in_(["published", "active", "approved"])))
    )
    jobs = jobs_result.scalars().all()

    # 3. Score each job using ResumeScorer class methods directly
    from app.services.vietnamese_nlp import get_nlp
    from app.services.scoring import ResumeScorer

    nlp = get_nlp()
    resume_keywords = nlp.extract_keywords(resume_text)

    scored_jobs = []
    for job in jobs:
        if not job.criteria:
            continue
        criteria = job.criteria
        skill_res = ResumeScorer._score_skills(nlp, resume_keywords, criteria)
        exp_res = ResumeScorer._score_experience(resume_text, criteria)
        edu_res = ResumeScorer._score_education(resume_text, criteria)

        weights = ResumeScorer._get_weights(criteria)
        total = (
            skill_res["score"] * weights["skills"]
            + exp_res["score"] * weights["experience"]
            + edu_res["score"] * weights["education"]
        )

        scored_jobs.append({
            "job": job,
            "total_score": round(total, 2),
            "skill_score": round(skill_res["score"], 2),
            "experience_score": round(exp_res["score"], 2),
            "education_score": round(edu_res["score"], 2),
            "matched_skills": skill_res.get("matched_must", []) + skill_res.get("matched_nice", []),
        })

    # 4. Sort by score descending
    scored_jobs.sort(key=lambda x: x["total_score"], reverse=True)

    # 5. Paginate
    total_count = len(scored_jobs)
    start = (page - 1) * size
    page_items = scored_jobs[start:start + size]

    # 6. Build response
    items = [
        CVJobMatchItem(
            id=entry["job"].id,
            slug=entry["job"].slug,
            title_vi=entry["job"].title_vi,
            department=entry["job"].department,
            location=entry["job"].location,
            employment_type=entry["job"].employment_type,
            salary_min=entry["job"].salary_min,
            salary_max=entry["job"].salary_max,
            published_at=entry["job"].published_at,
            total_score=entry["total_score"],
            skill_score=entry["skill_score"],
            experience_score=entry["experience_score"],
            education_score=entry["education_score"],
            matched_skills=entry["matched_skills"],
        )
        for entry in page_items
    ]

    return CVJobSearchResponse(items=items, total=total_count, page=page, size=size)


@router.get("/active-companies", response_model=ActiveCompanyListResponse)
async def list_active_companies(
    db: DBSession,
    limit: int = Query(20, ge=1, le=50),
):
    """List companies with active published jobs, sorted by most recent posting."""
    # Subquery: get company_code + job count + latest published_at for published jobs
    stmt = (
        select(
            User.company_code,
            func.count(Job.id).label("job_count"),
            func.max(Job.published_at).label("latest_published_at"),
        )
        .join(User, Job.created_by == User.id)
        .where(((Job.is_published == True) | (Job.status.in_(["published", "active", "approved"]))), User.company_code.isnot(None))
        .group_by(User.company_code)
        .order_by(func.max(Job.published_at).desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        return ActiveCompanyListResponse(items=[], total=0)

    # Fetch company details
    codes = [r.company_code for r in rows]
    companies_result = await db.execute(
        select(Company).where(Company.company_code.in_(codes))
    )
    company_map = {c.company_code: c for c in companies_result.scalars().all()}

    items = []
    for r in rows:
        comp = company_map.get(r.company_code)
        if comp:
            items.append(ActiveCompanyItem(
                company_code=comp.company_code,
                company_name=comp.company_name,
                location=comp.location,
                industry=comp.industry,
                job_count=r.job_count,
                latest_published_at=r.latest_published_at,
            ))

    return ActiveCompanyListResponse(items=items, total=len(items))


class CompanyDetailResponse(BaseModel):
    """Company info + list of active jobs."""
    company_code: str
    company_name: str
    location: str | None = None
    industry: str | None = None
    jobs: list[PublicJobListItem]
    total_jobs: int

    class Config:
        from_attributes = True


@router.get("/companies/{company_code}", response_model=CompanyDetailResponse)
async def get_company_detail(company_code: str, db: DBSession):
    """Get company info and its active published jobs."""
    result = await db.execute(
        select(Company).where(Company.company_code == company_code)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise NotFoundException("Company not found")

    app_count_subquery = (
        select(func.count(Application.id))
        .where(Application.job_id == Job.id)
        .correlate(Job)
        .scalar_subquery()
    )

    # Fetch published jobs from this company
    stmt = (
        select(Job, app_count_subquery.label("app_count"))
        .options(selectinload(Job.criteria))
        .join(User, Job.created_by == User.id)
        .where(((Job.is_published == True) | (Job.status.in_(["published", "active", "approved"]))), User.company_code == company_code)
        .order_by(Job.published_at.desc())
    )
    jobs_result = await db.execute(stmt)
    rows = jobs_result.all()

    job_items = [
        PublicJobListItem(
            id=j.id,
            slug=j.slug,
            title_vi=j.title_vi,
            department=j.department,
            location=j.location,
            employment_type=j.employment_type,
            salary_min=j.salary_min,
            salary_max=j.salary_max,
            published_at=j.published_at,
            application_deadline=j.application_deadline,
            applications_count=app_count,
            must_have_skills=j.criteria.must_have_skills if j.criteria and j.criteria.must_have_skills else [],
            min_experience_years=j.criteria.min_experience_years if j.criteria else None,
            max_experience_years=j.criteria.max_experience_years if j.criteria else None,
            company_name=company.company_name,
            company_code=company.company_code,
            description_vi=j.description_vi,
        )
        for j, app_count in rows
    ]

    return CompanyDetailResponse(
        company_code=company.company_code,
        company_name=company.company_name,
        location=company.location,
        industry=company.industry,
        jobs=job_items,
        total_jobs=len(job_items),
    )


@router.get("", response_model=PublicJobListResponse)
async def list_published_jobs(
    db: DBSession,
    q: str = Query(None, description="Search query"),
    location: str = Query(None),
    department: str = Query(None),
    employment_type: str = Query(None),
    salary_min: int = Query(None, ge=0, description="Min salary filter (millions VND)"),
    salary_max: int = Query(None, ge=0, description="Max salary filter (millions VND)"),
    min_experience: int = Query(None, ge=0, description="Min experience years"),
    max_experience: int = Query(None, ge=0, description="Max experience years"),
    company_code: str = Query(None, description="Filter by company code"),
    order_by: str = Query("newest", pattern="^(newest|salary_desc|salary_asc|popular)$"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
):
    """List published jobs with search, filters, and sorting."""
    query = (
        select(Job)
        .options(
            selectinload(Job.criteria),
            selectinload(Job.creator).selectinload(User.company),
        )
        .where((Job.is_published == True) | (Job.status.in_(["published", "active", "approved"])))
    )

    if company_code:
        # Filter jobs by creator's company_code
        query = query.join(User, Job.created_by == User.id).where(
            User.company_code == company_code
        )

    if q:
        search_pattern = f"%{q}%"
        query = query.where(
            (Job.title_vi.ilike(search_pattern))
            | (Job.department.ilike(search_pattern))
        )

    if location:
        query = query.where(Job.location.ilike(f"%{location}%"))
    if department:
        query = query.where(Job.department.ilike(f"%{department}%"))
    if employment_type:
        query = query.where(Job.employment_type == employment_type)

    if salary_min is not None:
        query = query.where(
            (Job.salary_max >= salary_min) | (Job.salary_min.is_(None))
        )
    if salary_max is not None:
        query = query.where(
            (Job.salary_min <= salary_max) | (Job.salary_min.is_(None))
        )

    if min_experience is not None or max_experience is not None:
        query = query.outerjoin(JobCriteria)
        if min_experience is not None:
            query = query.where(
                (JobCriteria.min_experience_years <= min_experience)
                | (JobCriteria.id.is_(None))
            )
        if max_experience is not None:
            query = query.where(
                (JobCriteria.max_experience_years >= max_experience)
                | (JobCriteria.max_experience_years.is_(None))
                | (JobCriteria.id.is_(None))
            )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Application count subquery (avoids loading all Application objects)
    app_count_subquery = (
        select(func.count(Application.id))
        .where(Application.job_id == Job.id)
        .correlate(Job)
        .scalar_subquery()
    )

    # Sorting
    if order_by == "salary_desc":
        query = query.order_by(Job.salary_max.desc().nullslast())
    elif order_by == "salary_asc":
        query = query.order_by(Job.salary_min.asc().nullslast())
    elif order_by == "popular":
        query = query.order_by(app_count_subquery.desc())
    else:  # newest (default)
        query = query.order_by(Job.published_at.desc())

    # Get page — use add_columns for application count instead of loading relationship
    offset = (page - 1) * size
    query = (
        query.add_columns(app_count_subquery.label("app_count"))
        .offset(offset)
        .limit(size)
    )
    result = await db.execute(query)
    rows = result.all()

    items = []
    for job, app_count in rows:
        company_name = None
        company_code_val = None
        if job.creator:
            company_code_val = job.creator.company_code
            if job.creator.company:
                company_name = job.creator.company.company_name
            elif company_code_val:
                company_name = company_code_val

        items.append(
            PublicJobListItem(
                id=job.id,
                slug=job.slug,
                title_vi=job.title_vi,
                department=job.department,
                location=job.location,
                employment_type=job.employment_type,
                salary_min=job.salary_min,
                salary_max=job.salary_max,
                published_at=job.published_at,
                application_deadline=job.application_deadline,
                applications_count=app_count,
                must_have_skills=job.criteria.must_have_skills if job.criteria and job.criteria.must_have_skills else [],
                min_experience_years=job.criteria.min_experience_years if job.criteria else None,
                max_experience_years=job.criteria.max_experience_years if job.criteria else None,
                company_name=company_name,
                company_code=company_code_val,
                description_vi=job.description_vi,
            )
        )

    return PublicJobListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


@router.get("/{slug}", response_model=PublicJobResponse)
async def get_job_by_slug(slug: str, db: DBSession):
    """Get job details by slug."""
    result = await db.execute(
        select(Job)
        .options(
            selectinload(Job.criteria),
            selectinload(Job.creator).selectinload(User.company),
        )
        .where(Job.slug == slug, (Job.is_published == True) | (Job.status.in_(["published", "active", "approved"])))
    )
    job = result.scalar_one_or_none()

    if not job:
        raise NotFoundException("Job not found")

    company_name = None
    company_code_val = None
    if job.creator:
        company_code_val = job.creator.company_code
        if job.creator.company:
            company_name = job.creator.company.company_name
        elif company_code_val:
            company_name = company_code_val

    criteria = job.criteria
    return PublicJobResponse(
        id=job.id,
        slug=job.slug,
        title_vi=job.title_vi,
        description_vi=job.description_vi,
        requirements_vi=job.requirements_vi,
        benefits_vi=job.benefits_vi,
        company_name=company_name,
        company_code=company_code_val,
        department=job.department,
        location=job.location,
        employment_type=job.employment_type,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        application_deadline=job.application_deadline,
        published_at=job.published_at,
        must_have_skills=criteria.must_have_skills if criteria else [],
        nice_to_have_skills=criteria.nice_to_have_skills if criteria else [],
        min_experience_years=criteria.min_experience_years if criteria else 0,
        max_experience_years=criteria.max_experience_years if criteria else None,
        min_education=criteria.min_education if criteria else None,
    )


@router.post("/{slug}/apply", response_model=ApplicationResponse)
async def apply_to_job(
    slug: str,
    db: DBSession,
    user: CandidateUser,
    resume_id: int | None = Form(None),
    cover_letter: str | None = Form(None),
    file: UploadFile | None = File(None),
):
    service = ApplicationService(db)
    application = await service.apply(
        job_slug=slug,
        user_id=user.id,
        resume_id=resume_id,
        file=file,
        cover_letter=cover_letter,
    )

    # Materialize the response before optional side effects. A later rollback
    # must not expire ORM attributes needed to acknowledge the saved record.
    application_response = ApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        job_title=application.job.title_vi,
        job_slug=application.job.slug,
        job_department=application.job.department,
        job_location=application.job.location,
        resume_id=application.resume_id,
        resume_filename=application.resume.original_filename,
        cover_letter=application.cover_letter,
        public_status=application.public_status,
        submitted_at=application.submitted_at,
    )

    # The application is already committed. Failures in optional notifications
    # must not turn a successful submission into a misleading HTTP 500.
    try:
        send_application_received_notification.delay(
            email=user.email,
            full_name=user.full_name,
            job_title=application.job.title_vi or "Unknown",
        )
    except Exception:
        logger.exception("Unable to enqueue application receipt for application %s", application.id)

    try:
        score_application_task.delay(application.id)
    except Exception:
        logger.exception("Unable to enqueue scoring for application %s", application.id)

    try:
        from app.services.notification_service import notify_hr_for_new_application
        await notify_hr_for_new_application(
            db, application.job.created_by,
            candidate_name=user.full_name,
            job_title=application.job.title_vi or "N/A",
            job_id=application.job_id,
            application_id=application.id,
        )
        await db.commit()
    except Exception:
        logger.exception("Unable to notify HR for application %s", application.id)
        await db.rollback()

    return application_response
