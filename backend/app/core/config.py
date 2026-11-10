from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "codemind.db"

PROJECT_NAME = "CodeMind Campus API"
VERSION = "2.0.0"

CORS_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]

SECRET_KEY = os.getenv("SECRET_KEY", "codemind-campus-secret-key-super-safe-2026")
ALGORITHM = "HS256"
# Access token: 15 phút, Refresh token: 7 ngày theo đặc tả CodeMind Campus
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh"
