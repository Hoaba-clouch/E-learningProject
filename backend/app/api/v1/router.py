from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.lms import router as lms_router
from app.api.v1.submissions import router as submissions_router
from app.api.v1.ai import router as ai_router
from app.api.v1.instructor import router as instructor_router
from app.api.v1.kanban import router as kanban_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(lms_router)
api_v1_router.include_router(submissions_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(instructor_router)
api_v1_router.include_router(kanban_router)
