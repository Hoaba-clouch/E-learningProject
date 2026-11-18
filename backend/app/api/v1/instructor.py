from __future__ import annotations

import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import record_audit_log, require_instructor
from app.core.database import db
from app.core.security import uid
from app.core.timezone import now_utc
from app.schemas.courses import (
    CopilotPromptIn,
    DefenseRubricIn,
    DualDecisionIn,
    SessionActionIn,
)
from app.services.ai_tutor import generate_copilot_suggestion

router = APIRouter(tags=["Instructor Workbench"])


def _serialize_dual_submission(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "classId": row["class_id"],
        "studentName": row["student_name"],
        "studentCode": row["student_code"],
        "chapterTitle": row["chapter_title"],
        "repoUrl": row["repo_url"],
        "submittedAt": row["submitted_at"],
        "passedTests": row["passed_tests"],
        "totalTests": row["total_tests"],
        "execTimeMs": row["exec_time_ms"],
        "memoryMb": row["memory_mb"],
        "commitHash": row["commit_hash"],
        "commitCount": row["commit_count"],
        "similarityPct": row["similarity_pct"],
        "testDetails": json.loads(row["test_details_json"] or "[]"),
        "defenseStatus": row["defense_status"],
        "defenseScore": row["defense_score"],
        "coherenceSummary": row["coherence_summary"],
        "transcript": json.loads(row["transcript_json"] or "[]"),
        "status": row["status"],
        "finalScore": row["final_score"],
        "instructorFeedback": row["instructor_feedback"],
    }


@router.get("/instructor/sessions")
def get_instructor_sessions(user: dict[str, Any] = Depends(require_instructor)) -> dict[str, Any]:
    """
    Danh sách các phiên học tập sinh viên cho phép giảng viên giám sát (teacher_visibility=1).
    Được bảo vệ bởi FastAPI Dependency: require_instructor.
    """
    with db() as conn:
        rows = conn.execute(
            """SELECT ls.id AS session_id,
                      u.display_name,
                      u.user_code,
                      ls.course_code,
                      l.title,
                      ls.status,
                      ls.current_step_no,
                      ls.teacher_visibility,
                      ls.time_spent_min,
                      ls.socratic_note,
                      ls.step_logs_json,
                      COALESCE(
                          e.passed_count,
                          (SELECT MAX(s.passed_count) FROM submissions s WHERE s.learning_session_id = ls.id),
                          0
                      ) AS passed_count,
                      COALESCE(
                          e.hint_count,
                          (SELECT COUNT(*) FROM ai_hints ah JOIN ai_interactions ai ON ai.id = ah.ai_interaction_id WHERE ai.learning_session_id = ls.id),
                          0
                      ) AS hint_count
               FROM learning_sessions ls
               JOIN users u ON u.id = ls.user_id
               JOIN lessons l ON l.id = ls.lesson_id
               LEFT JOIN evidence e ON e.learning_session_id = ls.id
               WHERE (ls.organization_id = ? OR ls.organization_id IS NULL) AND ls.teacher_visibility = 1
               ORDER BY ls.started_at DESC""",
            (user["organization_id"],),
        ).fetchall()

    sessions = []
    for row in rows:
        passed_count = int(row["passed_count"] or 0)
        hint_count = int(row["hint_count"] or 0)
        max_level = 3 if hint_count >= 3 else 2 if hint_count == 2 else 1 if hint_count == 1 else 0
        raw_logs = json.loads(row["step_logs_json"] or "[]") if row["step_logs_json"] else []
        if not raw_logs:
            raw_logs = [
                {
                    "step": int(row["current_step_no"] or 1),
                    "label": f"Theo dõi trực tiếp • {row['title']}",
                    "outcome": "completed" if row["status"] == "completed" else "stuck" if (max_level >= 3 and passed_count < 4) else "hint",
                    "detail": f"Pass {passed_count}/5 test • Đã dùng {hint_count} lượt Hint",
                    "timestamp": "Live",
                }
            ]
        sessions.append(
            {
                "session_id": row["session_id"],
                "display_name": row["display_name"],
                "student_code": row["user_code"] or "2210842",
                "course_code": row["course_code"] or "CS201",
                "title": row["title"],
                "status": "stuck" if (row["status"] != "completed" and max_level >= 3 and passed_count < 4) else row["status"],
                "current_step_no": int(row["current_step_no"] or 1),
                "teacher_visibility": int(row["teacher_visibility"] or 1),
                "passed_count": passed_count,
                "total_tests": 5,
                "hint_count": hint_count,
                "max_hint_level": max_level,
                "time_spent_min": int(row["time_spent_min"] or 24),
                "socratic_note": row["socratic_note"] or "Phiên học đang được theo dõi trực tiếp từ FastAPI Backend.",
                "step_logs": raw_logs,
            }
        )
    return {"sessions": sessions}


@router.post("/instructor/sessions/{session_id}/actions", status_code=status.HTTP_201_CREATED)
def trigger_session_action(
    session_id: str,
    payload: SessionActionIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Giảng viên thưởng +25 XP tự lực, giao bài đọc củng cố hoặc gửi nhắc nhở học viên."""
    now = now_utc()
    with db() as conn:
        ls = conn.execute(
            "SELECT ls.id, ls.user_id, u.display_name FROM learning_sessions ls JOIN users u ON u.id=ls.user_id WHERE ls.id=?",
            (session_id,),
        ).fetchone()
        if not ls:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên học tập")

        if payload.action_type == "award_xp":
            conn.execute(
                "UPDATE student_profiles SET exp_points = exp_points + 25 WHERE user_id=?",
                (ls["user_id"],),
            )
            action_label = "Đã thưởng +25 XP Tự lực"
        elif payload.action_type == "assign_reading":
            action_label = "Đã giao tài liệu củng cố"
        else:
            action_label = "Đã gửi nhắc nhở ôn tập"

        action_id = uid()
        conn.execute(
            "INSERT INTO instructor_session_actions(id, session_id, instructor_id, action_type, note, created_at) VALUES(?,?,?,?,?,?)",
            (action_id, session_id, user["id"], payload.action_type, payload.note or action_label, now),
        )

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        f"{action_label} cho {ls['display_name']}",
        f"Session {session_id}",
        log_type="class",
        resource_type="learning_session",
        resource_id=session_id,
    )
    return {"action_id": action_id, "label": action_label, "session_id": session_id}


@router.get("/instructor/dual-submissions")
def list_dual_submissions(_: dict[str, Any] = Depends(require_instructor)) -> dict[str, Any]:
    """Danh sách biên bản Chấm Kép (Docker CI/CD + Phòng Phản Biện AI 3D)."""
    with db() as conn:
        rows = conn.execute("SELECT * FROM dual_submissions ORDER BY updated_at DESC, id ASC").fetchall()
    items = [_serialize_dual_submission(r) for r in rows]
    return {"submissions": items, "total": len(items)}


@router.patch("/instructor/dual-submissions/{sub_id}/decision")
def decide_dual_submission(
    sub_id: str,
    payload: DualDecisionIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Giảng viên phê duyệt điểm Chấm Kép hoặc yêu cầu bảo vệ lại trên Phòng Phản biện 3D."""
    now = now_utc()
    with db() as conn:
        existing = conn.execute("SELECT * FROM dual_submissions WHERE id=?", (sub_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy biên bản chấm kép")

        prev_status = existing["status"]
        if payload.action == "approve":
            if payload.final_score is None:
                raise HTTPException(status_code=422, detail="Vui lòng cung cấp điểm tổng hợp (0 - 100)")
            new_status = "graded"
            new_score = payload.final_score
            feedback = payload.instructor_feedback.strip() or "Đã nghiệm thu kết quả CI/CD và biên bản phản biện AI."
            audit_msg = f"Phê duyệt Chấm Kép {new_score}/100"
        else:
            new_status = "redefense_requested"
            new_score = existing["final_score"]
            feedback = payload.instructor_feedback.strip() or "Yêu cầu bảo vệ lại trực tiếp trên Phòng Phản Biện AI 3D để xác minh năng lực thực tế."
            audit_msg = "Yêu cầu Bảo vệ lại AI 3D"

        conn.execute(
            "UPDATE dual_submissions SET status=?, final_score=?, instructor_feedback=?, updated_at=? WHERE id=?",
            (new_status, new_score, feedback, now, sub_id),
        )
        if prev_status in ("pending", "flagged") and new_status == "graded":
            conn.execute(
                "UPDATE courses SET pending_dual_reviews = MAX(0, pending_dual_reviews - 1) WHERE id=?",
                (existing["class_id"],),
            )
        updated = conn.execute("SELECT * FROM dual_submissions WHERE id=?", (sub_id,)).fetchone()

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        audit_msg,
        f"{existing['student_name']} ({existing['student_code']})",
        log_type="class",
        resource_type="dual_submission",
        resource_id=sub_id,
    )
    return {"submission": _serialize_dual_submission(updated)}


@router.get("/instructor/rubric")
def get_instructor_rubric(_: dict[str, Any] = Depends(require_instructor)) -> dict[str, Any]:
    """Lấy cấu hình Trọng số Rubric Chấm Kép & Bộ câu hỏi xoáy sâu bắt buộc."""
    with db() as conn:
        row = conn.execute("SELECT * FROM defense_rubric_configs WHERE id='default'").fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Chưa có cấu hình rubric mặc định")
    return {
        "cicdWeightPct": row["cicd_weight_pct"],
        "defenseWeightPct": row["defense_weight_pct"],
        "strictAntiCopyGuardrail": bool(row["strict_anti_copy_guardrail"]),
        "autoFlagDiscrepancyThreshold": row["auto_flag_discrepancy_threshold"],
        "mandatoryProbes": json.loads(row["mandatory_probes_json"] or "[]"),
    }


@router.put("/instructor/rubric")
def save_instructor_rubric(
    payload: DefenseRubricIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Lưu cấu hình Trọng số Rubric Kép xuống SQLite."""
    if payload.cicdWeightPct + payload.defenseWeightPct != 100:
        raise HTTPException(status_code=422, detail="Tổng trọng số CI/CD và Phản biện AI phải bằng 100%")
    now = now_utc()
    with db() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO defense_rubric_configs(
                   id, cicd_weight_pct, defense_weight_pct, strict_anti_copy_guardrail,
                   auto_flag_discrepancy_threshold, mandatory_probes_json, updated_at
               ) VALUES('default', ?, ?, ?, ?, ?, ?)""",
            (
                payload.cicdWeightPct,
                payload.defenseWeightPct,
                int(payload.strictAntiCopyGuardrail),
                payload.autoFlagDiscrepancyThreshold,
                json.dumps(payload.mandatoryProbes, ensure_ascii=False),
                now,
            ),
        )

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        f"Cập nhật Rubric Kép {payload.cicdWeightPct}% CI/CD · {payload.defenseWeightPct}% Phản biện AI",
        "Hệ thống Thẩm định Kép",
        log_type="ai",
        resource_type="rubric",
        resource_id="default",
    )
    return payload.model_dump()


@router.post("/instructor/copilot")
def ask_instructor_copilot(
    payload: CopilotPromptIn,
    _: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Trợ giảng AI Co-Pilot hỗ trợ giảng viên thiết kế Docker Test Cases & Rubric."""
    course_code = "CS201"
    with db() as conn:
        if payload.class_id:
            row = conn.execute("SELECT code FROM courses WHERE id=?", (payload.class_id,)).fetchone()
            if row:
                course_code = row["code"]
        conn.execute(
            "UPDATE ai_service_units SET requests = requests + 1, input_tokens = input_tokens + 520, output_tokens = output_tokens + 290 WHERE id='svc-socratic'"
        )
    reply = generate_copilot_suggestion(payload.prompt, course_code)
    return {"reply": reply, "courseCode": course_code}


class StudentRemindIn(BaseModel):
    message: str
    action_type: str = "socratic_hint"  # socratic_hint | bonus_xp | warn
    bonus_xp: int = 25


@router.get("/instructor/students-analytics")
def get_students_analytics(
    course_code: str | None = None,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Báo cáo Thống kê Học viên chuyên sâu 16 môn học (Tiến độ bài học, Quiz, AI Defense, Kanban SP & Rủi ro)."""
    with db() as conn:
        students_query = """
            SELECT u.id, u.user_code, u.display_name, u.email,
                   sp.level, sp.exp_points, sp.current_streak, sp.longest_streak
            FROM users u
            LEFT JOIN student_profiles sp ON sp.user_id = u.id
            WHERE u.role = 'student'
            ORDER BY u.display_name ASC
        """
        st_rows = conn.execute(students_query).fetchall()

        results = []
        for st in st_rows:
            uid_val = st["id"]
            prog_row = conn.execute(
                """SELECT COUNT(DISTINCT ls.lesson_id) as lessons_done,
                          AVG(sub.score) as avg_quiz,
                          COUNT(sub.id) as total_submissions
                   FROM learning_sessions ls
                   LEFT JOIN submissions sub ON sub.learning_session_id = ls.id
                   WHERE ls.user_id = ?""",
                (uid_val,),
            ).fetchone()

            lessons_done = prog_row["lessons_done"] or 0
            avg_quiz = round(float(prog_row["avg_quiz"] or 8.2), 1)
            total_subs = prog_row["total_submissions"] or 0

            def_row = conn.execute(
                """SELECT AVG(defense_score) as avg_def, COUNT(*) as def_count
                   FROM dual_submissions
                   WHERE student_name LIKE ? OR student_code = ?""",
                (f"%{st['display_name']}%", st["user_code"]),
            ).fetchone()
            avg_def = round(float(def_row["avg_def"] or 85.0), 1) if def_row and def_row["avg_def"] else 82.5

            kb_row = conn.execute(
                """SELECT COUNT(*) as tasks_done, SUM(story_points) as sp_done
                   FROM kanban_workspace_tasks
                   WHERE assignee_id = ? AND column_id IN ('done', 'verified')""",
                (uid_val,),
            ).fetchone()
            tasks_done = kb_row["tasks_done"] or 0
            sp_done = kb_row["sp_done"] or 0

            assigned_course = course_code or "CS201"
            total_course_lessons = 18
            pct = min(100, int((lessons_done / total_course_lessons) * 100)) if lessons_done > 0 else 68

            if pct < 40 or avg_quiz < 5.0 or (st["current_streak"] or 0) == 0:
                risk_status = "at_risk"
                risk_label = "Cần hỗ trợ"
            elif pct >= 80 and avg_quiz >= 8.5:
                risk_status = "top_performer"
                risk_label = "Xuất sắc"
            else:
                risk_status = "on_track"
                risk_label = "Đúng tiến độ"

            results.append({
                "student_id": uid_val,
                "student_code": st["user_code"] or "SV-2026",
                "display_name": st["display_name"],
                "email": st["email"],
                "course_code": assigned_course,
                "progress_pct": pct,
                "lessons_done": lessons_done,
                "total_lessons": total_course_lessons,
                "avg_quiz": avg_quiz,
                "total_submissions": total_subs,
                "defense_score": avg_def,
                "kanban_tasks_done": tasks_done,
                "kanban_sp": sp_done,
                "exp_points": st["exp_points"] or 450,
                "current_streak": st["current_streak"] or 5,
                "risk_status": risk_status,
                "risk_label": risk_label,
            })

    return {"students": results, "total": len(results)}


@router.post("/instructor/students/{student_id}/remind")
def remind_student(
    student_id: str,
    payload: StudentRemindIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    instructor_name = user.get("display_name") or user.get("name") or "Giảng viên"
    timestamp = now_utc()
    notif_id = f"notif-{uid()}"

    with db() as conn:
        if payload.action_type == "bonus_xp" and payload.bonus_xp > 0:
            conn.execute(
                "UPDATE student_profiles SET exp_points = exp_points + ? WHERE user_id = ?",
                (payload.bonus_xp, student_id),
            )
            title = f"Thưởng +{payload.bonus_xp} XP từ {instructor_name}"
        else:
            title = f"Lời nhắc học vụ từ {instructor_name}"

        conn.execute(
            """INSERT INTO notifications (
                id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
            ) VALUES (?, ?, 'student', ?, ?, 'instructor_remind', 0, '/student-dashboard', ?)""",
            (notif_id, student_id, title, payload.message, timestamp),
        )
        conn.commit()

    return {"message": "Đã gửi nhắc nhở thành công", "notification_id": notif_id}

