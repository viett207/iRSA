"""Profile and resume management endpoints for candidates."""

from fastapi import APIRouter, UploadFile, File

from app.api.deps import DBSession, CandidateUser
from app.models import CandidateProfile
from app.schemas.profile import ProfileUpdate, ProfileResponse
from app.schemas.resume import ResumeResponse, ResumeListResponse
from app.services.resume import ResumeService
from app.services.storage import get_storage_service

router = APIRouter(prefix="/me", tags=["profile"])


@router.get("", response_model=ProfileResponse)
async def get_profile(user: CandidateUser, db: DBSession):
    """Get current user's profile."""
    # Eagerly load candidate_profile (lazy loading fails in async context)
    await db.refresh(user, ["candidate_profile"])
    profile = user.candidate_profile
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return ProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        headline=profile.headline,
        summary=profile.summary,
        location=profile.location,
        linkedin_url=profile.linkedin_url,
        portfolio_url=profile.portfolio_url,
    )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    data: ProfileUpdate,
    db: DBSession,
    user: CandidateUser,
):
    """Update current user's profile."""
    # Update user fields
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone is not None:
        user.phone = data.phone

    # Eagerly load candidate_profile (lazy loading fails in async context)
    await db.refresh(user, ["candidate_profile"])
    profile = user.candidate_profile
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)

    # Update profile fields
    if data.headline is not None:
        profile.headline = data.headline
    if data.summary is not None:
        profile.summary = data.summary
    if data.location is not None:
        profile.location = data.location
    if data.linkedin_url is not None:
        profile.linkedin_url = data.linkedin_url
    if data.portfolio_url is not None:
        profile.portfolio_url = data.portfolio_url

    await db.commit()
    await db.refresh(user)
    await db.refresh(profile)

    return ProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        headline=profile.headline,
        summary=profile.summary,
        location=profile.location,
        linkedin_url=profile.linkedin_url,
        portfolio_url=profile.portfolio_url,
    )


@router.get("/resumes", response_model=ResumeListResponse)
async def list_resumes(db: DBSession, user: CandidateUser):
    """List current user's resumes."""
    service = ResumeService(db)
    storage = get_storage_service()
    resumes = await service.list_by_user(user.id)

    items = [
        ResumeResponse(
            id=r.id,
            original_filename=r.original_filename,
            file_size=r.file_size,
            content_type=r.content_type,
            is_default=r.is_default,
            uploaded_at=r.uploaded_at,
            download_url=storage.get_presigned_url(r.minio_path),
        )
        for r in resumes
    ]

    return ResumeListResponse(items=items, total=len(items))


@router.post("/resumes", response_model=ResumeResponse)
async def upload_resume(
    db: DBSession,
    user: CandidateUser,
    file: UploadFile = File(...),
):
    """Upload a new resume."""
    service = ResumeService(db)
    storage = get_storage_service()
    resume = await service.upload(file, user.id)

    return ResumeResponse(
        id=resume.id,
        original_filename=resume.original_filename,
        file_size=resume.file_size,
        content_type=resume.content_type,
        is_default=resume.is_default,
        uploaded_at=resume.uploaded_at,
        download_url=storage.get_presigned_url(resume.minio_path),
    )


@router.delete("/resumes/{id}", status_code=204)
async def delete_resume(id: int, db: DBSession, user: CandidateUser):
    """Delete a resume."""
    service = ResumeService(db)
    await service.delete(id, user.id)


@router.post("/resumes/{id}/default", response_model=ResumeResponse)
async def set_default_resume(id: int, db: DBSession, user: CandidateUser):
    """Set a resume as default."""
    service = ResumeService(db)
    storage = get_storage_service()
    resume = await service.set_default(id, user.id)

    return ResumeResponse(
        id=resume.id,
        original_filename=resume.original_filename,
        file_size=resume.file_size,
        content_type=resume.content_type,
        is_default=resume.is_default,
        uploaded_at=resume.uploaded_at,
        download_url=storage.get_presigned_url(resume.minio_path),
    )
