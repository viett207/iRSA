# Script khoi chay toan bo he thong P-164 tren Windows

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Khoi chay he thong P-164 (iRSA)..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. MinIO Storage Server
Write-Host "1. Khieu chay MinIO Storage (Port 9000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; .\minio.exe server .\data\minio --address ':9000' --console-address ':9001'"

# 2. FastAPI Backend & AI Agent
Write-Host "2. Khieu chay FastAPI Backend & AI Agent (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; .\.venv\Scripts\Activate.ps1; uvicorn run_local:app --reload --port 8000"

# 3. Celery Worker
Write-Host "3. Khieu chay Celery Async Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; .\.venv\Scripts\Activate.ps1; `$env:PYTHONPATH='backend'; celery -A app.tasks.celery_app worker --loglevel=info -P threads"

# 4. Frontend Admin (Port 4200)
Write-Host "4. Khieu chay Frontend Admin (Port 4200)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend-admin'; npm start"

# 5. Frontend Portal (Port 4300)
Write-Host "5. Khieu chay Frontend Portal (Port 4300)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend-portal'; npm start"

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Da phat lenh khoi chay tat ca cac dich vu!" -ForegroundColor Green
Write-Host "Danh sach dia chi truy cap:" -ForegroundColor White
Write-Host "   - FastAPI Swagger UI : http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "   - Frontend Admin     : http://localhost:4200" -ForegroundColor Cyan
Write-Host "   - Frontend Portal    : http://localhost:4300" -ForegroundColor Cyan
Write-Host "   - MinIO Console      : http://localhost:9001" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green
