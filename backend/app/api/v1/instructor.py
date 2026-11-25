from __future__ import annotations

import json
import re
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import get_optional_current_user, record_audit_log, require_instructor
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
from app.services.gemini_client import record_ai_usage

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
def list_dual_submissions(
    section_id: str | None = None,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Danh sách biên bản Chấm Kép (Docker CI/CD + Phòng Phản Biện AI 3D) theo lớp GV phụ trách."""
    is_admin = (user.get("role") or "").lower() == "admin"
    with db() as conn:
        sql = """
            SELECT ds.*
            FROM dual_submissions ds
            LEFT JOIN class_sections cs ON cs.id = ds.class_id
            WHERE 1=1
        """
        params: list[Any] = []
        if section_id:
            target_sec = conn.execute(
                "SELECT id, course_id, instructor_id FROM class_sections WHERE id=?",
                (section_id,),
            ).fetchone()
            if not target_sec:
                raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần")
            if not is_admin and target_sec.get("instructor_id") != user["id"]:
                raise HTTPException(status_code=403, detail="Bạn không phụ trách lớp học phần này")
            sql += " AND (ds.class_id = ? OR ds.class_id = ?)"
            params.extend([target_sec["id"], target_sec["course_id"]])
        elif not is_admin:
            sql += " AND cs.instructor_id = ?"
            params.append(user["id"])
        sql += " ORDER BY ds.updated_at DESC, ds.id ASC"
        rows = conn.execute(sql, tuple(params)).fetchall()
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
    instructor_name = user.get("display_name") or user.get("full_name") or "Giảng viên"
    is_admin = (user.get("role") or "").lower() == "admin"
    with db() as conn:
        existing = conn.execute("SELECT * FROM dual_submissions WHERE id=?", (sub_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy biên bản chấm kép")
        if not is_admin:
            owns_dual = conn.execute(
                """SELECT cs.id FROM class_sections cs
                   WHERE (cs.id = ? OR cs.course_id = ?) AND cs.instructor_id = ?
                   LIMIT 1""",
                (existing["class_id"], existing["class_id"], user["id"]),
            ).fetchone()
            if not owns_dual:
                owns_course = conn.execute(
                    "SELECT id FROM courses WHERE id = ? AND instructor_id = ? LIMIT 1",
                    (existing["class_id"], user["id"]),
                ).fetchone()
                if not owns_course:
                    raise HTTPException(
                        status_code=403,
                        detail="Bạn không phụ trách lớp học phần của biên bản Chấm Kép này.",
                    )

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
        # Đồng bộ ngược 2 chiều sang bảng student_chapter_submissions nếu có liên kết
        ch_status = "graded" if new_status == "graded" else "revision_requested"
        ch_grade = round(new_score / 10.0, 1) if new_score is not None else None
        conn.execute(
            """UPDATE student_chapter_submissions
               SET status = ?, instructor_grade = ?, instructor_feedback = ?, graded_by = ?, graded_at = ?
               WHERE dual_submission_id = ?""",
            (ch_status, ch_grade, feedback, instructor_name, now, sub_id),
        )
        cnt_row = conn.execute(
            "SELECT COUNT(*) AS c FROM dual_submissions WHERE class_id=? AND status IN ('pending', 'flagged')",
            (existing["class_id"],),
        ).fetchone()
        pending_val = int(cnt_row["c"] or 0) if cnt_row else 0
        conn.execute(
            "UPDATE courses SET pending_dual_reviews = ? WHERE id=?",
            (pending_val, existing["class_id"]),
        )
        conn.execute(
            "UPDATE class_sections SET pending_dual_reviews = ? WHERE id=? OR course_id=?",
            (pending_val, existing["class_id"], existing["class_id"]),
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
    """Trợ giảng AI Co-Pilot hỗ trợ giảng viên thiết kế Docker Test Cases & Rubric qua Gemini."""
    course_code = "CS201"
    course_name = ""
    with db() as conn:
        svc = conn.execute("SELECT active FROM ai_service_units WHERE id='svc-aigc'").fetchone()
        if svc and not svc["active"]:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Dịch vụ AI Co-Pilot / AIGC hiện đang tạm dừng bởi Quản trị viên.",
            )
        from app.api.deps import load_system_policies
        policies = load_system_policies(conn)
        budget_cap = float(policies.get("budgetCap", 500.0) or 500.0)
        cost_row = conn.execute("SELECT COALESCE(SUM(estimated_cost), 0) AS total_cost FROM ai_service_units").fetchone()
        total_cost = float(cost_row["total_cost"] or 0.0) if cost_row else 0.0
        if total_cost >= budget_cap:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Ngân sách AI tháng (${total_cost:.2f}/${budget_cap:.0f}) đã chạm trần giới hạn do Quản trị viên cấu hình.",
            )
        if payload.class_id:
            row = conn.execute(
                """SELECT c.code, c.name
                   FROM class_sections cs
                   JOIN courses c ON c.id = cs.course_id
                   WHERE cs.id = ? OR c.id = ?""",
                (payload.class_id, payload.class_id),
            ).fetchone()
            if not row:
                row = conn.execute("SELECT code, name FROM courses WHERE id=?", (payload.class_id,)).fetchone()
            if row:
                course_code = row["code"]
                course_name = row["name"] or ""

    res = generate_copilot_suggestion(payload.prompt, course_code, course_name)

    in_tok = int(res.get("input_tokens") or 0)
    out_tok = int(res.get("output_tokens") or 0)
    with db() as conn:
        if in_tok > 0 or out_tok > 0:
            record_ai_usage(conn, "svc-aigc", in_tok, out_tok)
        else:
            conn.execute("UPDATE ai_service_units SET requests = requests + 1 WHERE id = 'svc-aigc'")
        conn.commit()
    return {"reply": res["reply"], "courseCode": course_code, "model": res["model"]}


class StudentRemindIn(BaseModel):
    message: str
    action_type: str = "socratic_hint"  # socratic_hint | bonus_xp | warn
    bonus_xp: int = 25


@router.get("/instructor/students-analytics")
def get_students_analytics(
    course_code: str | None = None,
    section_id: str | None = None,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Báo cáo Thống kê Học viên theo lớp học phần & danh sách ghi danh thực tế trong MySQL 8.0."""
    is_admin = (user.get("role") or "").lower() == "admin"
    with db() as conn:
        selected_section = None
        selected_course = None
        if section_id:
            selected_section = conn.execute(
                """SELECT cs.id AS section_id, cs.section_code, cs.instructor_id,
                          c.id AS course_id, c.code, c.subject_id, c.chapters_json
                   FROM class_sections cs
                   JOIN courses c ON c.id = cs.course_id
                   WHERE cs.id = ?""",
                (section_id,),
            ).fetchone()
            if not selected_section:
                raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần")
            if not is_admin and selected_section.get("instructor_id") != user["id"]:
                raise HTTPException(status_code=403, detail="Bạn không phụ trách lớp học phần này")
        elif course_code:
            sec_sql = """
                SELECT cs.id AS section_id, cs.section_code, cs.instructor_id,
                       c.id AS course_id, c.code, c.subject_id, c.chapters_json
                FROM class_sections cs
                JOIN courses c ON c.id = cs.course_id
                WHERE (cs.section_code = ? OR cs.id = ? OR c.code = ? OR c.id = ? OR c.subject_id = ?)
            """
            sec_params: list[Any] = [course_code, course_code, course_code, course_code, course_code]
            if not is_admin:
                sec_sql += " AND cs.instructor_id = ?"
                sec_params.append(user["id"])
            sec_sql += " ORDER BY cs.created_at ASC LIMIT 1"
            selected_section = conn.execute(sec_sql, tuple(sec_params)).fetchone()
            if not selected_section and not is_admin:
                other_sec = conn.execute(
                    """SELECT cs.id FROM class_sections cs
                       JOIN courses c ON c.id = cs.course_id
                       WHERE cs.section_code = ? OR cs.id = ? OR c.code = ? OR c.id = ? OR c.subject_id = ?""",
                    (course_code, course_code, course_code, course_code, course_code),
                ).fetchone()
                if other_sec:
                    raise HTTPException(status_code=403, detail="Bạn không phụ trách lớp học phần này")
            if not selected_section and is_admin:
                selected_course = conn.execute(
                    "SELECT id, code, subject_id, chapters_json FROM courses WHERE code = ? OR id = ? OR subject_id = ?",
                    (course_code, course_code, course_code),
                ).fetchone()

        target_section_id = selected_section["section_id"] if selected_section else None
        target_subject_id = (
            selected_section["subject_id"]
            if selected_section
            else (selected_course["subject_id"] if selected_course else None)
        )
        target_class_id = (
            selected_section["course_id"]
            if selected_section
            else (selected_course["id"] if selected_course else None)
        )
        assigned_course = (
            selected_section["section_code"]
            if selected_section
            else (selected_course["code"] if selected_course else (course_code or "ALL"))
        )
        chapters_source = selected_section or selected_course

        # Đếm tổng số bài học đã phát hành thực tế trong giáo trình & tập hợp mã hợp lệ
        total_course_lessons = 0
        published_lesson_keys: set[str] = set()
        published_keys_by_subject: dict[str, set[str]] = {}
        if chapters_source:
            subj_key = str(chapters_source.get("subject_id") or "")
            keys = published_keys_by_subject.setdefault(subj_key, set())
            try:
                for ch_idx, ch in enumerate(json.loads(chapters_source.get("chapters_json") or "[]"), start=1):
                    if ch.get("status") == "Bản nháp":
                        continue
                    pub_ls = [ls for ls in ch.get("lessons", []) if ls.get("status") != "Bản nháp"]
                    total_course_lessons += len(pub_ls)
                    for ls_idx, ls in enumerate(pub_ls, start=1):
                        lid = str(ls.get("id") or "").strip()
                        if lid:
                            published_lesson_keys.add(lid)
                            keys.add(lid)
                        m = re.match(r"^(\d+\.\d+)\b", str(ls.get("title") or "").strip())
                        if m:
                            published_lesson_keys.add(m.group(1))
                            keys.add(m.group(1))
                        code_fallback = f"{ch_idx}.{ls_idx}"
                        published_lesson_keys.add(code_fallback)
                        keys.add(code_fallback)
            except Exception:
                total_course_lessons = 0
        else:
            if is_admin:
                all_courses = conn.execute("SELECT subject_id, chapters_json FROM courses").fetchall()
            else:
                all_courses = conn.execute(
                    """SELECT DISTINCT c.subject_id, c.chapters_json
                       FROM class_sections cs
                       JOIN courses c ON c.id = cs.course_id
                       WHERE cs.instructor_id = ? AND cs.status = 'active'""",
                    (user["id"],),
                ).fetchall()
            for c in all_courses:
                subj_key = str(c.get("subject_id") or "")
                keys = published_keys_by_subject.setdefault(subj_key, set())
                try:
                    for ch_idx, ch in enumerate(json.loads(c.get("chapters_json") or "[]"), start=1):
                        if ch.get("status") == "Bản nháp":
                            continue
                        pub_ls = [ls for ls in ch.get("lessons", []) if ls.get("status") != "Bản nháp"]
                        total_course_lessons += len(pub_ls)
                        for ls_idx, ls in enumerate(pub_ls, start=1):
                            lid = str(ls.get("id") or "").strip()
                            if lid:
                                keys.add(lid)
                            m = re.match(r"^(\d+\.\d+)\b", str(ls.get("title") or "").strip())
                            if m:
                                keys.add(m.group(1))
                            keys.add(f"{ch_idx}.{ls_idx}")
                except Exception:
                    pass

        if target_section_id:
            st_rows = conn.execute(
                """SELECT DISTINCT u.id, u.user_code, u.full_name, u.display_name, u.email,
                          COALESCE(sp.exp_points, 0) AS exp_points,
                          COALESCE(sp.current_streak, 0) AS current_streak,
                          COALESCE(sp.longest_streak, 0) AS longest_streak
                   FROM class_enrollments ce
                   JOIN users u ON u.id = ce.student_id
                   LEFT JOIN student_profiles sp ON sp.user_id = u.id
                   WHERE ce.section_id = ? AND ce.status = 'active' AND u.role = 'student'
                   ORDER BY u.display_name ASC""",
                (target_section_id,),
            ).fetchall()
        elif not is_admin:
            st_rows = conn.execute(
                """SELECT DISTINCT u.id, u.user_code, u.full_name, u.display_name, u.email,
                          COALESCE(sp.exp_points, 0) AS exp_points,
                          COALESCE(sp.current_streak, 0) AS current_streak,
                          COALESCE(sp.longest_streak, 0) AS longest_streak
                   FROM class_enrollments ce
                   JOIN class_sections cs ON cs.id = ce.section_id
                   JOIN users u ON u.id = ce.student_id
                   LEFT JOIN student_profiles sp ON sp.user_id = u.id
                   WHERE cs.instructor_id = ? AND cs.status = 'active' AND ce.status = 'active' AND u.role = 'student'
                   ORDER BY u.display_name ASC""",
                (user["id"],),
            ).fetchall()
        else:
            st_rows = conn.execute(
                """SELECT u.id, u.user_code, u.full_name, u.display_name, u.email,
                          COALESCE(sp.exp_points, 0) AS exp_points,
                          COALESCE(sp.current_streak, 0) AS current_streak,
                          COALESCE(sp.longest_streak, 0) AS longest_streak
                   FROM users u
                   LEFT JOIN student_profiles sp ON sp.user_id = u.id
                   WHERE u.role = 'student'
                   ORDER BY u.display_name ASC"""
            ).fetchall()

        results = []
        for st in st_rows:
            uid_val = st["id"]
            code_val = st["user_code"] or ""
            display_name = st["display_name"] or st["full_name"] or "Học viên"

            # 1. Tiến độ bài học thực tế từ student_lesson_progress (khớp đúng bài đã phát hành)
            if target_subject_id:
                done_rows = conn.execute(
                    """SELECT DISTINCT lesson_id
                       FROM student_lesson_progress
                       WHERE user_id = ? AND subject_id = ?""",
                    (uid_val, target_subject_id),
                ).fetchall()
                prog_row = conn.execute(
                    """SELECT AVG(CASE WHEN quiz_total > 0 THEN (quiz_score * 10.0 / quiz_total) ELSE NULL END) AS avg_quiz_pct
                       FROM student_lesson_progress
                       WHERE user_id = ? AND subject_id = ?""",
                    (uid_val, target_subject_id),
                ).fetchone()
                if published_lesson_keys:
                    matched_done = sum(
                        1 for r in done_rows if str(r["lesson_id"]) in published_lesson_keys
                    )
                    lessons_done = min(total_course_lessons, matched_done)
                else:
                    lessons_done = (
                        min(total_course_lessons, len(done_rows))
                        if total_course_lessons > 0
                        else len(done_rows)
                    )
            else:
                done_rows = conn.execute(
                    """SELECT DISTINCT subject_id, lesson_id
                       FROM student_lesson_progress
                       WHERE user_id = ?""",
                    (uid_val,),
                ).fetchall()
                prog_row = conn.execute(
                    """SELECT AVG(CASE WHEN quiz_total > 0 THEN (quiz_score * 10.0 / quiz_total) ELSE NULL END) AS avg_quiz_pct
                       FROM student_lesson_progress
                       WHERE user_id = ?""",
                    (uid_val,),
                ).fetchone()
                matched_done = sum(
                    1
                    for r in done_rows
                    if str(r["lesson_id"]) in published_keys_by_subject.get(str(r["subject_id"]), set())
                )
                lessons_done = (
                    min(total_course_lessons, matched_done)
                    if total_course_lessons > 0
                    else len(done_rows)
                )

            pct = (
                min(100, round((lessons_done / total_course_lessons) * 100))
                if total_course_lessons > 0
                else 0
            )

            # 2. Điểm bài tập chương thực tế từ student_chapter_submissions
            sub_sql = """
                SELECT COUNT(*) AS total_subs,
                       AVG(COALESCE(instructor_grade, score)) AS avg_sub_score,
                       SUM(CASE WHEN status IN ('flagged', 'revision_requested') THEN 1 ELSE 0 END) AS flagged_subs
                FROM student_chapter_submissions
                WHERE user_id = ?
            """
            sub_params: list[Any] = [uid_val]
            if target_subject_id:
                sub_sql += " AND subject_id = ?"
                sub_params.append(target_subject_id)
            sub_row = conn.execute(sub_sql, tuple(sub_params)).fetchone()

            total_subs = int(sub_row["total_subs"] or 0) if sub_row else 0
            flagged_subs = int(sub_row["flagged_subs"] or 0) if sub_row else 0
            avg_sub_score = sub_row["avg_sub_score"] if sub_row else None
            if avg_sub_score is not None:
                avg_quiz = round(float(avg_sub_score), 1)
            elif prog_row and prog_row["avg_quiz_pct"] is not None:
                avg_quiz = round(float(prog_row["avg_quiz_pct"]), 1)
            else:
                avg_quiz = 0.0

            # 3. Điểm Phản biện AI 3D thật từ dual_submissions (chỉ tính các phiên đã phản biện)
            def_sql = """
                SELECT AVG(defense_score) AS avg_def,
                       SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged_dual
                FROM dual_submissions
                WHERE (user_id = ? OR student_code = ?)
                  AND defense_status != 'pending'
                  AND defense_score > 0
            """
            def_params: list[Any] = [uid_val, code_val]
            if target_section_id and target_class_id:
                def_sql += " AND (class_id = ? OR class_id = ?)"
                def_params.extend([target_section_id, target_class_id])
            elif target_class_id:
                def_sql += " AND class_id = ?"
                def_params.append(target_class_id)
            def_row = conn.execute(def_sql, tuple(def_params)).fetchone()
            avg_def = (
                round(float(def_row["avg_def"]), 1)
                if def_row and def_row["avg_def"] is not None
                else 0.0
            )
            flagged_dual = int(def_row["flagged_dual"] or 0) if def_row else 0

            # 4. Kanban Story Points thật
            kb_row = conn.execute(
                """SELECT COUNT(*) AS tasks_done, COALESCE(SUM(points), 0) AS sp_done
                   FROM engineering_tasks
                   WHERE assignee_user_id = ? AND column_id IN ('done', 'verified')""",
                (uid_val,),
            ).fetchone()
            tasks_done = int(kb_row["tasks_done"] or 0) if kb_row else 0
            sp_done = int(kb_row["sp_done"] or 0) if kb_row else 0
            exp_points = int(st["exp_points"] or 0)

            # 5. Đánh giá rủi ro động dựa hoàn toàn trên dữ liệu thật (không hardcode MSSV)
            if flagged_subs > 0 or flagged_dual > 0:
                risk_status = "at_risk"
                risk_label = "Cần kiểm tra bài nộp"
            elif total_subs > 0 and avg_quiz < 6.5:
                risk_status = "at_risk"
                risk_label = "Điểm thực hành < 6.5"
            elif lessons_done == 0 and total_subs == 0 and avg_def == 0 and tasks_done == 0:
                risk_status = "at_risk"
                risk_label = "Chưa bắt đầu học"
            elif (pct >= 70 or avg_def >= 85 or avg_quiz >= 8.5) and (
                avg_quiz >= 8.0 or avg_def >= 85 or exp_points >= 600
            ):
                risk_status = "top_performer"
                risk_label = "Xuất sắc"
            else:
                risk_status = "on_track"
                risk_label = "Đúng tiến độ"

            results.append({
                "student_id": uid_val,
                "student_code": code_val or "SV-2026",
                "display_name": display_name,
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
                "exp_points": exp_points,
                "current_streak": int(st["current_streak"] or 0),
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
    instructor_name = user.get("display_name") or user.get("full_name") or "Giảng viên"
    timestamp = now_utc()
    notif_id = f"notif-{uid()}"

    with db() as conn:
        student = conn.execute("SELECT id FROM users WHERE id = ?", (student_id,)).fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Không tìm thấy học viên")
        if payload.action_type == "bonus_xp" and payload.bonus_xp > 0:
            bonus = min(payload.bonus_xp, 200)
            prof = conn.execute("SELECT id FROM student_profiles WHERE user_id = ?", (student_id,)).fetchone()
            if not prof:
                conn.execute(
                    "INSERT INTO student_profiles(id, user_id, current_streak, longest_streak, exp_points) VALUES(?, ?, 0, 0, ?)",
                    (uid(), student_id, bonus),
                )
            else:
                conn.execute(
                    "UPDATE student_profiles SET exp_points = exp_points + ? WHERE user_id = ?",
                    (bonus, student_id),
                )
            title = f"Thưởng +{bonus} XP từ {instructor_name}"
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


class ChapterSubmissionGradeIn(BaseModel):
    action: str = Field(description="approve | override | request_revision")
    instructor_grade: float | None = Field(default=None, ge=0.0, le=10.0)
    instructor_feedback: str = Field(default="", max_length=1000)


@router.get("/instructor/chapter-submissions")
def list_chapter_submissions(
    subject_id: str | None = Query(default=None),
    section_id: str | None = Query(default=None),
    chapter_number: int | None = Query(default=None),
    status_filter: str = Query(default="all"),
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Danh sách bài tập thực hành theo từng chương để Giảng viên thẩm định & chấm điểm theo lớp phụ trách."""
    is_admin = (user.get("role") or "").lower() == "admin"
    with db() as conn:
        count = conn.execute("SELECT COUNT(*) as c FROM student_chapter_submissions").fetchone()["c"]
        if count == 0:
            sample_submissions = [
                ("chsub-01", "usr-sv-01", "Nguyễn Bá Hòa", "2210801", "oop", 1, "ex-ch1", "Đa hình & Cấu trúc vtable trong C++", "https://github.com/Hoaba-clouch/oop-vtable-cpp", "Cài đặt virtual method table thủ công qua void** function pointers và memory layout probe.", 9.5, 10.0, 5, 5, 32, 98.6, "graded", 9.5, "Kiến trúc con trỏ hàm chính xác, xử lý 0 memory leak.", "Cô Trần Thị B (Giảng viên)", "2026-11-18 10:30"),
                ("chsub-02", "usr-sv-03", "Võ Nhật Huy", "2210815", "oop", 1, "ex-ch1", "Đa hình & Cấu trúc vtable trong C++", "https://github.com/huy-fullstack/oop-vtable-solution", "Tách riêng header abstract base và concrete implementation.", 9.0, 10.0, 5, 5, 38, 97.2, "pending", None, "", "", "2026-11-18 14:15"),
                ("chsub-03", "usr-sv-04", "Phan Đình Nghị", "2210829", "oop", 1, "ex-ch1", "Đa hình & Cấu trúc vtable trong C++", "https://github.com/nghi-sys/cpp-oop-polymorphism", "Mô phỏng đa kế thừa và diamond problem bằng virtual inheritance.", 9.2, 10.0, 5, 5, 35, 96.8, "pending", None, "", "", "2026-11-18 15:20"),
                ("chsub-04", "usr-sv-08", "Trần Minh Tuấn", "2210877", "oop", 1, "ex-ch1", "Đa hình & Cấu trúc vtable trong C++", "https://github.com/tuan-arch/cpp-vtable-lab", "Thử nghiệm so sánh chi phí gọi hàm ảo dynamic dispatch vs direct call.", 8.5, 10.0, 4, 5, 42, 94.0, "flagged", None, "", "", "2026-11-18 16:00"),
                ("chsub-05", "usr-sv-05", "Nguyễn Minh Khôi", "2210866", "oop", 1, "ex-ch1", "Đa hình & Cấu trúc vtable trong C++", "https://github.com/khoi-dev/cpp-oop-ch1", "Gặp lỗi segmentation fault ở test case biên số 5.", 6.5, 10.0, 3, 5, 58, 89.5, "revision_requested", 6.5, "Test case biên số 5 bị crash (SIGSEGV). Yêu cầu bổ sung guard clause kiểm tra nullptr.", "Cô Trần Thị B (Giảng viên)", "2026-11-18 11:00"),
                ("chsub-06", "usr-sv-01", "Nguyễn Bá Hòa", "2210801", "oop", 2, "ex-ch2", "Quản lý Bộ nhớ & Smart Pointers (RAII)", "https://github.com/Hoaba-clouch/cpp-raii-smart-ptrs", "Cài đặt custom unique_ptr và shared_ptr với reference count thread-safe.", 9.8, 10.0, 6, 6, 28, 99.1, "pending", None, "", "", "2026-11-18 16:45"),
                ("chsub-07", "usr-sv-03", "Võ Nhật Huy", "2210815", "dsa", 1, "ex-dsa-ch1", "Đồ thị nâng cao & Thuật toán Dijkstra Heap", "https://github.com/huy-fullstack/dsa-dijkstra-fast", "Dijkstra với Min-Heap tối ưu thời gian O((V+E)logV).", 9.0, 10.0, 5, 5, 40, 96.5, "pending", None, "", "", "2026-11-18 17:10"),
                ("chsub-08", "usr-sv-04", "Phan Đình Nghị", "2210829", "web", 1, "ex-web-ch1", "FastAPI JWT Authentication & Role RBAC", "https://github.com/nghi-sys/fastapi-jwt-auth", "Bcrypt password hash và Access/Refresh token rotation.", 9.5, 10.0, 6, 6, 24, 98.4, "graded", 9.5, "Kiến trúc 3 tầng chuẩn, bảo mật tốt.", "Cô Trần Thị B (Giảng viên)", "2026-11-18 09:00"),
            ]
            for s in sample_submissions:
                rubric_sample = [
                    {"title": "Độ chính xác Test Cases Docker", "score": s[10], "max": 10, "note": f"Vượt qua {s[12]}/{s[13]} test cases."},
                    {"title": "Clean Architecture & Bộ nhớ", "score": s[10] - 0.5, "max": 10, "note": "0 memory leak, code clean."},
                ]
                ai_feedback_sample = {
                    "strengths": f"Bài làm vượt qua {s[12]}/{s[13]} test cases với thời gian {s[14]}ms.",
                    "improvements": "Có thể bổ sung thêm tài liệu Doxygen cho các public APIs.",
                }
                conn.execute(
                    """INSERT INTO student_chapter_submissions (
                        id, user_id, student_name, student_code, subject_id, chapter_number,
                        exercise_id, exercise_title, repo_url, student_note, score, max_score,
                        tests_passed, tests_total, execution_time_ms, anti_plagiarism_score,
                        status, instructor_grade, instructor_feedback, graded_by, graded_at,
                        rubric_json, ai_feedback_json, xp_awarded, submitted_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 100, ?)""",
                    (
                        s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9], s[10], s[11],
                        s[12], s[13], s[14], s[15], s[16], s[17], s[18], s[19], s[20],
                        json.dumps(rubric_sample, ensure_ascii=False),
                        json.dumps(ai_feedback_sample, ensure_ascii=False),
                        s[20],
                    ),
                )
            conn.commit()

        raw_key = (section_id or subject_id or "").strip()
        resolved_section_id: str | None = None
        resolved_subject_id: str | None = None
        resolved_course_id: str | None = None

        if raw_key:
            sec_exact = conn.execute(
                """SELECT cs.id AS section_id, cs.instructor_id, c.id AS course_id, c.subject_id
                   FROM class_sections cs
                   JOIN courses c ON c.id = cs.course_id
                   WHERE cs.id = ? OR cs.section_code = ?
                   LIMIT 1""",
                (raw_key, raw_key),
            ).fetchone()
            if sec_exact:
                if not is_admin and sec_exact["instructor_id"] != user["id"]:
                    raise HTTPException(status_code=403, detail="Bạn không phụ trách lớp học phần này.")
                resolved_section_id = sec_exact["section_id"]
                resolved_subject_id = sec_exact["subject_id"]
                resolved_course_id = sec_exact["course_id"]
            else:
                c_row = conn.execute(
                    "SELECT id, subject_id, code FROM courses WHERE id = ? OR subject_id = ? OR code = ? LIMIT 1",
                    (raw_key, raw_key, raw_key),
                ).fetchone()
                if c_row:
                    resolved_subject_id = c_row["subject_id"]
                    resolved_course_id = c_row["id"]
                    if not is_admin:
                        my_sec = conn.execute(
                            "SELECT id FROM class_sections WHERE course_id = ? AND instructor_id = ? AND status = 'active' LIMIT 1",
                            (c_row["id"], user["id"]),
                        ).fetchone()
                        if not my_sec:
                            raise HTTPException(
                                status_code=403,
                                detail="Bạn không phụ trách lớp học phần nào thuộc môn học này.",
                            )
                        resolved_section_id = my_sec["id"]
                else:
                    resolved_subject_id = raw_key

        where_sql = " WHERE 1=1"
        base_params: list[Any] = []
        if resolved_subject_id:
            if resolved_course_id:
                where_sql += " AND (subject_id = ? OR subject_id = ?)"
                base_params.extend([resolved_subject_id, resolved_course_id])
            else:
                where_sql += " AND subject_id = ?"
                base_params.append(resolved_subject_id)

        if resolved_section_id:
            where_sql += " AND user_id IN (SELECT student_id FROM class_enrollments WHERE section_id = ? AND status = 'active')"
            base_params.append(resolved_section_id)
        elif not is_admin:
            where_sql += """
                AND EXISTS (
                    SELECT 1 FROM class_enrollments ce
                    JOIN class_sections cs ON cs.id = ce.section_id
                    JOIN courses c ON c.id = cs.course_id
                    WHERE ce.student_id = student_chapter_submissions.user_id
                      AND ce.status = 'active'
                      AND cs.status = 'active'
                      AND cs.instructor_id = ?
                      AND (c.subject_id = student_chapter_submissions.subject_id OR c.id = student_chapter_submissions.subject_id)
                )
            """
            base_params.append(user["id"])

        if chapter_number is not None:
            where_sql += " AND chapter_number = ?"
            base_params.append(chapter_number)

        query = "SELECT * FROM student_chapter_submissions" + where_sql
        query_params = list(base_params)
        if status_filter and status_filter != "all":
            query += " AND status = ?"
            query_params.append(status_filter)

        query += " ORDER BY submitted_at DESC, id DESC"
        rows = conn.execute(query, tuple(query_params)).fetchall()

        total_q = (
            "SELECT COUNT(*) as total, "
            "SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending_c, "
            "SUM(CASE WHEN status='graded' THEN 1 ELSE 0 END) as graded_c, "
            "SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END) as flagged_c, "
            "AVG(score) as avg_score "
            "FROM student_chapter_submissions" + where_sql
        )
        stat_row = conn.execute(total_q, tuple(base_params)).fetchone()

    items = []
    for r in rows:
        items.append({
            "id": r["id"],
            "userId": r["user_id"],
            "studentName": r["student_name"] or "Học viên",
            "studentCode": r["student_code"] or "",
            "subjectId": r["subject_id"],
            "chapterNumber": r["chapter_number"],
            "exerciseId": r["exercise_id"],
            "exerciseTitle": r["exercise_title"],
            "repoUrl": r["repo_url"],
            "studentNote": r["student_note"],
            "aiScore": r["score"],
            "maxScore": r["max_score"] or 10.0,
            "testsPassed": r["tests_passed"],
            "testsTotal": r["tests_total"],
            "executionTimeMs": r["execution_time_ms"],
            "antiPlagiarismScore": r["anti_plagiarism_score"],
            "status": r["status"] or "pending",
            "instructorGrade": r["instructor_grade"],
            "instructorFeedback": r["instructor_feedback"] or "",
            "gradedBy": r["graded_by"] or "",
            "gradedAt": r["graded_at"] or "",
            "rubric": json.loads(r["rubric_json"] or "[]"),
            "aiFeedback": json.loads(r["ai_feedback_json"] or "{}"),
            "submittedAt": r["submitted_at"],
        })

    return {
        "submissions": items,
        "total": stat_row["total"] if stat_row else len(items),
        "pendingCount": int(stat_row["pending_c"] or 0) if stat_row else 0,
        "gradedCount": int(stat_row["graded_c"] or 0) if stat_row else 0,
        "flaggedCount": int(stat_row["flagged_c"] or 0) if stat_row else 0,
        "avgScore": round(float(stat_row["avg_score"] or 0), 1) if stat_row else 0,
    }


@router.patch("/instructor/chapter-submissions/{sub_id}/grade")
def grade_chapter_submission(
    sub_id: str,
    payload: ChapterSubmissionGradeIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Giảng viên phê duyệt điểm AI, chấm lại ghi đè điểm hoặc yêu cầu học viên nộp lại bài tập chương."""
    now = now_utc()
    instructor_name = user.get("display_name") or user.get("full_name") or "Giảng viên"
    is_admin = (user.get("role") or "").lower() == "admin"

    with db() as conn:
        existing = conn.execute("SELECT * FROM student_chapter_submissions WHERE id = ?", (sub_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài nộp chương.")
        if not is_admin:
            teaches_student = conn.execute(
                """SELECT cs.id
                   FROM class_enrollments ce
                   JOIN class_sections cs ON cs.id = ce.section_id
                   JOIN courses c ON c.id = cs.course_id
                   WHERE ce.student_id = ?
                     AND ce.status = 'active'
                     AND cs.status = 'active'
                     AND cs.instructor_id = ?
                     AND (c.subject_id = ? OR c.id = ?)
                   LIMIT 1""",
                (existing["user_id"], user["id"], existing["subject_id"], existing["subject_id"]),
            ).fetchone()
            if not teaches_student:
                raise HTTPException(
                    status_code=403,
                    detail="Bạn không phụ trách lớp học phần của học viên này nên không có quyền chấm bài tập chương.",
                )

        if payload.action == "approve":
            new_status = "graded"
            final_grade = existing["score"]
            feedback = payload.instructor_feedback.strip() or "Đã phê duyệt nghiệm thu theo điểm kiểm thử Docker AI."
            audit_msg = f"Phê duyệt bài tập chương {final_grade}/10"
        elif payload.action == "override":
            if payload.instructor_grade is None:
                raise HTTPException(status_code=422, detail="Vui lòng nhập điểm giảng viên (thang điểm 10).")
            new_status = "graded"
            final_grade = payload.instructor_grade
            feedback = payload.instructor_feedback.strip() or f"Giảng viên chấm trực tiếp: {final_grade}/10."
            audit_msg = f"Ghi đè điểm bài tập chương {final_grade}/10"
        elif payload.action == "request_revision":
            if not payload.instructor_feedback.strip():
                raise HTTPException(status_code=422, detail="Vui lòng nhập nhận xét / lý do yêu cầu nộp lại.")
            new_status = "revision_requested"
            final_grade = existing["instructor_grade"]
            feedback = payload.instructor_feedback.strip()
            audit_msg = "Yêu cầu sửa & nộp lại bài tập chương"
        else:
            raise HTTPException(status_code=400, detail="Hành động không hợp lệ.")

        conn.execute(
            """UPDATE student_chapter_submissions
               SET status = ?, instructor_grade = ?, instructor_feedback = ?, graded_by = ?, graded_at = ?
               WHERE id = ?""",
            (new_status, final_grade, feedback, instructor_name, now, sub_id),
        )

        # Đồng bộ 2 chiều sang bảng dual_submissions và pending_dual_reviews của lớp
        if existing["dual_submission_id"]:
            dual_stat = "graded" if new_status == "graded" else "pending"
            dual_score = int(round(final_grade * 10)) if final_grade is not None else None
            conn.execute(
                "UPDATE dual_submissions SET status = ?, final_score = ?, instructor_feedback = ?, updated_at = ? WHERE id = ?",
                (dual_stat, dual_score, feedback, now, existing["dual_submission_id"]),
            )
            dual_row = conn.execute(
                "SELECT class_id FROM dual_submissions WHERE id = ?",
                (existing["dual_submission_id"],),
            ).fetchone()
            if dual_row and dual_row.get("class_id"):
                cnt_row = conn.execute(
                    "SELECT COUNT(*) AS c FROM dual_submissions WHERE class_id=? AND status IN ('pending', 'flagged')",
                    (dual_row["class_id"],),
                ).fetchone()
                pending_val = int(cnt_row["c"] or 0) if cnt_row else 0
                conn.execute(
                    "UPDATE courses SET pending_dual_reviews = ? WHERE id = ?",
                    (pending_val, dual_row["class_id"]),
                )
                conn.execute(
                    "UPDATE class_sections SET pending_dual_reviews = ? WHERE id = ? OR course_id = ?",
                    (pending_val, dual_row["class_id"], dual_row["class_id"]),
                )

        # Gửi thông báo đến học viên
        notif_id = f"notif-grade-{uid()}"
        notif_title = f"Bài tập Chương {existing['chapter_number']} đã được Giảng viên chấm: {final_grade}/10" if new_status == 'graded' else f"Yêu cầu làm lại Bài tập Chương {existing['chapter_number']}"
        conn.execute(
            """INSERT INTO notifications (
                id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
            ) VALUES (?, ?, 'student', ?, ?, 'chapter_grade', 0, '/student-dashboard', ?)""",
            (notif_id, existing["user_id"], notif_title, feedback, now),
        )

        updated = conn.execute("SELECT * FROM student_chapter_submissions WHERE id = ?", (sub_id,)).fetchone()
        conn.commit()

    record_audit_log(
        instructor_name,
        user["id"],
        audit_msg,
        f"{existing['student_name']} - Chương {existing['chapter_number']}: {existing['exercise_title']}",
        log_type="class",
        resource_type="chapter_submission",
        resource_id=sub_id,
    )

    return {
        "success": True,
        "submission": {
            "id": updated["id"],
            "status": updated["status"],
            "instructorGrade": updated["instructor_grade"],
            "instructorFeedback": updated["instructor_feedback"],
            "gradedBy": updated["graded_by"],
            "gradedAt": updated["graded_at"],
        },
    }

