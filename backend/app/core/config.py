from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env", override=False)
load_dotenv(ROOT_DIR.parent / ".env", override=False)

DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "codemind.db"

DEV_DEFAULT_CORS_ORIGINS: tuple[str, ...] = (
    "http://127.0.0.1:8443",
    "http://localhost:8443",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
)


def _parse_origins(raw: str | None) -> list[str]:
    """Phân tích danh sách origin từ chuỗi JSON array hoặc comma-separated."""
    if not raw:
        return []
    text = raw.strip()
    if not text:
        return []
    if text.startswith("["):
        try:
            parsed = json.loads(text)
            candidates = [str(item) for item in parsed] if isinstance(parsed, list) else [text]
        except json.JSONDecodeError:
            candidates = [part for part in text.split(",")]
    else:
        candidates = [part for part in text.split(",")]

    normalized: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        origin = item.strip().rstrip("/")
        if origin and origin not in seen:
            seen.add(origin)
            normalized.append(origin)
    return normalized


def build_cors_origins(
    environment: str | None = None,
    extra_raw: str | None = None,
    prod_raw: str | None = None,
    frontend_url: str | None = None,
) -> list[str]:
    """Xây dựng danh sách CORS origins hợp lệ theo môi trường dev / production."""
    env_name = (
        environment
        if environment is not None
        else os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "development"
    ).strip().lower()
    raw_cors = extra_raw if extra_raw is not None else os.getenv("CORS_ORIGINS")
    raw_prod = prod_raw if prod_raw is not None else os.getenv("PROD_CORS_ORIGINS")
    raw_frontend = frontend_url if frontend_url is not None else os.getenv("FRONTEND_URL")

    origins: list[str] = []
    seen: set[str] = set()

    def _extend(items: list[str] | tuple[str, ...]) -> None:
        for item in items:
            clean = item.strip().rstrip("/")
            if clean and clean not in seen:
                seen.add(clean)
                origins.append(clean)

    if env_name not in ("production", "prod"):
        _extend(DEV_DEFAULT_CORS_ORIGINS)

    _extend(_parse_origins(raw_cors))
    _extend(_parse_origins(raw_prod))
    _extend(_parse_origins(raw_frontend))
    return origins


def resolve_database_url(raw_url: str | None = None) -> str:
    """Chuẩn hóa DATABASE_URL; mặc định dùng SQLite local trong DATA_DIR."""
    candidate = (raw_url if raw_url is not None else os.getenv("DATABASE_URL") or "").strip()
    if candidate:
        return candidate
    return f"sqlite:///{DB_PATH.as_posix()}"


@dataclass(frozen=True)
class Settings:
    project_name: str
    version: str
    environment: str
    database_url: str
    sql_echo: bool
    cors_origins: tuple[str, ...]
    cors_origin_regex: str | None
    cors_allow_methods: tuple[str, ...]
    cors_allow_headers: tuple[str, ...]
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    default_timezone: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Đọc cấu hình ứng dụng từ biến môi trường (cache singleton)."""
    env_name = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "development").strip().lower()
    cors_list = build_cors_origins(environment=env_name)
    origin_regex = (os.getenv("CORS_ORIGIN_REGEX") or "").strip() or None
    if not origin_regex and env_name not in ("production", "prod"):
        origin_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    return Settings(
        project_name=os.getenv("PROJECT_NAME", "CodeMind Campus API"),
        version=os.getenv("APP_VERSION", "2.0.0"),
        environment=env_name,
        database_url=resolve_database_url(),
        sql_echo=(os.getenv("SQL_ECHO", "false").strip().lower() == "true"),
        cors_origins=tuple(cors_list),
        cors_origin_regex=origin_regex,
        cors_allow_methods=("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"),
        cors_allow_headers=("Authorization", "Content-Type", "X-Requested-With", "Idempotency-Key"),
        secret_key=os.getenv("SECRET_KEY", "codemind-campus-secret-key-super-safe-2026"),
        algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")),
        refresh_token_expire_days=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")),
        default_timezone=os.getenv("DEFAULT_TIMEZONE", "Asia/Ho_Chi_Minh"),
    )


settings = get_settings()

# Hằng số module-level tương thích ngược với TE9CA7A (JWT) và các module hiện có
PROJECT_NAME = settings.project_name
VERSION = settings.version
ENVIRONMENT = settings.environment
DATABASE_URL = settings.database_url
CORS_ORIGINS: list[str] = list(settings.cors_origins)
CORS_ORIGIN_REGEX = settings.cors_origin_regex
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days
DEFAULT_TIMEZONE = settings.default_timezone
