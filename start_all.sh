#!/usr/bin/env bash

# Script khoi chay cac dich vu local cua he thong iRSA tren macOS / Linux

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "Khởi chạy hệ thống iRSA - Local Services..."
echo "DB & Storage: Cloud (Supabase)"
echo "========================================="

# 1. FastAPI Backend & AI Agent
echo "1. Khởi chạy FastAPI Backend & AI Agent (Port 8000)..."
if [ -d "$ROOT_DIR/.venv311" ]; then
    PYTHON_EXEC="$ROOT_DIR/.venv311/bin/python"
elif [ -d "$ROOT_DIR/.venv" ]; then
    PYTHON_EXEC="$ROOT_DIR/.venv/bin/python"
else
    PYTHON_EXEC="python3"
fi

cd "$ROOT_DIR"
$PYTHON_EXEC -m uvicorn run_local:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 2. Frontend Admin (Port 4200)
echo "2. Khởi chạy Frontend Admin (Port 4200)..."
(cd "$ROOT_DIR/frontend-admin" && npm start) &
ADMIN_PID=$!

# 3. Frontend Portal (Port 4300)
echo "3. Khởi chạy Frontend Portal (Port 4300)..."
(cd "$ROOT_DIR/frontend-portal" && npm start) &
PORTAL_PID=$!

echo "========================================="
echo "Đã phát lệnh khởi chạy tất cả dịch vụ!"
echo "Danh sách địa chỉ truy cập:"
echo "   - FastAPI Swagger UI : http://localhost:8000/docs"
echo "   - Health Check       : http://localhost:8000/health"
echo "   - Frontend Admin     : http://localhost:4200"
echo "   - Frontend Portal    : http://localhost:4300"
echo "========================================="
echo "Nhấn Ctrl+C để dừng tất cả dịch vụ."

trap "kill $BACKEND_PID $ADMIN_PID $PORTAL_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
