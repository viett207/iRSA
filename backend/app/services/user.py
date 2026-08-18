from math import ceil
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.models.user import User, CandidateProfile
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserList


class UserService:
    """Service for user management operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_users(
        self,
        page: int = 1,
        page_size: int = 20,
        role: str | None = None,
        is_active: bool | None = None,
        search: str | None = None,
    ) -> UserList:
        """Get paginated list of users."""
        query = select(User)

        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                User.email.ilike(search_term)
                | User.full_name.ilike(search_term)
                | User.phone.ilike(search_term)
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size).order_by(User.created_at.desc())

        result = await self.db.execute(query)
        users = result.scalars().all()

        return UserList(
            items=[UserResponse.model_validate(u) for u in users],
            total=total,
            page=page,
            page_size=page_size,
            pages=ceil(total / page_size) if total > 0 else 1,
        )

    async def get_user(self, user_id: int) -> User:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise NotFoundException(f"User with ID {user_id} not found")

        return user

    async def create_user(self, data: UserCreate) -> User:
        """Create a new user (admin only)."""
        # Check email uniqueness
        result = await self.db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise ConflictException("Email already registered")

        user = User(
            email=data.email,
            password_hash=get_password_hash(data.password),
            full_name=data.full_name,
            phone=data.phone,
            role=data.role,
            company_code=data.company_code,
        )
        self.db.add(user)

        # Create candidate profile if role is candidate
        if data.role == "candidate":
            await self.db.flush()
            profile = CandidateProfile(user_id=user.id)
            self.db.add(profile)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_user(
        self,
        user_id: int,
        data: UserUpdate,
        current_user: User,
    ) -> User:
        """Update user (admin can update anyone, users can update self)."""
        user = await self.get_user(user_id)

        # Permission check: admin can update anyone, others only self
        if current_user.role != "admin" and current_user.id != user_id:
            raise ForbiddenException("Permission denied")

        # Update fields
        update_data = data.model_dump(exclude_unset=True)

        # Non-admin users can't change role or is_active
        if current_user.role != "admin":
            update_data.pop("is_active", None)
            update_data.pop("role", None)

        # Hash password if provided
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))

        for field, value in update_data.items():
            setattr(user, field, value)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def delete_user(self, user_id: int) -> None:
        """Hard delete user and all related data."""
        user = await self.get_user(user_id)
        await self.db.delete(user)
        await self.db.commit()
