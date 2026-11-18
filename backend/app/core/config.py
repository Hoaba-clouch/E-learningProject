from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "codemind.db"

# Cấu hình CSDL MySQL 8.0 (CodeMind AI Learning OS)
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "123456")
MYSQL_DB = os.getenv("MYSQL_DB", "codemind_ai")
USE_MYSQL = os.getenv("USE_MYSQL", "true").lower() in ("true", "1", "yes")

PROJECT_NAME = "CodeMind Campus API"
VERSION = "2.0.0"

CORS_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:8443",
    "http://localhost:8443",
]

CORS_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

SECRET_KEY = os.getenv("SECRET_KEY", "codemind-campus-secret-key-super-safe-2026")
ALGORITHM = "HS256"
# Access token: 15 phút, Refresh token: 7 ngày theo đặc tả CodeMind Campus
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh"
