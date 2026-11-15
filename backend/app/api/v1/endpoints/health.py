from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.timezone import now_utc

router = APIRouter(tags=["Health"])


@router.get("/health/live")
def health_live() -> dict[str, Any]:
    """Kiểm tra trạng thái tiến trình API (Liveness Probe)."""
    return {
        "status": "alive",
        "version": settings.version,
        "environment": settings.environment,
        "timestamp": now_utc(),
    }


@router.get("/health/ready")
def health_ready(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Kiểm tra tình trạng sẵn sàng của ứng dụng và kết nối CSDL SQLAlchemy."""
    db.execute(text("SELECT 1"))
    return {
        "status": "ready",
        "database": "connected",
        "version": settings.version,
        "environment": settings.environment,
        "timezone_standard": "UTC",
        "timestamp": now_utc(),
    }
