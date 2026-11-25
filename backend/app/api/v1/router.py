from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import block_pending_student
from app.api.v1.admin import router as admin_router
from app.api.v1.ai import router as ai_router
from app.api.v1.auth import router as auth_router
from app.api.v1.courses import router as courses_router
from app.api.v1.defense import router as defense_router
from app.api.v1.git_hub import router as git_hub_router
from app.api.v1.instructor import router as instructor_router
from app.api.v1.kanban import router as kanban_router
from app.api.v1.lms import router as lms_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.schedules import router as schedules_router
from app.api.v1.student_learning import router as student_learning_router
from app.api.v1.submissions import router as submissions_router
from app.mcp.router import router as mcp_router

api_v1_router = APIRouter()
_active_learning_deps = [Depends(block_pending_student)]

api_v1_router.include_router(auth_router)
api_v1_router.include_router(courses_router, dependencies=_active_learning_deps)
api_v1_router.include_router(lms_router, dependencies=_active_learning_deps)
api_v1_router.include_router(student_learning_router, dependencies=_active_learning_deps)
api_v1_router.include_router(submissions_router, dependencies=_active_learning_deps)
api_v1_router.include_router(ai_router, dependencies=_active_learning_deps)
api_v1_router.include_router(defense_router, dependencies=_active_learning_deps)
api_v1_router.include_router(instructor_router, dependencies=_active_learning_deps)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(kanban_router, dependencies=_active_learning_deps)
api_v1_router.include_router(git_hub_router, dependencies=_active_learning_deps)
api_v1_router.include_router(notifications_router, dependencies=_active_learning_deps)
api_v1_router.include_router(schedules_router, dependencies=_active_learning_deps)
api_v1_router.include_router(mcp_router, dependencies=_active_learning_deps)
