from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user, require_role
from app.core.database import db, row_dict

router = APIRouter(tags=["Instructor & Admin"])


@router.get("/instructor/sessions")
def get_instructor_sessions(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Danh sách các phiên học tập sinh viên cho phép giảng viên giám sát (teacher_visibility=1)."""
    require_role(user, "instructor", "org_admin")
    with db() as conn:
        rows = conn.execute(
            """SELECT ls.id session_id, u.display_name, l.title, ls.status, ls.current_step_no,
                      ls.teacher_visibility, e.passed_count, e.hint_count
               FROM learning_sessions ls
               JOIN users u ON u.id=ls.user_id
               JOIN lessons l ON l.id=ls.lesson_id
               LEFT JOIN evidence e ON e.learning_session_id=ls.id
               WHERE ls.organization_id=? AND ls.teacher_visibility=1
               ORDER BY ls.started_at DESC""",
            (user["organization_id"],),
        ).fetchall()
    return {"sessions": [row_dict(row) for row in rows]}


@router.post("/admin/reset-demo")
def reset_demo(user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    """Reset toàn bộ dữ liệu thực thi tạm thời về trạng thái ban đầu."""
    require_role(user, "org_admin")
    with db() as conn:
        conn.execute("DELETE FROM analytics_events")
        conn.execute("DELETE FROM audit_events")
        conn.execute("DELETE FROM evidence")
        conn.execute("DELETE FROM test_results")
        conn.execute("DELETE FROM submissions")
        conn.execute("DELETE FROM ai_hints")
        conn.execute("DELETE FROM ai_interactions")
        conn.execute("DELETE FROM concept_answers")
        conn.execute("DELETE FROM term_selections")
        conn.execute("DELETE FROM step_attempts")
        conn.execute("DELETE FROM learning_sessions")
    return {"status": "reset", "message": "Demo data đã reset"}
