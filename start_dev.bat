@echo off
title CodeMind Campus Launcher
echo ========================================================
echo        KHOI DONG DU AN CODEMIND CAMPUS
echo ========================================================
echo.
echo [1/2] Dang khoi dong Backend FastAPI tren port 8000...
start "CodeMind Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Dang khoi dong Frontend React Vite tren port 8443...
start "CodeMind Frontend (React Vite)" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ========================================================
echo   Da khoi dong thanh cong trong 2 cua so terminal:
echo   - Frontend: http://localhost:8443
echo   - Backend API: http://127.0.0.1:8000
echo   - Swagger Docs: http://127.0.0.1:8000/docs
echo ========================================================
