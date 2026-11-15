from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin, require_instructor
from app.core.database import get_db
from app.core.timezone import to_utc_iso
from app.models.audit import AnalyticsEvent, AuditEvent
from app.models.course import Lesson
from app.models.learning import ConceptAnswer, LearningSession, StepAttempt, TermSelection
from app.models.submission import AIHint, AIInteraction, Evidence, Submission, TestResult
from app.models.user import User
from app.services.user_service import list_users

router = APIRouter(tags=["Instructor & Admin"])


@router.get("/instructor/sessions")
def get_instructor_sessions(
    user: dict[str, Any] = Depends(require_instructor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Danh sách các phiên học tập sinh viên cho phép giảng viên giám sát (teacher_visibility=1).
    Được bảo vệ bởi FastAPI Dependency: require_instructor.
    """
    rows = db.execute(
        select(
            LearningSession.id.label("session_id"),
            User.display_name,
            Lesson.title,
            LearningSession.status,
            LearningSession.current_step_no,
            LearningSession.teacher_visibility,
            Evidence.passed_count,
            Evidence.hint_count,
        )
        .select_from(LearningSession)
        .join(User, User.id == LearningSession.user_id)
        .join(Lesson, Lesson.id == LearningSession.lesson_id)
        .outerjoin(Evidence, Evidence.learning_session_id == LearningSession.id)
        .where(
            LearningSession.organization_id == user["organization_id"],
            LearningSession.teacher_visibility == 1,
        )
        .order_by(LearningSession.started_at.desc())
    ).mappings().all()
    return {"sessions": [dict(row) for row in rows]}


@router.get("/admin/users")
def get_admin_users(
    _user: dict[str, Any] = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Danh sách toàn bộ người dùng trong hệ thống (chỉ dành cho Quản trị viên).
    Được bảo vệ bởi FastAPI Dependency: require_admin.
    """
    users = list_users(db)
    items = [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "display_name": u.display_name,
            "role": u.role,
            "status": u.status,
            "timezone": u.timezone,
            "created_at": to_utc_iso(u.created_at),
        }
        for u in users
    ]
    return {"users": items, "total": len(items)}


@router.post("/admin/reset-demo")
def reset_demo(
    _user: dict[str, Any] = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """
    Reset toàn bộ dữ liệu thực thi tạm thời về trạng thái ban đầu.
    Được bảo vệ bởi FastAPI Dependency: require_admin.
    """
    for model in (
        AnalyticsEvent,
        AuditEvent,
        Evidence,
        TestResult,
        Submission,
        AIHint,
        AIInteraction,
        ConceptAnswer,
        TermSelection,
        StepAttempt,
        LearningSession,
    ):
        db.execute(delete(model))
    return {"status": "reset", "message": "Demo data đã reset thành công"}
