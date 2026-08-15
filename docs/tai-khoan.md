# Danh Sách Tài Khoản Hệ Thống

## 1. Tài khoản Quản trị viên (Admin)

Tài khoản quản trị cao nhất dùng để đăng nhập vào trang **Admin Portal** và quản lý toàn bộ hệ thống.

| Thuộc tính | Giá trị |
| :--- | :--- |
| **Email** | `admin@example.com` |
| **Mật khẩu** | `Admin@123456` |
| **Họ và tên** | Administrator |
| **Vai trò (Role)** | `admin` |
| **Trạng thái phê duyệt** | `approved` |
| **Trạng thái email** | Đã xác thực (`email_verified = True`) |
| **Trạng thái hoạt động** | Đang hoạt động (`is_active = True`) |

---

## 2. Thông tin truy cập

- **Admin Portal (Giao diện Quản trị):** [http://localhost:4200](http://localhost:4200) (Trang đăng nhập: `http://localhost:4200/login`)
- **Candidate Portal (Giao diện Ứng viên):** [http://localhost:4300](http://localhost:4300)
- **Backend API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 3. Lệnh tạo thêm hoặc cập nhật tài khoản Admin

Chạy lệnh sau từ thư mục gốc của dự án nếu cần tạo mới hoặc cập nhật mật khẩu cho tài khoản admin:

```bash
python backend/scripts/create_admin.py --email admin@example.com --password "Admin@123456" --name "Administrator"
```
