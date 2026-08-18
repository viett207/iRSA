from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base application exception."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: dict[str, str] | None = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class UnauthorizedException(AppException):
    """401 Unauthorized."""

    def __init__(self, detail: str = "Invalid credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthenticationException(AppException):
    """Authentication failure with a stable, user-safe error code."""

    def __init__(self, code: str, message: str, status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__(
            status_code=status_code,
            detail={"code": code, "message": message},
            headers={"WWW-Authenticate": "Bearer"} if status_code == status.HTTP_401_UNAUTHORIZED else None,
        )


class ForbiddenException(AppException):
    """403 Forbidden."""

    def __init__(self, detail: str = "Permission denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class NotFoundException(AppException):
    """404 Not Found."""

    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class BadRequestException(AppException):
    """400 Bad Request."""

    def __init__(self, detail: str = "Bad request"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class ConflictException(AppException):
    """409 Conflict."""

    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
