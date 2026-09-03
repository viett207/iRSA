from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.config import get_settings

settings = get_settings()

# Format async and sync URLs properly
raw_db_url = settings.DATABASE_URL
if raw_db_url.startswith("postgresql://"):
    async_database_url = raw_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    async_database_url = raw_db_url

sync_database_url = raw_db_url.replace("postgresql+asyncpg://", "postgresql://")

# Async engine for FastAPI (statement_cache_size=0 is required for Supabase / PgBouncer pooler)
engine = create_async_engine(
    async_database_url,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    # The Supabase session pool used by this project allows 15 clients.
    # Keep the application pool deliberately below that limit so reloads,
    # migrations and background work still have connection headroom.
    pool_size=4,
    max_overflow=2,
    pool_timeout=15,
    connect_args={"statement_cache_size": 0} if "asyncpg" in async_database_url else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Sync engine for background tasks and worker utilities
sync_engine = create_engine(
    sync_database_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=2,
    max_overflow=1,
    pool_timeout=15,
)
SyncSessionLocal = sessionmaker(bind=sync_engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@contextmanager
def get_sync_session() -> Session:
    """Get synchronous session for Celery tasks."""
    session = SyncSessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
