from __future__ import annotations

from app.api.v1.endpoints.ai import router as ai_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.instructor import router as instructor_router
from app.api.v1.endpoints.kanban import router as kanban_router
from app.api.v1.endpoints.lms import router as lms_router
from app.api.v1.endpoints.submissions import router as submissions_router

__all__ = [
    "ai_router",
    "auth_router",
    "health_router",
    "instructor_router",
    "kanban_router",
    "lms_router",
    "submissions_router",
]
