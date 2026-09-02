# iRSA Design System Spec (DESIGN-V5.md)
*Chủ đề: "Warm Slate Minimalist" — Giao diện iRSA Admin Dashboard (Tiếng Việt)*

Tài liệu quy chuẩn giao diện Dashboard tối giản, cao cấp theo phong cách Linear/Cal.com, hiển thị dữ liệu thời gian thực từ API Backend đã deploy.

---

## 1. Bảng màu & Canvas Tokens
* **Nền tổng thể (Base Canvas)**: `#F5F5F3` / `#FAFAF9` — Gam màu off-white/warm slate dịu mắt, sạch sẽ.
* **Nền Thẻ & Sidebar**: `#FFFFFF` — Trắng tinh khiết với viền siêu mỏng 1px (`#ECECEE`).
* **Font chữ (Typography)**:
    * Font chính UI: `'Inter'`, `-apple-system`, `BlinkMacSystemFont`, `'SF Pro Display'`, `sans-serif`.
    * Font số liệu/Metadata: `'Inter'`, `'Geist Mono'`, font-weight: 700.
* **Màu chữ**:
    * Tiêu đề & Chỉ số chính: `#18181B` (Zinc-900).
    * Nhãn phụ & Mô tả: `#71717A` (Zinc-500).
    * Thời gian & Gợi ý: `#A1A1AA` (Zinc-400).
* **Nút Menu Đang chọn (Active Nav Pill)**: Nền `#ECECE8`, bo góc mềm `rounded-xl`, chữ `#18181B`.
* **Trạng thái (Badges dạng viên thuốc kèm chấm tròn)**:
    * **Đang tuyển (Active)**: Nền `#DCFCE7` (Emerald-100), Chữ `#166534` (Emerald-800), Chấm `#22C55E`.
    * **Chờ duyệt (Pending)**: Nền `#FEF3C7` (Amber-100), Chữ `#92400E` (Amber-800), Chấm `#F59E0B`.
    * **Đã đóng (Closed)**: Nền `#F4F4F5` (Zinc-100), Chữ `#52525B` (Zinc-600), Chấm `#71717A`.

---

## 2. Cấu trúc Layout & Tích hợp Dữ liệu Realtime từ Backend

### A. Thanh điều hướng bên trái (Sidebar - `w-64`)
* **Logo**: `iRSA Quản trị` / `iRSA Admin`.
* **Danh mục Menu**:
    * `Tổng quan` (Dashboard - Mặc định Active)
    * `Việc làm` (Jobs)
    * `Ứng viên` (Candidates)
    * `Khách hàng` (Clients)
    * `Báo cáo` (Reports)
    * `Người dùng` (Users)
    * `Cài đặt` (Settings)
* **Cuối trang**: `Trung tâm trợ giúp` (Help Center) & `Đăng xuất` (Log Out).

### B. Thanh Header trên cùng
* **Ô tìm kiếm bo tròn viên thuốc**: Placeholder `Tìm kiếm công việc, ứng viên...`.
* **Thông báo & Tài khoản**: Biểu tượng chuông + Avatar bo tròn + Tên người dùng từ Auth State/Profile.

### C. 3 Thẻ chỉ số tổng quan (KPI Cards - Binding trực tiếp API)
* **Thẻ 1 - Tổng việc làm đang mở**: Hiển thị biến số thực `stats.totalActiveJobs`, kèm xu hướng thực tế `stats.jobsTrend` (ví dụ: `↗ +5% tuần này`).
* **Thẻ 2 - Hồ sơ đang chờ duyệt**: Hiển thị biến số thực `stats.pendingApplications`, kèm xu hướng thực tế `stats.appsTrend` (ví dụ: `↗ +12% tuần này`).
* **Thẻ 3 - Thời gian tuyển trung bình**: Hiển thị biến số thực `stats.avgTimeToFill` + chữ `Ngày`, kèm xu hướng thực tế `stats.timeTrend` (ví dụ: `↓ -2 ngày tuần này`).

### D. Bảng danh sách công việc (Vị trí tuyển dụng)
* **Tiêu đề khối**: `Vị trí tuyển dụng`.
* **Cột dữ liệu**:
    1. `Vị trí công việc` (`job.title`)
    2. `Phòng ban` (`job.department`)
    3. `Địa điểm` (`job.location`)
    4. `Ngày đăng` (`job.postedDate | date:'mediumDate'`)
    5. `Số ứng viên` (`job.applicantCount`)
    6. `Trạng thái` (`job.status` render badge tương ứng)
    7. `Thao tác` (Nút menu `...`)
* **Phân trang**: `Trang {currentPage} / {totalPages}` kèm 2 nút điều hướng `<` và `>`.