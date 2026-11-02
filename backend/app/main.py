from __future__ import annotations

from typing import Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import CORS_ORIGINS
from app.core.database import db, init_db

app = FastAPI(
    title="CodeMind Campus API",
    version="2.0.0",
    description="Backend Layered Architecture for Industrial Code Grader & Engineering Project Workspace",
)

# Cấu hình CORS an toàn
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """Khởi tạo cấu trúc CSDL và seed dữ liệu khi khởi động server."""
    init_db()


@app.get("/health/ready", tags=["Health"])
def health_ready() -> dict[str, Any]:
    """Kiểm tra độ sẵn sàng của ứng dụng và kết nối CSDL."""
    with db() as conn:
        conn.execute("SELECT 1").fetchone()
    return {
        "status": "ok",
        "database": "ready",
        "service": "codemind-api",
        "version": app.version,
    }


# Mount toàn bộ các API v1
app.include_router(api_v1_router, prefix="/v1")
