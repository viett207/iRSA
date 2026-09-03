from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.public.router import public_router
from app.api.v1.router import api_router
from app.config import get_settings
from app.core.rate_limit import limiter
from app.core.startup import ensure_secure_startup
from src.api.routes import router as agent_router
from src.cache import close_cache, init_cache

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Validate environment on startup
    ensure_secure_startup()
    cache_type = getattr(settings, "CACHE_BACKEND", "memory")
    redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
    await init_cache(backend_type=cache_type, redis_url=redis_url)
    yield
    # Shutdown
    await close_cache()


app = FastAPI(
    title="iRSA API",
    description="Intelligent Resume Screening Automation API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Build CORS origins list, filtering empty strings
cors_origins = [
    origin
    for origin in [
        "http://localhost:4200",  # Angular Admin
        "http://localhost:4300",  # Angular Portal
        "http://127.0.0.1:4200",  # Angular Admin via loopback IP
        "http://127.0.0.1:4300",  # Angular Portal via loopback IP
        "https://irsa-admin.vercel.app",
        settings.FRONTEND_ADMIN_URL,
        settings.FRONTEND_PORTAL_URL,
    ]
    if origin  # Filter out empty strings
]

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(api_router, prefix="/api/v1")
app.include_router(public_router, prefix="/pub")
app.include_router(agent_router, prefix="/api/v1/agent", tags=["AI Agent"])


@app.get("/")
async def root():
    """Redirect root to API documentation."""
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}
