from math import ceil
from fastapi import APIRouter, Query
from sqlalchemy import select, func

from app.api.deps import DBSession, AdminUser, CurrentUser
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate, UserUpdate, UserList
from app.services.user import UserService

router = APIRouter()


@router.get("/pending-approvals", response_model=UserList)
async def list_pending_approvals(
    db: DBSession,
    _: AdminUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List HR users pending admin approval (email verified, status=pending)."""
    query = select(User).where(
        User.approval_status == "pending",
        User.email_verified.is_(True),
    )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(User.created_at.asc())

    result = await db.execute(query)
    users = result.scalars().all()

    return UserList(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 1,
    )


@router.post("/{user_id}/approve", response_model=UserResponse)
async def approve_user(user_id: int, db: DBSession, _: AdminUser):
    """Approve a pending HR user — sets is_active=True, approval_status=approved."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")

    user.approval_status = "approved"
    user.is_active = True
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/{user_id}/reject", response_model=UserResponse)
async def reject_user(user_id: int, db: DBSession, _: AdminUser):
    """Reject a pending HR user — sets approval_status=rejected, is_active stays False."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")

    user.approval_status = "rejected"
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("", response_model=UserList)
async def list_users(
    db: DBSession,
    _: AdminUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: str | None = Query(None, pattern="^(candidate|recruiter|leader|admin)$"),
    is_active: bool | None = Query(None),
    search: str | None = Query(None),
):
    """List all users (admin only)."""
    service = UserService(db)
    return await service.get_users(
        page=page, page_size=page_size, role=role, is_active=is_active, search=search
    )


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(data: UserCreate, db: DBSession, _: AdminUser):
    """Create a new user (admin only)."""
    service = UserService(db)
    return await service.create_user(data)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: DBSession, _: AdminUser):
    """Get user by ID (admin only)."""
    service = UserService(db)
    return await service.get_user(user_id)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """Update user (admin can update anyone, users can update self)."""
    service = UserService(db)
    return await service.update_user(user_id, data, current_user)


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, db: DBSession, _: AdminUser):
    """Delete user permanently (admin only)."""
    service = UserService(db)
    await service.delete_user(user_id)
