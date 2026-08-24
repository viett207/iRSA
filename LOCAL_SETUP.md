# Chạy project trên máy local

Project sử dụng một FastAPI backend chính. Package `src` chứa AI Agent và được gắn
vào backend tại `/api/v1/agent`.

## 1. Cài đặt

Yêu cầu: Python 3.11+, Node.js 20+.
*(Cơ sở dữ liệu PostgreSQL và Storage đã được đẩy lên Supabase Cloud, Redis trên Upstash Cloud — không cần cài đặt hoặc chạy database/minio local trên máy).*

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Cấu hình thông tin kết nối Supabase trong file `.env`, sau đó chạy migration đồng bộ schema lên Supabase:

```powershell
Set-Location backend
alembic upgrade head
Set-Location ..
```

## 2. Chạy backend và AI Agent

```powershell
uvicorn run_local:app --reload --port 8000
```

- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health
- Agent status: http://localhost:8000/api/v1/agent/status

## 3. Chạy hai frontend

Mở hai terminal riêng:

```powershell
Set-Location frontend-admin
npm install
npm start
```

```powershell
Set-Location frontend-portal
npm install
npm start
```

- Admin: http://localhost:4200
- Portal: http://localhost:4300

Không cần Docker để chạy project.
