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

# Async engine for FastAPI
engine = create_async_engine(
    async_database_url,
    echo=settings.DEBUG,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Sync engine for Celery tasks
sync_engine = create_engine(sync_database_url, echo=settings.DEBUG)
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
