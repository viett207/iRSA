# Đóng gói backend bằng Docker

Supabase chạy bên ngoài Docker. Container backend và job migration nhận
`DATABASE_URL` từ file `.env` ở thư mục gốc khi khởi động; file này không được
copy vào image.

## Chuẩn bị cấu hình

Sử dụng URI **Session pooler** của Supabase để kết nối được qua IPv4:

```env
DATABASE_URL=postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:5432/postgres
DEBUG=false
```

Các ký tự đặc biệt trong mật khẩu phải được percent-encode. Không commit `.env`.
Ở local, Compose mount file này read-only vào `/app/.env`; file không được copy
vào image và các ký tự `$` trong URI không bị Compose nội suy.

## Build image

Chạy từ thư mục gốc của repository:

```powershell
docker build -f backend/Dockerfile -t p164-backend:local .
```

## Chạy migration

```powershell
docker compose -f compose.backend.yml run --rm migrate
```

Migration là job chạy một lần và tự thoát. Alembic chỉ áp dụng các revision còn
thiếu nên có thể chạy lại khi triển khai phiên bản mới.

## Khởi động backend

Lệnh sau sẽ chạy migration trước, sau đó mở API ở cổng `8000`:

```powershell
docker compose -f compose.backend.yml up --build backend
```

Kiểm tra health endpoint:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

## Dừng container

```powershell
docker compose -f compose.backend.yml down
```

Trong môi trường deploy, khai báo các biến môi trường bằng secret manager của
nền tảng thay vì tải file `.env` lên server. Có thể dùng cùng image cho backend
và migration, nhưng chỉ chạy migration một lần cho mỗi bản phát hành.
