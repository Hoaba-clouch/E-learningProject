from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "codemind.db"


def _load_dotenv(env_path: Path) -> None:
    """Nạp biến môi trường từ backend/.env mà không ghi đè biến đã có trên OS."""
    if not env_path.exists():
        return
    try:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
                val = val[1:-1]
            if key:
                os.environ.setdefault(key, val)
    except Exception:
        pass


_load_dotenv(ROOT_DIR / ".env")

# Cấu hình CSDL MySQL 8.0 (CodeMind AI Learning OS)
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "123456")
MYSQL_DB = os.getenv("MYSQL_DB", "codemind_ai")
USE_MYSQL = os.getenv("USE_MYSQL", "true").lower() in ("true", "1", "yes")

PROJECT_NAME = "CodeMind Campus API"
VERSION = "2.0.0"

_default_cors = [
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
_extra_cors = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
CORS_ORIGINS = list(dict.fromkeys([*_default_cors, *_extra_cors]))

CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[a-zA-Z0-9-]+\.vercel\.app)$",
)

SECRET_KEY = os.getenv("SECRET_KEY", "codemind-campus-secret-key-super-safe-2026")
ALGORITHM = "HS256"
# Access token: 15 phút, Refresh token: 7 ngày theo đặc tả CodeMind Campus
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh"

# Cấu hình Google Gemini LLM (xoay vòng nhiều key từ backend/.env)
_raw_gemini_keys = os.getenv("GEMINI_API_KEYS", "")
_single_gemini_key = os.getenv("GEMINI_API_KEY", "")
_parsed_keys: list[str] = []
for _chunk in (_raw_gemini_keys + "," + _single_gemini_key).replace("\n", ",").split(","):
    _k = _chunk.strip()
    if _k and _k not in _parsed_keys:
        _parsed_keys.append(_k)

GEMINI_API_KEYS: list[str] = _parsed_keys
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite").strip() or "gemini-3.1-flash-lite"
GEMINI_FALLBACK_MODEL: str = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3-flash-preview").strip() or "gemini-3-flash-preview"
try:
    GEMINI_TIMEOUT_SEC: float = max(3.0, min(30.0, float(os.getenv("GEMINI_TIMEOUT_SEC", "10"))))
except ValueError:
    GEMINI_TIMEOUT_SEC = 10.0
