from fastapi import APIRouter

from app.api.public import auth, jobs, applications, profile, messages

public_router = APIRouter()

public_router.include_router(auth.router, prefix="/auth", tags=["public-auth"])
public_router.include_router(jobs.router)
public_router.include_router(applications.router)
public_router.include_router(profile.router)
public_router.include_router(messages.router)
