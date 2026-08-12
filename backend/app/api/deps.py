from typing import Annotated, Optional
from fastapi import Cookie, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.cookies import ACCESS_TOKEN_COOKIE
from app.models.user import User

# auto_error=False allows cookie auth fallback
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
    access_token: Annotated[Optional[str], Cookie(alias=ACCESS_TOKEN_COOKIE)] = None,
) -> User:
    """Get current authenticated user from JWT (header or cookie)."""
    # Priority: Header > Cookie
    token = None
    if credentials:
        token = credentials.credentials
    elif access_token:
        token = access_token

    if not token:
        raise UnauthorizedException("Authentication required")

    payload = decode_token(token)

    if payload is None:
        raise UnauthorizedException("Invalid or expired token")

    if payload.get("type") != "access":
        raise UnauthorizedException("Invalid token type")

    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException("Invalid token payload")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedException("User not found")

    if not user.is_active:
        raise UnauthorizedException("User is inactive")

    return user


def require_roles(*allowed_roles: str):
    """Dependency factory for role-based access control."""

    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)]
    ) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(
                f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user

    return role_checker


# Convenience dependencies for common role checks
require_admin = require_roles("admin")
require_admin_or_leader = require_roles("admin", "leader")
require_hr_staff = require_roles("admin", "leader", "recruiter")
require_candidate = require_roles("candidate")

# Type aliases
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
HRUser = Annotated[User, Depends(require_hr_staff)]
CandidateUser = Annotated[User, Depends(require_candidate)]
DBSession = Annotated[AsyncSession, Depends(get_db)]
