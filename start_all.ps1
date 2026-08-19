# Script khoi chay cac dich vu local cua he thong P-164 tren Windows (DB & Storage tren Cloud)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Khoi chay he thong P-164 (iRSA) - Local Services..." -ForegroundColor Cyan
Write-Host "DB & Storage: Cloud (Supabase)" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan

# 1. FastAPI Backend & AI Agent
Write-Host "1. Khoi chay FastAPI Backend & AI Agent (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; .\.venv\Scripts\python.exe -m uvicorn run_local:app --reload --host 127.0.0.1 --port 8000"

# 2. Celery Worker
Write-Host "2. Khoi chay Celery Async Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; .\.venv\Scripts\Activate.ps1; `$env:PYTHONPATH='backend'; celery -A app.tasks.celery_app worker --loglevel=info -P threads"

# 3. Frontend Admin (Port 4200)
Write-Host "3. Khoi chay Frontend Admin (Port 4200)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend-admin'; npm start"

# 4. Frontend Portal (Port 4300)
Write-Host "4. Khoi chay Frontend Portal (Port 4300)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend-portal'; npm start"

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Da phat lenh khoi chay tat ca cac dich vu local!" -ForegroundColor Green
Write-Host "Danh sach dia chi truy cap:" -ForegroundColor White
Write-Host "   - FastAPI Swagger UI : http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "   - Frontend Admin     : http://localhost:4200" -ForegroundColor Cyan
Write-Host "   - Frontend Portal    : http://localhost:4300" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green
