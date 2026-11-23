# ============================================
#  CodeMind Campus - Script khoi dong nhanh
#  Chay: .\start.ps1
# ============================================

$root = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CodeMind Campus - Khoi dong du an   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Kiem tra MySQL ---
Write-Host "[1/3] Kiem tra MySQL..." -ForegroundColor Yellow
$mysql = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
if (-not $mysql) {
    Write-Host "  !! MySQL chua chay. Dang khoi dong..." -ForegroundColor Red
    Start-Service -Name "MySQL*" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
} else {
    Write-Host "  OK MySQL dang chay." -ForegroundColor Green
}

# --- Khoi dong Backend ---
Write-Host ""
Write-Host "[2/3] Khoi dong Backend (FastAPI port 8000)..." -ForegroundColor Yellow
$backendPath = Join-Path $root "backend"
$python = Join-Path $backendPath ".venv\Scripts\python.exe"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$backendPath'; Write-Host 'BACKEND dang chay tai http://127.0.0.1:8000' -ForegroundColor Green; & '$python' -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
) -WindowStyle Normal

Write-Host "  OK Backend dang khoi dong trong cua so moi." -ForegroundColor Green
Start-Sleep -Seconds 2

# --- Khoi dong Frontend ---
Write-Host ""
Write-Host "[3/3] Khoi dong Frontend (Vite port 5173)..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root'; Write-Host 'FRONTEND dang chay tai http://localhost:5173' -ForegroundColor Green; pnpm dev 2>&1; if (`$LASTEXITCODE -ne 0) { npm run dev }"
) -WindowStyle Normal

Write-Host "  OK Frontend dang khoi dong trong cua so moi." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Du an dang chay!" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor White
Write-Host "  Backend  : http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  API Docs : http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Mo trinh duyet tu dong
Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"
