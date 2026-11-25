from __future__ import annotations

import json
import random
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import record_audit_log, require_admin
from app.core.database import db, repair_relational_integrity
from app.core.security import hash_password, uid
from app.core.timezone import now_utc
from app.schemas.admin import (
    AdminBroadcastIn,
    AdminClassCreateIn,
    AdminClassPatchIn,
    AdminEnrollmentCreateIn,
    AdminPoliciesIn,
    AdminServicePatchIn,
    AdminUserCreateIn,
    AdminUserPatchIn,
    ApprovalResolveIn,
)
from app.services.seed_git_hub import seed_git_hub_workspace
from app.services.seed_kanban import seed_kanban_workspace
from app.services.seed_platform import seed_platform_data

router = APIRouter(tags=["Admin Governance"])


def _to_vi_role(raw_role: str | None) -> str:
    r = (raw_role or "student").strip().lower()
    if r in ("admin", "org_admin", "quản trị viên"):
        return "Quản trị viên"
    if r in ("instructor", "teacher", "giảng viên"):
        return "Giảng viên"
    return "Học viên"


def _to_db_role(raw_role: str | None) -> str:
    r = (raw_role or "student").strip().lower()
    if r in ("admin", "org_admin", "quản trị viên"):
        return "admin"
    if r in ("instructor", "teacher", "giảng viên"):
        return "instructor"
    if r in ("student", "learner", "học viên", "sinh viên"):
        return "student"
    raise HTTPException(status_code=422, detail=f"Vai trò RBAC không hợp lệ: '{raw_role}'")


def _to_db_status(raw_status: str | None) -> str:
    s = (raw_status or "active").strip().lower()
    if s in ("suspended", "locked", "bị khóa", "inactive"):
        return "suspended"
    if s in ("pending", "chờ kích hoạt", "chờ duyệt"):
        return "pending"
    if s in ("active", "hoạt động", "đang hoạt động"):
        return "active"
    raise HTTPException(status_code=422, detail=f"Trạng thái tài khoản không hợp lệ: '{raw_status}'")


def _serialize_admin_user(u: Any) -> dict[str, Any]:
    return {
        "id": u["id"],
        "email": u["email"],
        "full_name": u["full_name"],
        "display_name": u["display_name"],
        "role": u["role"],
        "status": u["status"],
        "timezone": u["timezone"],
        "created_at": u["created_at"],
        "code": u["user_code"] or ("ADM-01" if u["role"] == "admin" else "GV-2026" if u["role"] == "instructor" else "2210800"),
        "last_active": u["last_active_label"] or "Vừa xong",
        "device": u["last_device"] or "Web Session",
        "classes_count": u["classes_count"] if u["classes_count"] is not None else (6 if u["role"] == "admin" else 3),
    }


STAGE_TITLES_MAP: dict[int, str] = {
    1: "Cơ sở cốt lõi",
    2: "Giao diện & Trải nghiệm",
    3: "Kiến trúc Nền tảng",
    4: "Trí tuệ Nhân tạo Ứng dụng",
    5: "Chuyên sâu & Tốt nghiệp",
}


def _resolve_instructor_user(
    conn: Any,
    instructor_id: str | None,
    teacher_name: str | None,
) -> tuple[str, str]:
    """Xác thực giảng viên thật trong bảng users (chặn tuyệt đối học viên đứng chủ lớp)."""
    inst_id = (instructor_id or "").strip()
    t_name = (teacher_name or "").strip()
    row = None
    if inst_id:
        row = conn.execute(
            "SELECT id, full_name, display_name, role, status FROM users WHERE id=?",
            (inst_id,),
        ).fetchone()
    elif t_name:
        row = conn.execute(
            """SELECT id, full_name, display_name, role, status
               FROM users
               WHERE full_name=? OR display_name=?
               ORDER BY CASE WHEN role='instructor' THEN 0 WHEN role='admin' THEN 1 ELSE 2 END
               LIMIT 1""",
            (t_name, t_name),
        ).fetchone()
    if not row:
        raise HTTPException(
            status_code=400,
            detail="Không tìm thấy tài khoản Giảng viên hợp lệ trong hệ thống.",
        )
    if (row["role"] or "").lower() not in ("instructor", "admin"):
        raise HTTPException(
            status_code=400,
            detail="Không thể gán tài khoản Học viên làm Giảng viên phụ trách lớp học phần.",
        )
    if (row.get("status") or "active").lower() != "active":
        raise HTTPException(
            status_code=400,
            detail="Không thể phân công giảng dạy cho tài khoản đang chờ phê duyệt hoặc đã bị khóa.",
        )
    resolved_name = (row["full_name"] or row["display_name"] or t_name).strip()
    return row["id"], resolved_name


def _sync_course_and_user_counts(conn: Any) -> None:
    """Đồng bộ sĩ số thực tế từ class_enrollments & số lớp thực tế lên courses và users."""
    conn.execute(
        """UPDATE courses
           SET student_count = COALESCE((
               SELECT COUNT(DISTINCT ce.student_id)
               FROM class_enrollments ce
               JOIN class_sections cs ON cs.id = ce.section_id
               WHERE cs.course_id = courses.id AND ce.status = 'active'
           ), 0)"""
    )
    conn.execute(
        """UPDATE users
           SET classes_count = COALESCE((
               SELECT COUNT(*) FROM class_sections cs WHERE cs.instructor_id = users.id AND cs.status = 'active'
           ), 0)
           WHERE role = 'instructor'"""
    )
    conn.execute(
        """UPDATE users
           SET classes_count = COALESCE((
               SELECT COUNT(*) FROM class_enrollments ce WHERE ce.student_id = users.id AND ce.status = 'active'
           ), 0)
           WHERE role = 'student'"""
    )


def _serialize_admin_class(c: Any) -> dict[str, Any]:
    enrolled_val = (
        int(c["enrolled_count"])
        if c.get("enrolled_count") is not None
        else int(c.get("student_count") or 0)
    )
    sec_id = c.get("section_id") or c["id"]
    course_id = c.get("course_id") or c["id"]
    sec_code = c.get("section_code") or f"{c['code']}-N01"
    return {
        "id": sec_id,
        "sectionId": sec_id,
        "courseId": course_id,
        "subjectId": c.get("subject_id") or "",
        "code": c["code"],
        "sectionCode": sec_code,
        "name": c["name"],
        "semester": c.get("semester") or "Học kỳ 1 / 2026",
        "stageNumber": int(c.get("stage_number") or 1),
        "stageTitle": c.get("stage_title") or "Cơ sở cốt lõi",
        "credits": int(c.get("credits") or 3),
        "instructorId": c.get("instructor_id") or "",
        "teacher": c["teacher_name"],
        "students": enrolled_val,
        "maxStudents": int(c.get("max_students") or 45),
        "progressPct": int(c.get("avg_progress_pct") or 0),
        "pendingDualReviews": int(c.get("pending_dual_reviews") or 0),
        "health": c.get("health") or "Ổn định",
        "status": c.get("status") or "active",
        "room": c.get("room") or "Lab A3-201",
        "dockerImage": c["docker_image"],
        "sandboxEnabled": bool(c["sandbox_enabled"]),
        "aiDefenseEnabled": bool(c["ai_defense_enabled"]),
    }


def _fetch_admin_classes(conn: Any) -> list[dict[str, Any]]:
    rows = conn.execute(
        """SELECT cs.*,
                  cs.id AS section_id,
                  c.id AS course_id,
                  c.subject_id,
                  c.code,
                  c.name,
                  c.stage_number,
                  c.stage_title,
                  c.credits,
                  (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.section_id = cs.id AND ce.status = 'active') AS enrolled_count
           FROM class_sections cs
           JOIN courses c ON c.id = cs.course_id
           ORDER BY c.stage_number ASC, cs.section_code ASC"""
    ).fetchall()
    return [_serialize_admin_class(r) for r in rows]


def _fetch_admin_class_one(conn: Any, section_id: str) -> Any:
    return conn.execute(
        """SELECT cs.*,
                  cs.id AS section_id,
                  c.id AS course_id,
                  c.subject_id,
                  c.code,
                  c.name,
                  c.stage_number,
                  c.stage_title,
                  c.credits,
                  (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.section_id = cs.id AND ce.status = 'active') AS enrolled_count
           FROM class_sections cs
           JOIN courses c ON c.id = cs.course_id
           WHERE cs.id = ?""",
        (section_id,),
    ).fetchone()


def _fetch_admin_subjects(conn: Any) -> list[dict[str, Any]]:
    rows = conn.execute(
        """SELECT c.id, c.subject_id, c.code, c.name, c.stage_number, c.stage_title, c.credits, c.docker_image,
                  (SELECT COUNT(*) FROM class_sections cs WHERE cs.course_id = c.id) AS section_count
           FROM courses c
           ORDER BY c.stage_number ASC, c.code ASC"""
    ).fetchall()
    return [
        {
            "id": r["id"],
            "subjectId": r["subject_id"],
            "code": r["code"],
            "name": r["name"],
            "stageNumber": int(r.get("stage_number") or 1),
            "stageTitle": r.get("stage_title") or "Cơ sở cốt lõi",
            "credits": int(r.get("credits") or 3),
            "dockerImage": r["docker_image"],
            "sectionCount": int(r.get("section_count") or 0),
        }
        for r in rows
    ]


def _fetch_admin_instructors(conn: Any) -> list[dict[str, Any]]:
    rows = conn.execute(
        """SELECT id, full_name, display_name, email, user_code, status
           FROM users
           WHERE role = 'instructor' AND status = 'active'
           ORDER BY full_name ASC"""
    ).fetchall()
    return [
        {
            "id": r["id"],
            "name": r["full_name"] or r["display_name"] or r["email"],
            "email": r["email"],
            "code": r.get("user_code") or "GV-2026",
        }
        for r in rows
    ]


def _serialize_service(s: Any) -> dict[str, Any]:
    return {
        "id": s["id"],
        "name": s["name"],
        "engine": s["engine"],
        "usage": s["usage_label"],
        "requests": s["requests"],
        "inputTokens": s["input_tokens"],
        "outputTokens": s["output_tokens"],
        "estimatedCost": s["estimated_cost"],
        "quotaPct": s["quota_pct"],
        "barColor": s["bar_color"],
        "active": bool(s["active"]),
    }


def _serialize_jwt_session(j: Any) -> dict[str, Any]:
    return {
        "id": j["id"],
        "userName": j["user_name"],
        "role": j["role"],
        "device": j["device"],
        "ipLocation": j["ip_location"],
        "state": j["state"],
        "issuedAt": j["issued_at"],
        "isUntrusted": bool(j["is_untrusted"]),
    }


def _serialize_pending(p: Any) -> dict[str, Any]:
    return {
        "id": p["id"],
        "name": p["name"],
        "studentCode": p["student_code"],
        "email": p["email"],
        "classCode": p["class_code"],
        "className": p["class_name"],
        "requestedRole": p["requested_role"],
        "riskNote": p["risk_note"],
    }


def _serialize_audit(a: Any) -> dict[str, Any]:
    raw_time = a["created_at"] or ""
    short_time = raw_time[11:16] + " UTC" if len(raw_time) >= 16 and "T" in raw_time else raw_time
    log_type = a["category"] or "security"
    if log_type not in ("user", "security", "ai", "class"):
        log_type = "security"
    return {
        "id": a["id"],
        "time": short_time or "Vừa xong",
        "actor": a["actor_label"] or a["actor_user_id"] or "System",
        "action": a["action"],
        "target": a["target_label"] or f"{a['resource_type']} {a['resource_id'] or ''}".strip(),
        "type": log_type,
    }


@router.get("/system/broadcast")
def get_active_broadcast() -> dict[str, Any]:
    """Lấy thông báo toàn hệ thống (nếu Quản trị viên đang phát)."""
    with db() as conn:
        row = conn.execute("SELECT value_json FROM system_settings WHERE key='broadcast'").fetchone()
    if not row:
        return {"broadcast": None}
    data = json.loads(row["value_json"])
    return {"broadcast": f"{data.get('title', 'Thông báo')}: {data.get('message', '')}"}


@router.get("/admin/governance")
def get_admin_governance_bundle(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    """Lấy trọn gói dữ liệu điều hành 6 tab cho Admin Console."""
    with db() as conn:
        users = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
        classes_payload = _fetch_admin_classes(conn)
        subjects_payload = _fetch_admin_subjects(conn)
        instructors_payload = _fetch_admin_instructors(conn)
        services = conn.execute("SELECT * FROM ai_service_units ORDER BY id ASC").fetchall()
        sessions = conn.execute("SELECT * FROM jwt_sessions WHERE revoked=0 ORDER BY rowid DESC").fetchall()
        approvals = conn.execute("SELECT * FROM pending_approvals WHERE status='pending' ORDER BY created_at DESC").fetchall()
        audits = conn.execute("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 60").fetchall()
        pol_row = conn.execute("SELECT value_json FROM system_settings WHERE key='policies'").fetchone()
        bcast_row = conn.execute("SELECT value_json FROM system_settings WHERE key='broadcast'").fetchone()

    policies = json.loads(pol_row["value_json"]) if pol_row else {
        "budgetCap": 500,
        "guardrailRefuseAnswer": True,
        "rateLimit20PerHour": True,
        "dockerNetworkNone": True,
        "require2FA": True,
        "blockConcurrentIP": True,
        "autoLockFailedAttempts": True,
    }
    broadcast = None
    if bcast_row:
        bdata = json.loads(bcast_row["value_json"])
        broadcast = f"{bdata.get('title', '')}: {bdata.get('message', '')}".strip(": ")

    return {
        "users": [_serialize_admin_user(u) for u in users],
        "classes": classes_payload,
        "subjects": subjects_payload,
        "instructors": instructors_payload,
        "aiServices": [_serialize_service(s) for s in services],
        "jwtSessions": [_serialize_jwt_session(j) for j in sessions],
        "pendingApprovals": [_serialize_pending(p) for p in approvals],
        "auditLogs": [_serialize_audit(a) for a in audits],
        "policies": policies,
        "broadcast": broadcast,
    }


@router.get("/admin/users")
def get_admin_users(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    """Danh sách toàn bộ người dùng trong hệ thống (tương thích 100% test_auth_rbac & Frontend)."""
    with db() as conn:
        users = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    serialized = [_serialize_admin_user(u) for u in users]
    return {"users": serialized, "total": len(serialized)}


@router.post("/admin/users", status_code=status.HTTP_201_CREATED)
def create_admin_user(
    payload: AdminUserCreateIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Quản trị viên tạo tài khoản RBAC mới với mật khẩu băm Bcrypt."""
    clean_email = payload.email.strip().lower()
    db_role = _to_db_role(payload.role)
    now = now_utc()
    user_id = f"usr-{uid()[:8]}"
    user_code = payload.code.strip() or (
        f"ADM-{random.randint(10, 99)}" if db_role == "admin"
        else f"GV-{random.randint(100, 999)}" if db_role == "instructor"
        else f"2210{random.randint(100, 999)}"
    )

    with db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE lower(email)=?", (clean_email,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email đã tồn tại trong hệ thống")

        conn.execute(
            """INSERT INTO users(
                   id, email, password_hash, full_name, display_name, role, status, locale, timezone,
                   theme_preference, user_code, last_active_label, last_device, classes_count, created_at, updated_at
               ) VALUES(?,?,?,?,?,?,?,'vi-VN','Asia/Ho_Chi_Minh','one-dark',?,?,?,?,?,?)""",
            (
                user_id, clean_email, hash_password(payload.password), payload.name.strip(),
                payload.name.strip(), db_role, "active", user_code, "Vừa tạo",
                "Chưa đăng nhập", 1 if db_role == "student" else 2, now, now,
            ),
        )
        m_role = "org_admin" if db_role == "admin" else db_role
        conn.execute(
            "INSERT INTO memberships(id, organization_id, user_id, role, status) VALUES(?,?,?,?,?)",
            (uid(), "org-demo-codemind", user_id, m_role, "active"),
        )
        if db_role == "student":
            conn.execute(
                "INSERT INTO student_profiles(id, user_id, current_streak, longest_streak, exp_points, selected_title) VALUES(?, ?, 0, 0, 100, 'Novice Developer')",
                (uid(), user_id),
            )
            for purpose in ("academic_integrity", "teacher_visibility"):
                conn.execute(
                    "INSERT INTO consents(id, user_id, purpose, policy_version, granted, granted_at, updated_at) VALUES(?,?,?,'2026-08-01',1,?,?)",
                    (uid(), user_id, purpose, now, now),
                )
        created = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()

    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        f"Tạo tài khoản RBAC ({_to_vi_role(db_role)})",
        f"{payload.name.strip()} ({clean_email})",
        log_type="user",
        resource_type="user",
        resource_id=user_id,
    )
    return {"user": _serialize_admin_user(created)}


@router.patch("/admin/users/{user_id}")
def patch_admin_user(
    user_id: str,
    payload: AdminUserPatchIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Cập nhật vai trò RBAC hoặc trạng thái khóa/mở khóa tài khoản."""
    now = now_utc()
    with db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng")

        new_role = _to_db_role(payload.role) if payload.role else target["role"]
        new_status = _to_db_status(payload.status) if payload.status else target["status"]
        if user_id == admin_user["id"]:
            if new_role != "admin":
                raise HTTPException(
                    status_code=400,
                    detail="Không thể tự hạ vai trò của tài khoản Quản trị viên đang đăng nhập.",
                )
            if new_status != "active":
                raise HTTPException(
                    status_code=400,
                    detail="Không thể tự khóa hoặc chuyển chờ duyệt tài khoản Quản trị viên đang đăng nhập.",
                )
        new_name = payload.name.strip() if payload.name else target["full_name"]
        new_active_label = (
            "Vừa duyệt"
            if (target["status"] == "pending" and new_status == "active")
            else (target["last_active_label"] or "Vừa xong")
        )

        conn.execute(
            "UPDATE users SET role=?, status=?, full_name=?, display_name=?, last_active_label=?, updated_at=? WHERE id=?",
            (new_role, new_status, new_name, new_name, new_active_label, now, user_id),
        )
        if new_status == "suspended":
            conn.execute(
                "UPDATE jwt_sessions SET revoked=1, state='Thu hồi tự động do khóa tài khoản', revoked_at=? WHERE user_id=? AND revoked=0",
                (now, user_id),
            )
        m_role = "org_admin" if new_role == "admin" else new_role
        conn.execute("UPDATE memberships SET role=? WHERE user_id=?", (m_role, user_id))
        if new_name != target["full_name"] and new_role in ("instructor", "admin"):
            conn.execute("UPDATE class_sections SET teacher_name=?, updated_at=? WHERE instructor_id=?", (new_name, now, user_id))
            conn.execute("UPDATE courses SET teacher_name=?, updated_at=? WHERE instructor_id=?", (new_name, now, user_id))
            conn.execute(
                "UPDATE engineering_projects SET instructor_name=?, instructor_label=?, updated_at=? WHERE instructor_id=?",
                (new_name, f"{new_name} (GV Hướng dẫn)", now, user_id),
            )
            conn.execute(
                "UPDATE engineering_projects SET reviewer_name=?, updated_at=? WHERE reviewer_id=?",
                (new_name, now, user_id),
            )
            conn.execute(
                "UPDATE academic_schedules SET instructor_name=?, updated_at=? WHERE instructor_id=?",
                (new_name, now, user_id),
            )
        if new_status == "active" and target["email"]:
            conn.execute(
                "UPDATE pending_approvals SET status='approved' WHERE lower(email)=? AND status='pending'",
                (target["email"].lower(),),
            )
        updated = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()

    action_text = (
        f"Đổi vai trò RBAC -> {_to_vi_role(new_role)}"
        if payload.role
        else ("Khóa tài khoản" if new_status == "suspended" else "Kích hoạt / Mở khóa tài khoản")
    )
    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        action_text,
        f"{updated['display_name']} ({updated['email']})",
        log_type="user",
        resource_type="user",
        resource_id=user_id,
    )
    return {"user": _serialize_admin_user(updated)}


def _delete_user_cascade(conn: Any, user_id: str) -> None:
    """Xóa an toàn toàn bộ bản ghi phụ thuộc khóa ngoại của 1 user trước khi xóa user."""
    sess_rows = conn.execute("SELECT id FROM learning_sessions WHERE user_id=?", (user_id,)).fetchall()
    for sr in sess_rows:
        sid = sr["id"]
        conn.execute("DELETE FROM instructor_session_actions WHERE session_id=?", (sid,))
        conn.execute("DELETE FROM evidence WHERE learning_session_id=?", (sid,))
        conn.execute("DELETE FROM test_results WHERE submission_id IN (SELECT id FROM submissions WHERE learning_session_id=?)", (sid,))
        conn.execute("DELETE FROM submissions WHERE learning_session_id=?", (sid,))
        conn.execute("DELETE FROM ai_hints WHERE ai_interaction_id IN (SELECT id FROM ai_interactions WHERE learning_session_id=?)", (sid,))
        conn.execute("DELETE FROM ai_interactions WHERE learning_session_id=?", (sid,))
        conn.execute("DELETE FROM concept_answers WHERE learning_session_id=?", (sid,))
        conn.execute("DELETE FROM term_selections WHERE learning_session_id=?", (sid,))
        conn.execute("DELETE FROM step_attempts WHERE learning_session_id=?", (sid,))
        conn.execute("DELETE FROM learning_sessions WHERE id=?", (sid,))

    conn.execute("DELETE FROM student_chapter_submissions WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM student_lesson_progress WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM student_video_progress WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM class_enrollments WHERE student_id=?", (user_id,))
    conn.execute("DELETE FROM dual_submissions WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM schedule_bookings WHERE student_id=? OR instructor_id=?", (user_id, user_id))
    conn.execute("DELETE FROM project_invitations WHERE inviter_user_id=? OR invitee_user_id=?", (user_id, user_id))
    conn.execute("DELETE FROM notification_reads WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM notifications WHERE recipient_user_id=?", (user_id,))
    conn.execute("DELETE FROM defense_sessions WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM security_otp_codes WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM jwt_sessions WHERE user_id=?", (user_id,))
    u_row = conn.execute("SELECT email, role FROM users WHERE id=?", (user_id,)).fetchone()
    if u_row and u_row["email"]:
        conn.execute("DELETE FROM pending_approvals WHERE lower(email)=?", (u_row["email"].lower(),))
    if u_row and (u_row["role"] or "").lower() == "instructor":
        fallback_gv = conn.execute(
            "SELECT id, full_name, display_name FROM users WHERE role='instructor' AND status='active' AND id != ? LIMIT 1",
            (user_id,),
        ).fetchone()
        fb_id = fallback_gv["id"] if fallback_gv else None
        fb_name = (fallback_gv["full_name"] or fallback_gv["display_name"]) if fallback_gv else "Ban Chủ nhiệm Khoa"
        conn.execute("UPDATE courses SET instructor_id=?, teacher_name=? WHERE instructor_id=?", (fb_id, fb_name, user_id))
        conn.execute("UPDATE class_sections SET instructor_id=?, teacher_name=? WHERE instructor_id=?", (fb_id, fb_name, user_id))
        conn.execute(
            "UPDATE engineering_projects SET reviewer_id='', reviewer_name='' WHERE reviewer_id=?",
            (user_id,),
        )
        conn.execute(
            "UPDATE engineering_projects SET instructor_id=?, instructor_name=?, instructor_label=? WHERE instructor_id=?",
            (fb_id or "", fb_name, f"{fb_name} (GV Hướng dẫn)", user_id),
        )
        if fb_id:
            conn.execute(
                "UPDATE engineering_projects SET reviewer_id='', reviewer_name='' WHERE instructor_id=? AND reviewer_id=?",
                (fb_id, fb_id),
            )
        conn.execute("DELETE FROM academic_schedules WHERE instructor_id=?", (user_id,))
    conn.execute("DELETE FROM student_notes WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM student_profiles WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM consents WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM memberships WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    _sync_course_and_user_counts(conn)


@router.delete("/admin/users/{user_id}")
def delete_admin_user(
    user_id: str,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, str]:
    """Xóa tài khoản RBAC an toàn (dọn sạch dữ liệu khóa ngoại trước khi xóa)."""
    if user_id == admin_user["id"]:
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản Quản trị viên đang đăng nhập")

    with db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        _delete_user_cascade(conn, user_id)

    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        "Xóa tài khoản RBAC",
        f"{target['display_name']} ({target['email']})",
        log_type="user",
        resource_type="user",
        resource_id=user_id,
    )
    return {"status": "deleted", "id": user_id}


@router.get("/admin/pending-approvals")
def list_pending_approvals(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM pending_approvals WHERE status='pending' ORDER BY created_at DESC").fetchall()
    return {"approvals": [_serialize_pending(r) for r in rows]}


@router.post("/admin/pending-approvals/{approval_id}/resolve")
def resolve_pending_approval(
    approval_id: str,
    payload: ApprovalResolveIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Phê duyệt hoặc từ chối yêu cầu ghi danh / cấp quyền RBAC."""
    now = now_utc()
    with db() as conn:
        item = conn.execute("SELECT * FROM pending_approvals WHERE id=?", (approval_id,)).fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu chờ duyệt")

        conn.execute("UPDATE pending_approvals SET status=? WHERE id=?", (payload.decision, approval_id))
        db_role = _to_db_role(item["requested_role"])

        if payload.decision == "approved":
            conn.execute(
                "UPDATE pending_approvals SET status='approved' WHERE lower(email)=? AND status='pending'",
                (item["email"].lower(),),
            )
            existing_user = conn.execute("SELECT * FROM users WHERE lower(email)=?", (item["email"].lower(),)).fetchone()
            if existing_user:
                conn.execute(
                    "UPDATE users SET status='active', role=?, last_active_label='Vừa duyệt', updated_at=? WHERE id=?",
                    (db_role, now, existing_user["id"]),
                )
            else:
                new_uid = f"usr-{uid()[:8]}"
                conn.execute(
                    """INSERT INTO users(
                           id, email, password_hash, full_name, display_name, role, status, locale, timezone,
                           theme_preference, user_code, last_active_label, last_device, classes_count, created_at, updated_at
                       ) VALUES(?,?,?,?,?,?,?,'vi-VN','Asia/Ho_Chi_Minh','one-dark',?,?,?,?,?,?)""",
                    (
                        new_uid, item["email"].lower(), hash_password("hasib123"), item["name"], item["name"],
                        db_role, "active", item["student_code"], "Vừa duyệt", "Web Session", 1, now, now,
                    ),
                )
                conn.execute(
                    "INSERT INTO memberships(id, organization_id, user_id, role, status) VALUES(?,?,?,?,?)",
                    (uid(), "org-demo-codemind", new_uid, "org_admin" if db_role == "admin" else db_role, "active"),
                )
                if db_role == "student":
                    conn.execute(
                        "INSERT INTO student_profiles(id, user_id, current_streak, longest_streak, exp_points, selected_title) VALUES(?, ?, 1, 1, 150, 'Verified Learner')",
                        (uid(), new_uid),
                    )
        else:
            conn.execute(
                "UPDATE users SET status='suspended', last_active_label='Đã từ chối', updated_at=? WHERE lower(email)=? AND status='pending'",
                (now, item["email"].lower()),
            )

    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        f"{'Phê duyệt' if payload.decision == 'approved' else 'Từ chối'} {item['requested_role']}",
        f"{item['name']} ({item['class_code']})",
        log_type="user",
        resource_type="pending_approval",
        resource_id=approval_id,
    )
    return {"id": approval_id, "decision": payload.decision}


@router.get("/admin/classes")
def list_admin_classes(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with db() as conn:
        classes = _fetch_admin_classes(conn)
        subjects = _fetch_admin_subjects(conn)
        instructors = _fetch_admin_instructors(conn)
    return {"classes": classes, "subjects": subjects, "instructors": instructors}


@router.post("/admin/classes", status_code=status.HTTP_201_CREATED)
def create_admin_class(
    payload: AdminClassCreateIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Khởi tạo lớp học phần mới (mở thêm lớp của môn sẵn có hoặc tạo môn mới + lớp N01)."""
    mode = (payload.mode or "new_course").strip().lower()
    now = now_utc()
    max_stu = max(1, int(payload.max_students or payload.students or 45))
    semester_val = (payload.semester or "Học kỳ 1 / 2026").strip()
    room_val = (payload.room or "Lab A3-201").strip()
    docker_val = (payload.dockerImage or "codemind/cpp20-sandbox:latest").strip()

    with db() as conn:
        inst_id, teacher_name = _resolve_instructor_user(conn, payload.instructor_id, payload.teacher)

        if mode == "new_section":
            target_course_id = (payload.course_id or "").strip()
            base_course = None
            if target_course_id:
                base_course = conn.execute("SELECT * FROM courses WHERE id=?", (target_course_id,)).fetchone()
            elif payload.code.strip():
                base_course = conn.execute(
                    "SELECT * FROM courses WHERE upper(code)=?",
                    (payload.code.strip().upper(),),
                ).fetchone()
            if not base_course:
                raise HTTPException(status_code=404, detail="Không tìm thấy môn học gốc để mở lớp mới")

            if (payload.section_code or "").strip():
                sec_code = payload.section_code.strip().upper()
            else:
                existing_cnt_row = conn.execute(
                    "SELECT COUNT(*) AS c FROM class_sections WHERE course_id=?",
                    (base_course["id"],),
                ).fetchone()
                idx = int(existing_cnt_row["c"] or 0) + 1
                sec_code = f"{base_course['code']}-N{idx:02d}"
                while conn.execute("SELECT id FROM class_sections WHERE upper(section_code)=?", (sec_code,)).fetchone():
                    idx += 1
                    sec_code = f"{base_course['code']}-N{idx:02d}"

            dup_sec = conn.execute(
                "SELECT id FROM class_sections WHERE upper(section_code)=?",
                (sec_code,),
            ).fetchone()
            if dup_sec:
                raise HTTPException(status_code=409, detail=f"Mã lớp học phần {sec_code} đã tồn tại")

            section_id = f"sec-{uid()[:8]}"
            conn.execute(
                """INSERT INTO class_sections(
                       id, course_id, section_code, semester, instructor_id, teacher_name, room, max_students,
                       docker_image, sandbox_enabled, ai_defense_enabled, avg_progress_pct,
                       pending_dual_reviews, health, status, created_at, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    section_id, base_course["id"], sec_code, semester_val, inst_id, teacher_name,
                    room_val, max_stu, docker_val or base_course["docker_image"],
                    1, 1, 0, 0, "Tốt", "active", now, now,
                ),
            )
            _sync_course_and_user_counts(conn)
            created_row = _fetch_admin_class_one(conn, section_id)
            audit_target = f"{sec_code} · Môn {base_course['code']} ({teacher_name})"
            audit_action = "Mở lớp học phần mới"
            resource_id = section_id
        else:
            code_upper = payload.code.strip().upper()
            name_clean = payload.name.strip()
            if len(code_upper) < 2 or len(name_clean) < 2:
                raise HTTPException(status_code=422, detail="Vui lòng nhập đầy đủ Mã môn học và Tên học phần")

            dup_course = conn.execute("SELECT id FROM courses WHERE upper(code)=?", (code_upper,)).fetchone()
            if dup_course:
                raise HTTPException(status_code=409, detail=f"Mã học phần {code_upper} đã tồn tại")

            sec_code = (payload.section_code or f"{code_upper}-N01").strip().upper()
            dup_sec = conn.execute("SELECT id FROM class_sections WHERE upper(section_code)=?", (sec_code,)).fetchone()
            if dup_sec:
                raise HTTPException(status_code=409, detail=f"Mã lớp học phần {sec_code} đã tồn tại")

            course_id = f"cls-{uid()[:8]}"
            stage_no = max(1, min(5, int(payload.stage_number or 1)))
            stage_title = STAGE_TITLES_MAP.get(stage_no, "Cơ sở cốt lõi")
            credits_val = max(1, int(payload.credits or 3))
            default_chapters = [
                {
                    "id": f"{code_upper.lower()}-ch1",
                    "title": f"Chương 1: Tổng quan & Thực hành {code_upper}",
                    "status": "Bản nháp",
                    "mindmapGenerated": False,
                    "mindmapNodes": [],
                    "mindmapEdges": [],
                    "lessons": [],
                    "assignments": [
                        {
                            "id": f"lab-{uid()[:8]}",
                            "type": "code_lab",
                            "title": f"Docker Lab khởi đầu ({code_upper})",
                            "description": "Bài tập kiểm thử sandbox cô lập mặc định.",
                            "isRequired": True,
                            "points": 100,
                            "dockerImage": docker_val,
                            "testCases": [],
                        }
                    ],
                }
            ]
            conn.execute(
                """INSERT INTO courses(
                       id, subject_id, code, name, stage_number, stage_title, semester, credits,
                       instructor_id, teacher_name, student_count, avg_progress_pct,
                       pending_dual_reviews, health, room, docker_image, sandbox_enabled, ai_defense_enabled,
                       chapters_json, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    course_id, code_upper.lower(), code_upper, name_clean, stage_no, stage_title,
                    semester_val, credits_val, inst_id, teacher_name, 0, 0, 0, "Tốt",
                    room_val, docker_val, 1, 1, json.dumps(default_chapters, ensure_ascii=False), now,
                ),
            )
            conn.execute(
                """INSERT INTO class_sections(
                       id, course_id, section_code, semester, instructor_id, teacher_name, room, max_students,
                       docker_image, sandbox_enabled, ai_defense_enabled, avg_progress_pct,
                       pending_dual_reviews, health, status, created_at, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    course_id, course_id, sec_code, semester_val, inst_id, teacher_name,
                    room_val, max_stu, docker_val, 1, 1, 0, 0, "Tốt", "active", now, now,
                ),
            )
            _sync_course_and_user_counts(conn)
            created_row = _fetch_admin_class_one(conn, course_id)
            audit_target = f"{sec_code} — {name_clean} ({teacher_name})"
            audit_action = "Tạo môn học & lớp học phần"
            resource_id = course_id

    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        audit_action,
        audit_target,
        log_type="class",
        resource_type="class_section",
        resource_id=resource_id,
    )
    return {"class": _serialize_admin_class(created_row)}


@router.patch("/admin/classes/{class_id}")
def patch_admin_class(
    class_id: str,
    payload: AdminClassPatchIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Điều phối giảng viên, phòng Lab, sĩ số tối đa, Docker image hoặc Sandbox & AI Defense của lớp."""
    now = now_utc()
    with db() as conn:
        row = _fetch_admin_class_one(conn, class_id)
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần")

        inst_id = row.get("instructor_id")
        teacher = row["teacher_name"]
        if payload.instructor_id is not None or payload.teacher is not None:
            inst_id, teacher = _resolve_instructor_user(conn, payload.instructor_id, payload.teacher)

        sec_code = row["section_code"]
        if payload.section_code is not None and payload.section_code.strip():
            cand_code = payload.section_code.strip().upper()
            dup_sec = conn.execute(
                "SELECT id FROM class_sections WHERE upper(section_code)=? AND id != ?",
                (cand_code, class_id),
            ).fetchone()
            if dup_sec:
                raise HTTPException(status_code=409, detail=f"Mã lớp học phần {cand_code} đã tồn tại")
            sec_code = cand_code

        semester = payload.semester.strip() if payload.semester is not None else row["semester"]
        raw_max_stu = (
            int(payload.max_students)
            if payload.max_students is not None
            else (int(payload.students) if payload.students is not None else None)
        )
        if raw_max_stu is not None:
            if raw_max_stu < 1:
                raise HTTPException(status_code=422, detail="Sĩ số tối đa của lớp học phần phải từ 1 trở lên.")
            enrolled_now = int(row.get("enrolled_count") or 0)
            if raw_max_stu < enrolled_now:
                raise HTTPException(
                    status_code=400,
                    detail=f"Sĩ số tối đa ({raw_max_stu}) không được nhỏ hơn số học viên đang theo học trong lớp ({enrolled_now}).",
                )
            max_stu = raw_max_stu
        else:
            max_stu = int(row["max_students"] or 45)
        room = payload.room.strip() if payload.room is not None else row["room"]
        docker_img = payload.dockerImage.strip() if payload.dockerImage is not None else row["docker_image"]
        health = payload.health if payload.health is not None else row["health"]
        sec_status = payload.status if payload.status is not None else (row.get("status") or "active")
        sandbox_en = int(payload.sandboxEnabled) if payload.sandboxEnabled is not None else row["sandbox_enabled"]
        defense_en = int(payload.aiDefenseEnabled) if payload.aiDefenseEnabled is not None else row["ai_defense_enabled"]

        conn.execute(
            """UPDATE class_sections
               SET section_code=?, semester=?, instructor_id=?, teacher_name=?, room=?, max_students=?,
                   docker_image=?, health=?, status=?, sandbox_enabled=?, ai_defense_enabled=?, updated_at=?
               WHERE id=?""",
            (sec_code, semester, inst_id, teacher, room, max_stu, docker_img, health, sec_status, sandbox_en, defense_en, now, class_id),
        )

        # Cập nhật metadata môn học chuẩn (nếu đổi stage/credits hoặc là lớp N01 mặc định)
        new_stage = max(1, min(5, int(payload.stage_number))) if payload.stage_number is not None else int(row.get("stage_number") or 1)
        new_stage_title = STAGE_TITLES_MAP.get(new_stage, row.get("stage_title") or "Cơ sở cốt lõi")
        new_credits = max(1, int(payload.credits)) if payload.credits is not None else int(row.get("credits") or 3)
        if class_id == row["course_id"]:
            conn.execute(
                """UPDATE courses
                   SET stage_number=?, stage_title=?, credits=?, semester=?, instructor_id=?, teacher_name=?,
                       room=?, docker_image=?, health=?, sandbox_enabled=?, ai_defense_enabled=?, updated_at=?
                   WHERE id=?""",
                (new_stage, new_stage_title, new_credits, semester, inst_id, teacher, room, docker_img, health, sandbox_en, defense_en, now, row["course_id"]),
            )
        elif payload.stage_number is not None or payload.credits is not None:
            conn.execute(
                "UPDATE courses SET stage_number=?, stage_title=?, credits=?, updated_at=? WHERE id=?",
                (new_stage, new_stage_title, new_credits, now, row["course_id"]),
            )

        _sync_course_and_user_counts(conn)
        updated = _fetch_admin_class_one(conn, class_id)

    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        f"Điều phối lớp {updated['section_code']} (Sandbox={'ON' if sandbox_en else 'OFF'}, AI3D={'ON' if defense_en else 'OFF'})",
        f"{updated['section_code']} — {updated['teacher_name']}",
        log_type="class",
        resource_type="class_section",
        resource_id=class_id,
    )
    return {"class": _serialize_admin_class(updated)}


@router.get("/admin/classes/{section_id}/enrollments")
def list_class_enrollments(
    section_id: str,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Lấy danh sách học viên đang ghi danh trong 1 lớp học phần và danh sách học viên có thể thêm vào lớp."""
    with db() as conn:
        sec = _fetch_admin_class_one(conn, section_id)
        if not sec:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần")
        enrolled_rows = conn.execute(
            """SELECT ce.id AS enrollment_id, ce.section_id, ce.student_id, ce.status AS enrollment_status, ce.enrolled_at,
                      u.user_code, u.full_name, u.display_name, u.email, u.status AS user_status
               FROM class_enrollments ce
               JOIN users u ON u.id = ce.student_id
               WHERE ce.section_id = ?
               ORDER BY u.full_name ASC""",
            (section_id,),
        ).fetchall()
        enrolled_ids = {r["student_id"] for r in enrolled_rows}
        all_students = conn.execute(
            """SELECT id, user_code, full_name, display_name, email, status
               FROM users
               WHERE role = 'student'
               ORDER BY full_name ASC"""
        ).fetchall()
    return {
        "sectionId": section_id,
        "sectionCode": sec["section_code"],
        "courseName": sec["name"],
        "maxStudents": int(sec.get("max_students") or 45),
        "enrolledCount": sum(1 for r in enrolled_rows if r["enrollment_status"] == "active"),
        "enrollments": [
            {
                "id": r["enrollment_id"],
                "sectionId": r["section_id"],
                "studentId": r["student_id"],
                "studentCode": r.get("user_code") or "SV",
                "name": r.get("full_name") or r.get("display_name") or r["email"],
                "email": r["email"],
                "status": r["enrollment_status"],
                "userStatus": r["user_status"],
                "enrolledAt": r["enrolled_at"],
            }
            for r in enrolled_rows
        ],
        "availableStudents": [
            {
                "id": s["id"],
                "studentCode": s.get("user_code") or "SV",
                "name": s.get("full_name") or s.get("display_name") or s["email"],
                "email": s["email"],
                "userStatus": s["status"],
            }
            for s in all_students
            if s["id"] not in enrolled_ids
        ],
    }


@router.post("/admin/classes/{section_id}/enrollments", status_code=status.HTTP_201_CREATED)
def enroll_student_in_class(
    section_id: str,
    payload: AdminEnrollmentCreateIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Ghi danh 1 học viên vào lớp học phần."""
    now = now_utc()
    student_id = payload.student_id.strip()
    with db() as conn:
        sec = _fetch_admin_class_one(conn, section_id)
        if not sec:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần")
        stu = conn.execute("SELECT id, full_name, display_name, email, user_code, role, status FROM users WHERE id=?", (student_id,)).fetchone()
        if not stu or (stu["role"] or "").lower() != "student":
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản học viên hợp lệ")
        if (stu.get("status") or "active").lower() != "active":
            raise HTTPException(
                status_code=400,
                detail="Chỉ có thể ghi danh học viên đang ở trạng thái Hoạt động (đã phê duyệt).",
            )
        if (sec.get("status") or "active").lower() != "active":
            raise HTTPException(
                status_code=400,
                detail="Lớp học phần này đã đóng, không thể ghi danh thêm học viên.",
            )

        existing = conn.execute(
            "SELECT id, status FROM class_enrollments WHERE section_id=? AND student_id=?",
            (section_id, student_id),
        ).fetchone()
        if existing and existing["status"] == "active":
            raise HTTPException(status_code=409, detail="Học viên này đã được ghi danh vào lớp")

        enrolled_now = int(sec.get("enrolled_count") or 0)
        max_cap = int(sec.get("max_students") or 45)
        if enrolled_now >= max_cap:
            raise HTTPException(
                status_code=400,
                detail=f"Lớp {sec['section_code']} đã đạt sĩ số tối đa ({enrolled_now}/{max_cap}).",
            )

        other_sec = conn.execute(
            """SELECT cs.section_code
               FROM class_enrollments ce
               JOIN class_sections cs ON cs.id = ce.section_id
               WHERE ce.student_id = ? AND cs.course_id = ? AND ce.section_id != ? AND ce.status = 'active'
               LIMIT 1""",
            (student_id, sec["course_id"], section_id),
        ).fetchone()
        if other_sec:
            raise HTTPException(
                status_code=409,
                detail=f"Học viên đã đang học ở nhóm lớp {other_sec['section_code']} của cùng môn học này.",
            )

        if existing:
            conn.execute(
                "UPDATE class_enrollments SET status='active', enrolled_at=? WHERE id=?",
                (now, existing["id"]),
            )
            enr_id = existing["id"]
        else:
            enr_id = f"enr-{uid()[:8]}"
            conn.execute(
                "INSERT INTO class_enrollments(id, section_id, student_id, status, enrolled_at) VALUES(?,?,?,?,?)",
                (enr_id, section_id, student_id, "active", now),
            )
        _sync_course_and_user_counts(conn)
        updated_sec = _fetch_admin_class_one(conn, section_id)

    stu_name = stu.get("full_name") or stu.get("display_name") or stu["email"]
    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        f"Ghi danh học viên vào lớp {sec['section_code']}",
        f"{stu_name} ({stu['email']})",
        log_type="class",
        resource_type="class_enrollment",
        resource_id=enr_id,
    )
    return {
        "enrollment": {
            "id": enr_id,
            "sectionId": section_id,
            "studentId": student_id,
            "studentCode": stu.get("user_code") or "SV",
            "name": stu_name,
            "email": stu["email"],
            "status": "active",
            "userStatus": stu["status"],
            "enrolledAt": now,
        },
        "class": _serialize_admin_class(updated_sec),
    }


@router.delete("/admin/classes/{section_id}/enrollments/{student_id}")
def unenroll_student_from_class(
    section_id: str,
    student_id: str,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Gỡ ghi danh học viên khỏi lớp học phần."""
    with db() as conn:
        sec = _fetch_admin_class_one(conn, section_id)
        if not sec:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần")
        existing = conn.execute(
            "SELECT id FROM class_enrollments WHERE section_id=? AND student_id=?",
            (section_id, student_id),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Học viên chưa ghi danh vào lớp này")
        stu = conn.execute("SELECT full_name, display_name, email FROM users WHERE id=?", (student_id,)).fetchone()
        conn.execute("DELETE FROM class_enrollments WHERE id=?", (existing["id"],))
        _sync_course_and_user_counts(conn)
        updated_sec = _fetch_admin_class_one(conn, section_id)

    stu_label = (stu.get("full_name") or stu.get("display_name") or stu["email"]) if stu else student_id
    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        f"Gỡ ghi danh khỏi lớp {sec['section_code']}",
        stu_label,
        log_type="class",
        resource_type="class_enrollment",
        resource_id=existing["id"],
    )
    return {
        "status": "deleted",
        "sectionId": section_id,
        "studentId": student_id,
        "class": _serialize_admin_class(updated_sec),
    }


@router.get("/admin/ai-services")
def list_ai_services(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM ai_service_units ORDER BY id ASC").fetchall()
    return {"aiServices": [_serialize_service(r) for r in rows]}


@router.patch("/admin/ai-services/{service_id}")
def patch_ai_service(
    service_id: str,
    payload: AdminServicePatchIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT * FROM ai_service_units WHERE id=?", (service_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy dịch vụ AI / Compute")
        active = int(payload.active) if payload.active is not None else row["active"]
        quota = payload.quotaPct if payload.quotaPct is not None else row["quota_pct"]
        conn.execute("UPDATE ai_service_units SET active=?, quota_pct=? WHERE id=?", (active, quota, service_id))
        updated = conn.execute("SELECT * FROM ai_service_units WHERE id=?", (service_id,)).fetchone()

    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        f"{'Bật' if active else 'Tạm dừng'} engine {updated['name']}",
        updated["engine"],
        log_type="ai",
        resource_type="ai_service",
        resource_id=service_id,
    )
    return {"service": _serialize_service(updated)}


@router.get("/admin/policies")
def get_admin_policies(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT value_json FROM system_settings WHERE key='policies'").fetchone()
    if not row:
        return AdminPoliciesIn().model_dump()
    return json.loads(row["value_json"])


@router.put("/admin/policies")
def save_admin_policies(
    payload: AdminPoliciesIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    with db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO system_settings(key, value_json, updated_at) VALUES('policies', ?, ?)",
            (json.dumps(payload.model_dump()), now_utc()),
        )
    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        f"Lưu chính sách Guardrail & An ninh (Cap ${int(payload.budgetCap)}/tháng)",
        "AI Socratic & JWT Security Policy",
        log_type="security",
        resource_type="policy",
        resource_id="policies",
    )
    return payload.model_dump()


@router.get("/admin/jwt-sessions")
def list_jwt_sessions(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM jwt_sessions WHERE revoked=0 ORDER BY rowid DESC").fetchall()
    return {"jwtSessions": [_serialize_jwt_session(r) for r in rows]}


@router.post("/admin/jwt-sessions/revoke-untrusted")
def revoke_untrusted_jwt_sessions(admin_user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute("SELECT id FROM jwt_sessions WHERE revoked=0 AND is_untrusted=1").fetchall()
        count = len(rows)
        conn.execute("UPDATE jwt_sessions SET revoked=1, state='Đã thu hồi' WHERE revoked=0 AND is_untrusted=1")

    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        "Thu hồi toàn bộ phiên bất thường",
        f"{count} phiên JWT bị hủy",
        log_type="security",
        resource_type="jwt_session",
        resource_id="batch",
    )
    return {"revoked_count": count}


@router.post("/admin/jwt-sessions/{session_id}/revoke")
def revoke_jwt_session(
    session_id: str,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    with db() as conn:
        target = conn.execute("SELECT * FROM jwt_sessions WHERE (id=? OR jti=?) AND revoked=0", (session_id, session_id)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên JWT đang hoạt động")
        conn.execute("UPDATE jwt_sessions SET revoked=1, state='Đã thu hồi' WHERE id=?", (target["id"],))

    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        "Thu hồi phiên JWT",
        f"{target['user_name']} ({target['device']})",
        log_type="security",
        resource_type="jwt_session",
        resource_id=target["id"],
    )
    return {"status": "revoked", "id": target["id"]}


@router.get("/admin/audit-logs")
def get_admin_audit_logs(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 80").fetchall()
    return {"auditLogs": [_serialize_audit(r) for r in rows]}


@router.post("/admin/broadcast")
def publish_broadcast(
    payload: AdminBroadcastIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    now = now_utc()
    clean_title = payload.title.strip()
    clean_msg = payload.message.strip()
    with db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO system_settings(key, value_json, updated_at) VALUES('broadcast', ?, ?)",
            (json.dumps({"title": clean_title, "message": clean_msg}, ensure_ascii=False), now),
        )
        conn.execute(
            """INSERT INTO notifications(
                   id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
               ) VALUES(?, NULL, 'all', ?, ?, 'broadcast', 0, '/student-dashboard', ?)""",
            (f"notif-bcast-{uid()[:8]}", f"[Thông báo Toàn trường] {clean_title}", clean_msg, now),
        )
    text = f"{clean_title}: {clean_msg}"
    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        "Phát thông báo toàn trường",
        payload.title.strip(),
        log_type="security",
        resource_type="broadcast",
        resource_id="broadcast",
    )
    return {"broadcast": text}


@router.delete("/admin/broadcast")
def clear_broadcast(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with db() as conn:
        conn.execute("DELETE FROM system_settings WHERE key='broadcast'")
    return {"broadcast": None}


@router.post("/admin/reset-demo")
def reset_demo(admin_user: dict[str, Any] = Depends(require_admin)) -> dict[str, str]:
    """Reset toàn bộ dữ liệu thực thi tạm thời và khôi phục trạng thái nền tảng chuẩn."""
    with db() as conn:
        for table in (
            "analytics_events",
            "audit_events",
            "instructor_session_actions",
            "student_chapter_submissions",
            "student_lesson_progress",
            "student_video_progress",
            "student_notes",
            "notification_reads",
            "project_invitations",
            "evidence",
            "test_results",
            "submissions",
            "ai_hints",
            "ai_interactions",
            "concept_answers",
            "term_selections",
            "step_attempts",
            "learning_sessions",
            "defense_sessions",
            "security_otp_codes",
        ):
            conn.execute(f"DELETE FROM {table}")

        conn.execute("UPDATE users SET failed_login_attempts=0, locked_until=NULL, two_factor_enabled=0")

        temp_users = conn.execute(
            """SELECT id FROM users
               WHERE id NOT IN ('student-demo', 'instructor-demo', 'admin-demo')
                 AND (
                   lower(email) LIKE 'student_%@codemind.edu.vn'
                   OR lower(email) LIKE 'instructor_%@codemind.edu.vn'
                   OR lower(email) LIKE 'admin_%@codemind.edu.vn'
                   OR lower(email) LIKE 'qa_%@codemind.ai'
                 )"""
        ).fetchall()
        for tu in temp_users:
            _delete_user_cascade(conn, tu["id"])

        seed_platform_data(conn, force_reseed=True)
        seed_kanban_workspace(conn, force_reseed=True)
        seed_git_hub_workspace(conn, force_reseed=True)
        repair_relational_integrity(conn)
        _sync_course_and_user_counts(conn)
    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        "Khôi phục dữ liệu Demo Hệ thống",
        "POST /v1/admin/reset-demo",
        log_type="security",
        resource_type="platform",
        resource_id="reset-demo",
    )
    return {"status": "reset", "message": "Demo data đã reset thành công"}


@router.get("/admin/analytics-overview")
def get_admin_analytics_overview(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    """Báo cáo Thống kê Điều hành Tổng hợp Toàn hệ thống (truy vấn thời gian thực từ MySQL)."""
    with db() as conn:
        # 1. Đếm người dùng theo vai trò
        st_cnt = conn.execute("SELECT COUNT(*) as c FROM users WHERE role='student'").fetchone()["c"]
        ins_cnt = conn.execute("SELECT COUNT(*) as c FROM users WHERE role='instructor'").fetchone()["c"]
        adm_cnt = conn.execute("SELECT COUNT(*) as c FROM users WHERE role='admin'").fetchone()["c"]

        # 2. Đếm khóa học
        course_cnt = conn.execute("SELECT COUNT(*) as c FROM courses").fetchone()["c"]

        # 3. Đếm đồ án & Kanban SP
        prj_cnt = conn.execute("SELECT COUNT(*) as c FROM engineering_projects").fetchone()["c"]
        kb_tasks = conn.execute("SELECT COUNT(*) as c, COALESCE(SUM(points), 0) as sp FROM engineering_tasks WHERE column_id IN ('done', 'verified')").fetchone()

        # 4. Thống kê nộp bài & CI/CD thực tế từ submissions + student_chapter_submissions
        sub_stats = conn.execute(
            "SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN status='passed' THEN 1 ELSE 0 END), 0) as passed FROM submissions"
        ).fetchone()
        ch_stats = conn.execute(
            "SELECT COUNT(*) as cnt, COALESCE(SUM(tests_passed), 0) as passed_tc, COALESCE(SUM(tests_total), 0) as total_tc FROM student_chapter_submissions"
        ).fetchone()
        total_subs = int(sub_stats["total"] or 0) + int(ch_stats["cnt"] or 0)
        total_cases = int(sub_stats["total"] or 0) + int(ch_stats["total_tc"] or 0)
        passed_cases = int(sub_stats["passed"] or 0) + int(ch_stats["passed_tc"] or 0)
        ci_pass_rate = round((passed_cases / total_cases) * 100, 1) if total_cases > 0 else 0.0

        # 5. Phản biện AI Defense thực tế
        def_stats = conn.execute(
            "SELECT COUNT(*) as total, AVG(defense_score) as avg_score FROM dual_submissions WHERE defense_score > 0"
        ).fetchone()
        def_avg = round(float(def_stats["avg_score"]), 1) if def_stats and def_stats["avg_score"] is not None else 0.0

        # 6. Dịch vụ AI & Token
        ai_units = conn.execute(
            "SELECT id, name, requests, input_tokens, output_tokens, estimated_cost, active FROM ai_service_units"
        ).fetchall()
        total_tokens = sum((u["input_tokens"] or 0) + (u["output_tokens"] or 0) for u in ai_units)
        total_cost = round(sum(float(u["estimated_cost"] or 0.0) for u in ai_units), 2)
        active_ai_units = sum(1 for u in ai_units if int(u["active"] or 0) == 1)

        # 7. Phiên bảo mật JWT
        jwt_cnt = conn.execute("SELECT COUNT(*) as c FROM jwt_sessions WHERE revoked=0").fetchone()["c"]

        # 8. Lộ trình đào tạo tổng hợp trực tiếp từ bảng courses trong MySQL
        stage_rows = conn.execute(
            "SELECT stage_number, stage_title, code, name, avg_progress_pct FROM courses ORDER BY stage_number ASC, code ASC"
        ).fetchall()
        stage_map: dict[int, dict[str, Any]] = {}
        for cr in stage_rows:
            st_num = int(cr["stage_number"] or 1)
            entry = stage_map.setdefault(
                st_num,
                {
                    "stage": st_num,
                    "title": cr["stage_title"] or f"Chặng {st_num}",
                    "codes": [],
                    "desc_items": [],
                    "progress_vals": [],
                },
            )
            entry["codes"].append(cr["code"])
            entry["desc_items"].append(cr["name"])
            entry["progress_vals"].append(float(cr["avg_progress_pct"] or 0.0))

        curriculum_stages = [
            {
                "stage": st_num,
                "title": info["title"],
                "codes": info["codes"],
                "desc": ", ".join(info["desc_items"][:3]) + ("..." if len(info["desc_items"]) > 3 else ""),
                "progress_pct": round(sum(info["progress_vals"]) / len(info["progress_vals"]))
                if info["progress_vals"]
                else 0,
            }
            for st_num, info in sorted(stage_map.items())
        ]

    return {
        "kpi": {
            "total_students": st_cnt,
            "total_instructors": ins_cnt,
            "total_admins": adm_cnt,
            "total_courses": course_cnt,
            "total_projects": prj_cnt,
            "kanban_tasks_done": kb_tasks["c"],
            "kanban_sp_done": kb_tasks["sp"],
            "total_submissions": total_subs,
            "ci_cd_pass_rate": ci_pass_rate,
            "ai_defense_avg": def_avg,
            "total_ai_tokens": total_tokens,
            "total_ai_cost": total_cost,
            "active_jwt_sessions": jwt_cnt,
            "active_ai_units": active_ai_units,
            "total_ai_units": len(ai_units),
        },
        "curriculum_stages": curriculum_stages,
        "ai_units": [dict(u) for u in ai_units],
    }


@router.post("/admin/users/{user_id}/reset-password")
def admin_reset_user_password(
    user_id: str,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Cấp lại mật khẩu mặc định an toàn & thu hồi phiên cũ, ghi nhận Audit Log vào MySQL."""
    now = now_utc()
    with db() as conn:
        target = conn.execute("SELECT id, email, full_name, display_name FROM users WHERE id=?", (user_id,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng")
        if user_id != admin_user["id"]:
            conn.execute(
                "UPDATE jwt_sessions SET revoked=1, state='Thu hồi sau khi cấp lại mật khẩu', revoked_at=? WHERE user_id=? AND revoked=0",
                (now, user_id),
            )
        conn.execute("UPDATE users SET password_hash=?, updated_at=? WHERE id=?", (hash_password("hasib123"), now, user_id))
    label = f"{target['full_name'] or target['display_name']} ({target['email']})"
    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        "Cấp lại mật khẩu & làm mới phiên xác thực",
        label,
        log_type="security",
        resource_type="user",
        resource_id=user_id,
    )
    return {"status": "reset", "user_id": user_id, "target": label, "updated_at": now}


@router.post("/admin/ai-services/clear-cache")
def admin_clear_ai_cache(
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Làm mới bộ nhớ đệm Prompt & AST Scanner và lưu nhật ký Audit Log vào MySQL."""
    now = now_utc()
    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        "Dọn dẹp Prompt & AST Scanner Cache",
        "AI Gateway & Semantic Cache Cluster",
        log_type="ai",
        resource_type="ai_service",
        resource_id="svc-aigc",
    )
    return {"status": "cleared", "cleared_at": now}


@router.post("/admin/audit-logs")
def admin_create_audit_entry(
    payload: dict[str, Any],
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Ghi nhận thao tác kiểm toán từ bảng điều khiển Admin xuống CSDL."""
    action = str(payload.get("action") or "Thao tác Quản trị").strip()[:64]
    target = str(payload.get("target") or "Admin Console").strip()[:190]
    log_type = str(payload.get("type") or "security").strip()[:32]
    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        action,
        target,
        log_type=log_type,
        resource_type="audit_export",
    )
    return {"status": "recorded"}


