"""MinIO storage service for file uploads."""

import uuid
from io import BytesIO
from datetime import timedelta

from minio import Minio
from minio.error import S3Error
from urllib3.exceptions import MaxRetryError, NewConnectionError
from fastapi import UploadFile, HTTPException

from app.config import get_settings

settings = get_settings()


class StorageService:
    """Service for handling file storage with MinIO."""

    ALLOWED_RESUME_TYPES = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    ALLOWED_EXTENSIONS = {".pdf", ".docx"}
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self.bucket = settings.MINIO_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        """Create bucket if it doesn't exist."""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except S3Error as e:
            raise HTTPException(
                status_code=500, detail=f"Storage initialization failed: {str(e)}"
            )
        except (MaxRetryError, NewConnectionError, OSError) as e:
            raise HTTPException(
                status_code=503, detail=f"MinIO unreachable at {settings.MINIO_ENDPOINT}: {str(e)}"
            )

    async def upload_resume(
        self, file: UploadFile, user_id: int
    ) -> tuple[str, int, str, bytes]:
        """
        Upload a resume file to MinIO.

        Returns: (minio_path, file_size, content_type, file_bytes)
        """
        # Validate content type
        content_type = file.content_type or "application/octet-stream"
        if content_type not in self.ALLOWED_RESUME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed: PDF, DOCX",
            )

        # Read file contents
        contents = await file.read()
        file_size = len(contents)

        # Validate file size
        if file_size > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum of {self.MAX_FILE_SIZE // (1024*1024)}MB",
            )

        # Generate unique path with extension validation
        ext = self._get_extension(file.filename or "resume.pdf")
        if ext.lower() not in self.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Invalid file extension. Allowed: .pdf, .docx",
            )
        filename = f"{uuid.uuid4()}{ext}"
        path = f"{user_id}/{filename}"

        try:
            self.client.put_object(
                self.bucket,
                path,
                BytesIO(contents),
                file_size,
                content_type=content_type,
            )
        except S3Error as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to upload file: {str(e)}"
            )

        return path, file_size, content_type, contents

    def get_presigned_url(self, path: str, expires_hours: int = 1) -> str:
        """Get a presigned URL for browser access. Replaces internal host with public URL."""
        from app.config import get_settings
        settings = get_settings()
        try:
            url = self.client.presigned_get_object(
                self.bucket, path, expires=timedelta(hours=expires_hours)
            )
            # Replace the internal storage host with its browser-facing URL.
            internal = f"http://{settings.MINIO_ENDPOINT}"
            public = settings.MINIO_PUBLIC_URL
            if internal != public:
                url = url.replace(internal, public, 1)
            return url
        except S3Error as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to generate download URL: {str(e)}"
            )

    def download(self, path: str) -> bytes:
        """Download a file from storage."""
        try:
            response = self.client.get_object(self.bucket, path)
            return response.read()
        except S3Error as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to download file: {str(e)}"
            )
        finally:
            if 'response' in locals():
                response.close()
                response.release_conn()

    def delete(self, path: str) -> None:
        """Delete a file from storage."""
        try:
            self.client.remove_object(self.bucket, path)
        except S3Error as e:
            # Log but don't fail - file might already be deleted
            pass

    def _get_extension(self, filename: str) -> str:
        """Extract file extension from filename."""
        if "." in filename:
            return "." + filename.rsplit(".", 1)[1].lower()
        return ".pdf"


# Singleton instance
_storage_service: StorageService | None = None


def get_storage_service() -> StorageService:
    """Get or create the storage service singleton."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
