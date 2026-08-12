from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Cookie, Request, Response
from sqlalchemy import select

from app.api.deps import DBSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    UnauthorizedException,
)
from app.core.rate_limit import limiter, RATE_LIMITS
from app.core.cookies import set_auth_cookies, clear_auth_cookies, REFRESH_TOKEN_COOKIE
from app.models.user import User, CandidateProfile
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RegisterRequest,
    HRRegisterRequest,
    RefreshRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from app.services.email import (
    send_verification_email,
    send_password_reset_email,
    generate_verification_token,
)

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
@limiter.limit(RATE_LIMITS["auth_register"])
async def register(
    request: Request,
    response: Response,
    data: RegisterRequest,
    db: DBSession,
):
    """Register a new candidate account."""
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise ConflictException("Email already registered")

    user = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role="candidate",
        email_verified=False,
    )
    db.add(user)
    await db.flush()

    profile = CandidateProfile(user_id=user.id)
    db.add(profile)

    token = generate_verification_token()
    user.email_verification_token = token
    user.email_verification_sent_at = datetime.now(timezone.utc)
    await db.commit()

    email_sent = await send_verification_email(data.email, data.full_name, token)
    if not email_sent:
        logger.error(f"Failed to send verification email to {data.email} during registration")

    token_data = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/register-hr", response_model=MessageResponse)
@limiter.limit(RATE_LIMITS["auth_register"])
async def register_hr(request: Request, data: HRRegisterRequest, db: DBSession):
    """Register a new HR account. Requires email verification + admin approval."""
    from app.models.company import Company

    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise ConflictException("Email already registered")

    # Validate company_code exists
    company_result = await db.execute(
        select(Company).where(Company.company_code == data.company_code)
    )
    if not company_result.scalar_one_or_none():
        raise BadRequestException("Mã công ty không hợp lệ hoặc không tồn tại")

    user = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role="recruiter",
        company_code=data.company_code,
        is_active=False,
        email_verified=False,
        approval_status="pending",
    )
    db.add(user)
    await db.flush()

    token = generate_verification_token()
    user.email_verification_token = token
    user.email_verification_sent_at = datetime.now(timezone.utc)
    await db.commit()

    email_sent = await send_verification_email(data.email, data.full_name, token)
    if not email_sent:
        logger.error(f"Failed to send verification email to {data.email} during HR registration")

    return MessageResponse(
        message="Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit(RATE_LIMITS["auth_login"])
async def login(request: Request, response: Response, data: LoginRequest, db: DBSession):
    """Login for all user roles."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise UnauthorizedException("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedException("Account is deactivated")

    if user.approval_status == "pending":
        raise UnauthorizedException("Tài khoản đang chờ phê duyệt từ quản trị viên")

    if user.approval_status == "rejected":
        raise UnauthorizedException("Tài khoản đã bị từ chối phê duyệt")

    token_data = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit(RATE_LIMITS["auth_refresh"])
async def refresh(
    request: Request,
    response: Response,
    data: RefreshRequest,
    db: DBSession,
    refresh_token_cookie: Optional[str] = Cookie(None, alias=REFRESH_TOKEN_COOKIE),
):
    """Refresh access token using refresh token (body or cookie)."""
    token = data.refresh_token or refresh_token_cookie
    if not token:
        raise UnauthorizedException("Refresh token required")

    payload = decode_token(token)

    if payload is None:
        raise UnauthorizedException("Invalid or expired refresh token")

    if payload.get("type") != "refresh":
        raise UnauthorizedException("Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise UnauthorizedException("User not found or inactive")

    token_data = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/verify-email", response_model=MessageResponse)
@limiter.limit(RATE_LIMITS.get("auth_register", "5/minute"))
async def verify_email(
    request: Request,
    data: VerifyEmailRequest,
    db: DBSession,
):
    """Verify email using token sent to user's email."""
    result = await db.execute(
        select(User).where(User.email_verification_token == data.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise BadRequestException("Token xác thực không hợp lệ hoặc đã hết hạn")

    if user.email_verification_sent_at:
        expiry = user.email_verification_sent_at + timedelta(hours=24)
        if datetime.now(timezone.utc) > expiry:
            raise BadRequestException(
                "Token xác thực đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực"
            )

    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_sent_at = None
    await db.commit()

    return MessageResponse(message="Email đã được xác thực thành công")


@router.post("/resend-verification", response_model=MessageResponse)
@limiter.limit(RATE_LIMITS.get("auth_register", "3/minute"))
async def resend_verification(
    request: Request,
    data: ResendVerificationRequest,
    db: DBSession,
):
    """Resend verification email."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        return MessageResponse(message="Nếu email tồn tại, chúng tôi đã gửi lại email xác thực")

    if user.email_verified:
        return MessageResponse(message="Email đã được xác thực")

    if user.email_verification_sent_at:
        elapsed = datetime.now(timezone.utc) - user.email_verification_sent_at
        if elapsed.total_seconds() < 60:
            raise BadRequestException(
                "Vui lòng đợi ít nhất 60 giây trước khi gửi lại"
            )

    token = generate_verification_token()
    user.email_verification_token = token
    user.email_verification_sent_at = datetime.now(timezone.utc)
    await db.commit()

    await send_verification_email(user.email, user.full_name, token)

    return MessageResponse(message="Nếu email tồn tại, chúng tôi đã gửi lại email xác thực")


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit(RATE_LIMITS.get("auth_register", "3/minute"))
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: DBSession,
):
    """Send password reset email. Always returns success to prevent email enumeration."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        # Rate limit: 60s between reset requests
        if user.password_reset_sent_at:
            elapsed = datetime.now(timezone.utc) - user.password_reset_sent_at
            if elapsed.total_seconds() < 60:
                raise BadRequestException(
                    "Vui lòng đợi ít nhất 60 giây trước khi gửi lại"
                )

        token = generate_verification_token()
        user.password_reset_token = token
        user.password_reset_sent_at = datetime.now(timezone.utc)
        await db.commit()

        email_sent = await send_password_reset_email(user.email, user.full_name, token)
        if not email_sent:
            logger.error(f"Failed to send password reset email to {user.email}")

    # Always return same message to prevent email enumeration
    return MessageResponse(
        message="Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu"
    )


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit(RATE_LIMITS.get("auth_register", "5/minute"))
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: DBSession,
):
    """Reset password using token from email."""
    result = await db.execute(
        select(User).where(User.password_reset_token == data.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise BadRequestException("Token không hợp lệ hoặc đã hết hạn")

    # Token expires after 1 hour
    if user.password_reset_sent_at:
        expiry = user.password_reset_sent_at + timedelta(hours=1)
        if datetime.now(timezone.utc) > expiry:
            raise BadRequestException(
                "Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới"
            )

    user.password_hash = get_password_hash(data.new_password)
    user.password_reset_token = None
    user.password_reset_sent_at = None
    await db.commit()

    return MessageResponse(message="Mật khẩu đã được đặt lại thành công")


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    """Clear auth cookies on logout."""
    clear_auth_cookies(response)
    return MessageResponse(message="Logged out successfully")
