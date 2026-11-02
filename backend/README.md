# CodeMind MVP backend

Backend P0 theo `docs/CodeMind_Round3_MVP_Plan.md`, dùng FastAPI và SQLite local để chạy demo ngay trên máy.

## Chạy local

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health check: `http://127.0.0.1:8000/health/ready`

Demo roles: `student`, `instructor`, `admin` qua `POST /v1/demo/session`.

Smoke test khi server đang chạy:

```powershell
python backend/test_api.py
```

SQLite database được seed tự động với một lesson `deque`, source Python 3.12 và ba demo roles. Đây là adapter local cho MVP; khi deploy thật có thể thay lớp lưu trữ bằng PostgreSQL theo workbook data spec.

