"""Storage service for file uploads supporting S3 (Supabase / Cloudflare R2 / AWS) and MinIO."""

import asyncio
import uuid
from io import BytesIO
from fastapi import UploadFile, HTTPException
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config

from app.config import get_settings

settings = get_settings()


class StorageService:
    """Service for handling file storage with S3 API (Supabase / AWS / MinIO)."""

    ALLOWED_RESUME_TYPES = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/octet-stream",
    ]
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    def __init__(self):
        endpoint = settings.MINIO_ENDPOINT.strip()
        if not endpoint.startswith("http://") and not endpoint.startswith("https://"):
            protocol = "https://" if settings.MINIO_SECURE else "http://"
            endpoint_url = f"{protocol}{endpoint}"
        else:
            endpoint_url = endpoint

        self.bucket = settings.MINIO_BUCKET.strip()
        self.endpoint_url = endpoint_url
        self.public_url_base = settings.MINIO_PUBLIC_URL.strip().rstrip("/")

        # Initialize standard S3 client
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name="ap-south-1",
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        """Verify bucket access or create bucket if needed."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket)
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code in ("404", "NoSuchBucket"):
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket)
                except Exception as ce:
                    raise HTTPException(
                        status_code=500, detail=f"Failed to create bucket {self.bucket}: {str(ce)}"
                    )
            else:
                # Permission check might return 403 on some restricted tokens, but bucket exists
                pass

    async def upload_resume(
        self, file: UploadFile, user_id: int
    ) -> tuple[str, int, str, bytes]:
        """
        Upload a resume file to Storage (non-blocking).

        Returns: (minio_path, file_size, content_type, file_bytes)
        """
        content_type = file.content_type or "application/pdf"
        contents = await file.read()
        file_size = len(contents)

        if file_size > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum of {self.MAX_FILE_SIZE // (1024*1024)}MB",
            )

        ext = self._get_extension(file.filename or "resume.pdf")
        if ext.lower() not in self.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Invalid file extension. Allowed: .pdf, .docx",
            )
        filename = f"{uuid.uuid4()}{ext}"
        path = f"{user_id}/{filename}"

        try:
            await asyncio.to_thread(
                self.s3_client.put_object,
                Bucket=self.bucket,
                Key=path,
                Body=contents,
                ContentType=content_type,
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to upload file to storage: {str(e)}"
            )

        return path, file_size, content_type, contents

    def get_presigned_url(self, path: str, expires_hours: int = 1) -> str:
        """Get public or presigned download URL for file."""
        if self.public_url_base and "supabase.co" in self.public_url_base:
            return f"{self.public_url_base}/{path}"

        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": path},
                ExpiresIn=expires_hours * 3600,
            )
            return url
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to generate download URL: {str(e)}"
            )

    def download(self, path: str) -> bytes:
        """Download a file from storage as bytes."""
        try:
            response = self.s3_client.get_object(Bucket=self.bucket, Key=path)
            return response["Body"].read()
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to download file from storage: {str(e)}"
            )

    def delete(self, path: str) -> None:
        """Delete a file from storage."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=path)
        except Exception:
            pass

    def _get_extension(self, filename: str) -> str:
        """Extract file extension from filename."""
        if "." in filename:
            return "." + filename.rsplit(".", 1)[1].lower()
        return ".pdf"


_storage_service: StorageService | None = None


def get_storage_service() -> StorageService:
    """Get or create the storage service singleton."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
