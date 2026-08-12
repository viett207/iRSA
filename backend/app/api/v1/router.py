from fastapi import APIRouter

from app.api.v1 import auth, users, jobs, dashboard, applications, scoring, reports, companies, interviews, notifications

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(applications.router, tags=["applications"])
api_router.include_router(scoring.router, tags=["scoring"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(interviews.router, tags=["interviews"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
