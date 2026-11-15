from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    ai_router,
    auth_router,
    health_router,
    instructor_router,
    kanban_router,
    lms_router,
    submissions_router,
)

api_v1_router = APIRouter()

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(lms_router)
api_v1_router.include_router(submissions_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(instructor_router)
api_v1_router.include_router(kanban_router)
