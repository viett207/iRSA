"""Resume service for managing candidate CVs."""
# Module này quản lý toàn bộ lifecycle của CV: upload, list, delete, set default

import asyncio
import os
import re
import unicodedata

from fastapi import UploadFile, HTTPException  # FastAPI types và exception handling
from sqlalchemy import select, func  # SQLAlchemy query builders
from sqlalchemy.ext.asyncio import AsyncSession  # Async database session
from sqlalchemy.orm import defer  # Lazy loading optimization

from app.models import Resume  # Resume database model
from app.services.storage import get_storage_service  # MinIO storage service
from app.services.text_extractor import extract_text  # PDF/DOCX text extraction


def _normalize_filename(filename: str) -> str:
    """Convert Vietnamese filename to ASCII-safe slug, keeping extension.

    Example: 'Tạ Thị Thu Huyền_CV.pdf' → 'ta-thi-thu-huyen-cv.pdf'
    """
    name, ext = os.path.splitext(filename)
    # NFD decomposition: tách dấu ra khỏi ký tự gốc
    nfkd = unicodedata.normalize("NFKD", name)
    # Xử lý đ/Đ trước khi bỏ combining marks
    nfkd = nfkd.replace("\u0111", "d").replace("\u0110", "D")
    # Bỏ combining diacritical marks (dấu)
    ascii_name = "".join(c for c in nfkd if not unicodedata.combining(c))
    # Lowercase, thay ký tự đặc biệt thành dấu gạch ngang
    ascii_name = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_name.lower()).strip("-")
    return f"{ascii_name}{ext.lower()}" if ascii_name else f"resume{ext.lower()}"


class ResumeService:
    """Service for managing resumes/CVs."""
    # Service layer pattern: Tách logic nghiệp vụ ra khỏi API controllers

    # Constant: Giới hạn số CV tối đa mỗi user có thể upload
    # Business rule để tránh spam và quản lý storage
    MAX_RESUMES_PER_USER = 5

    def __init__(self, db: AsyncSession):
        """
        Constructor: Khởi tạo service với database session.
        
        Args:
            db: Async database session (Dependency Injection)
        """
        self.db = db  # Lưu database session để dùng trong các method
        self.storage = get_storage_service()  # Singleton storage service (MinIO)

    async def upload(
        self,
        file: UploadFile,  # File từ multipart/form-data request
        user_id: int,      # ID của user đang upload
        job_id: int | None = None,  # Optional: CV này dành cho job nào
        set_as_default: bool = False,  # Có set làm CV mặc định không
    ) -> Resume:
        """
        Upload một CV mới lên hệ thống.
        
        Flow:
        1. Check giới hạn số CV (max 5 CV/user)
        2. Upload file lên MinIO storage
        3. Extract text từ file (dùng cho AI scoring)
        4. Tạo Resume record trong database
        5. Set default flag nếu cần
        6. Commit và return Resume object
        
        Args:
            file: File PDF/DOCX được upload
            user_id: ID của candidate
            job_id: Optional job ID nếu CV này cho job cụ thể
            set_as_default: Force set làm default (nếu False thì CV đầu tiên tự động default)
            
        Returns:
            Resume: Resume object đã được lưu vào DB
            
        Raises:
            HTTPException(400): Nếu đã đạt giới hạn 5 CV
        """
        
        # ========== BƯỚC 1: Validate giới hạn số CV ==========
        # Đếm số CV hiện tại của user
        count = await self._get_resume_count(user_id)
        
        # Nếu đã có 5 CV => reject upload
        if count >= self.MAX_RESUMES_PER_USER:
            raise HTTPException(
                status_code=400,  # Bad Request
                detail=f"Bạn đã đạt giới hạn {self.MAX_RESUMES_PER_USER} CV. Vui lòng xóa một CV cũ trước khi tải lên CV mới.",
            )

        # ========== BƯỚC 2: Upload file lên MinIO ==========
        # storage.upload_resume() trả về tuple 4 giá trị:
        # - minio_path: Đường dẫn file trong MinIO (ví dụ: "resumes/user_123/cv_456.pdf")
        # - file_size: Kích thước file (bytes)
        # - content_type: MIME type (application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
        # - file_bytes: Nội dung file dạng bytes (để extract text)
        minio_path, file_size, content_type, file_bytes = (
            await self.storage.upload_resume(file, user_id)
        )

        # ========== BƯỚC 3: Extract plain text từ file ==========
        # extract_text() parse PDF/DOCX → plain text
        # Non-blocking: Nếu fail (corrupt file, unsupported format) → return None
        # Text này sẽ dùng để:
        # - AI scoring (match skills, experience, education)
        # - Search/filter candidates
        raw_text = await asyncio.to_thread(extract_text, file_bytes, content_type)

        # ========== BƯỚC 4: Tạo Resume record ==========
        resume = Resume(
            candidate_id=user_id,  # Foreign key tới User
            job_id=job_id,         # Optional: CV này dành cho job nào
            original_filename=_normalize_filename(file.filename or "resume.pdf"),
            minio_path=minio_path,  # Path trong MinIO để download sau
            file_size=file_size,    # Bytes
            content_type=content_type,  # MIME type
            raw_text=raw_text,      # Plain text đã extract (có thể None)
            # is_default logic:
            # - Nếu set_as_default=True => set làm default
            # - Nếu count==0 (CV đầu tiên) => tự động set làm default
            # - Ngược lại => False
            is_default=set_as_default or count == 0,
        )

        # ========== BƯỚC 5: Xử lý default flag ==========
        # Nếu CV này là default => unset tất cả CV khác
        # Business rule: Chỉ có 1 CV default mỗi user
        if resume.is_default:
            await self._unset_defaults(user_id)

        # ========== BƯỚC 6: Lưu vào database ==========
        self.db.add(resume)  # Add vào session (chưa commit)
        await self.db.commit()  # Commit transaction (lưu vào DB)
        await self.db.refresh(resume)  # Refresh để có ID và timestamps mới

        return resume

    async def list_by_user(self, user_id: int) -> list[Resume]:
        """
        Lấy danh sách tất cả CV của một user.

        Performance optimization:
        - Defer raw_text field để tránh load text lớn vào memory
        - Chỉ load metadata (id, filename, size, uploaded_at, is_default)
        
        Sort order:
        - Default CV lên đầu (is_default DESC)
        - Trong cùng nhóm default/non-default: mới nhất trước (uploaded_at DESC)
        
        Args:
            user_id: ID của user
            
        Returns:
            List[Resume]: Danh sách Resume objects (không có raw_text)
        """
        # Build query với defer optimization
        result = await self.db.execute(
            select(Resume)
            # defer(Resume.raw_text): Lazy loading - không load field này
            # Lý do: raw_text có thể rất lớn (vài KB đến vài MB)
            # Khi list CV chỉ cần metadata => defer để giảm memory + network
            .options(defer(Resume.raw_text))
            # Filter: Chỉ lấy CV của user này
            .where(Resume.candidate_id == user_id)
            # Sort: Default trước, mới nhất sau
            # .desc() = descending order (giảm dần)
            .order_by(Resume.is_default.desc(), Resume.uploaded_at.desc())
        )
        # scalars(): Lấy Resume objects (không phải Row tuples)
        # .all(): Fetch tất cả results
        # list(): Convert sang Python list
        return list(result.scalars().all())

    async def get(self, resume_id: int, user_id: int) -> Resume:
        """
        Lấy một CV theo ID, verify ownership.
        
        Security: Đảm bảo user chỉ có thể truy cập CV của chính họ
        Không cho phép user A xem CV của user B
        
        Args:
            resume_id: ID của CV cần lấy
            user_id: ID của user (để verify ownership)
            
        Returns:
            Resume: Resume object (không có raw_text)
            
        Raises:
            HTTPException(404): Nếu không tìm thấy hoặc không có quyền truy cập
        """
        result = await self.db.execute(
            select(Resume)
            .options(defer(Resume.raw_text))  # Defer text như ở list_by_user
            # WHERE id = resume_id AND candidate_id = user_id
            # Điều kiện AND đảm bảo ownership verification
            .where(Resume.id == resume_id, Resume.candidate_id == user_id)
        )
        # scalar_one_or_none(): 
        # - Nếu có đúng 1 record => return Resume
        # - Nếu không có => return None
        # - Nếu có >1 record => raise MultipleResultsFound (không xảy ra vì id là unique)
        resume = result.scalar_one_or_none()
        
        # Nếu không tìm thấy => 404 Not Found
        if not resume:
            raise HTTPException(
                status_code=404,
                detail="CV đã chọn không tồn tại hoặc không thuộc tài khoản của bạn.",
            )
        
        return resume

    async def get_with_url(self, resume_id: int, user_id: int) -> tuple[Resume, str]:
        """
        Lấy CV kèm presigned download URL.
        
        Use case: Frontend cần hiển thị nút "Download CV"
        - Lấy metadata của CV (filename, size, etc.)
        - Tạo temporary download URL (presigned URL)
        
        Presigned URL:
        - URL tạm thời có thời hạn (ví dụ: 1 giờ)
        - Không cần authentication khi download
        - Tự động expire sau thời gian quy định
        
        Args:
            resume_id: ID của CV
            user_id: ID của user (verify ownership)
            
        Returns:
            tuple[Resume, str]: (Resume object, download URL)
        """
        # Lấy Resume object (verify ownership)
        resume = await self.get(resume_id, user_id)
        
        # Tạo presigned URL từ MinIO
        # URL này có dạng: https://minio.example.com/bucket/path?signature=...
        # Signature có thời hạn (ví dụ: 3600 seconds = 1 hour)
        url = self.storage.get_presigned_url(resume.minio_path)
        
        return resume, url

    async def delete(self, resume_id: int, user_id: int) -> None:
        """
        Xóa một CV.
        
        Business rules:
        1. Verify ownership (user chỉ xóa được CV của mình)
        2. Không cho xóa CV đang được dùng trong application nào
        3. Xóa cả file trong MinIO và record trong DB
        
        Args:
            resume_id: ID của CV cần xóa
            user_id: ID của user (verify ownership)
            
        Raises:
            HTTPException(404): CV không tồn tại
            HTTPException(400): CV đang được dùng trong applications
        """
        # Lấy Resume object (verify ownership, raise 404 nếu không tìm thấy)
        resume = await self.get(resume_id, user_id)

        # ========== Check business rule: Không xóa CV đang dùng ==========
        # Import ở đây để tránh circular import
        # (Resume → Application → Resume)
        from app.models import Application

        # Đếm số applications đang dùng CV này
        result = await self.db.execute(
            select(func.count())  # COUNT(*)
            .where(Application.resume_id == resume_id)
        )
        # Nếu có application nào đang dùng => không cho xóa
        if result.scalar() > 0:
            raise HTTPException(
                status_code=400,  # Bad Request
                detail="Cannot delete resume used in applications",
            )

        # ========== Xóa file từ MinIO ==========
        # Delete file vật lý trong object storage
        self.storage.delete(resume.minio_path)

        # ========== Xóa record từ database ==========
        await self.db.delete(resume)  # Mark for deletion
        await self.db.commit()  # Execute DELETE query

    async def set_default(self, resume_id: int, user_id: int) -> Resume:
        """
        Set một CV làm default.
        
        Default CV được dùng khi:
        - User apply job mà không chọn CV cụ thể
        - System cần lấy CV đại diện của candidate
        
        Logic:
        1. Verify CV tồn tại và thuộc về user
        2. Unset tất cả CV khác của user
        3. Set CV này làm default
        
        Args:
            resume_id: ID của CV cần set default
            user_id: ID của user (verify ownership)
            
        Returns:
            Resume: Resume object đã được set default
        """
        # Lấy Resume object (verify ownership)
        resume = await self.get(resume_id, user_id)

        # Unset tất cả CV khác của user
        # Đảm bảo chỉ có 1 CV default mỗi user
        await self._unset_defaults(user_id)

        # Set CV này làm default
        resume.is_default = True
        await self.db.commit()  # Lưu thay đổi
        await self.db.refresh(resume)  # Refresh timestamps

        return resume

    async def get_default(self, user_id: int) -> Resume | None:
        """
        Lấy CV default của user.
        
        Use case:
        - User click "Apply" mà không chọn CV cụ thể
        - System tự động dùng default CV
        
        Args:
            user_id: ID của user
            
        Returns:
            Resume | None: Default resume hoặc None nếu không có
        """
        result = await self.db.execute(
            select(Resume)
            .options(defer(Resume.raw_text))  # Defer text
            # WHERE candidate_id = user_id AND is_default = True
            .where(Resume.candidate_id == user_id, Resume.is_default == True)
        )
        # Return Resume hoặc None (nếu user chưa có CV nào)
        return result.scalar_one_or_none()

    # ========== Private helper methods (bắt đầu với _) ==========

    async def _get_resume_count(self, user_id: int) -> int:
        """
        Đếm số CV của user.
        
        Helper method dùng để check giới hạn MAX_RESUMES_PER_USER.
        
        Args:
            user_id: ID của user
            
        Returns:
            int: Số lượng CV (0 nếu chưa có CV nào)
        """
        result = await self.db.execute(
            select(func.count())  # SELECT COUNT(*)
            .where(Resume.candidate_id == user_id)  # WHERE candidate_id = user_id
        )
        # scalar(): Lấy giá trị đơn (count number)
        # or 0: Fallback nếu scalar() return None (edge case)
        return result.scalar() or 0

    async def _unset_defaults(self, user_id: int) -> None:
        """
        Unset tất cả default flags của user's resumes.
        
        Helper method để đảm bảo chỉ có 1 CV default mỗi user.
        Được gọi trước khi set một CV khác làm default.
        
        Args:
            user_id: ID của user
        """
        # Tìm tất cả CV default của user
        result = await self.db.execute(
            select(Resume).where(
                Resume.candidate_id == user_id,
                Resume.is_default == True  # Chỉ lấy CV default
            )
        )
        
        # Loop qua tất cả CV default và set is_default = False
        # Trong thực tế chỉ có tối đa 1 CV default, nhưng loop để an toàn
        for resume in result.scalars():
            resume.is_default = False
        
        # Note: Không commit ở đây, để caller tự commit
        # Vì method này thường được gọi trước khi set default mới
        # => Gom chung 1 transaction
