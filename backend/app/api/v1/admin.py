from __future__ import annotations

import json
import random
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import record_audit_log, require_admin
from app.core.database import db
from app.core.security import hash_password, uid
from app.core.timezone import now_utc
from app.schemas.admin import (
    AdminBroadcastIn,
    AdminClassCreateIn,
    AdminClassPatchIn,
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
    return "student"


def _to_db_status(raw_status: str | None) -> str:
    s = (raw_status or "active").strip().lower()
    if s in ("suspended", "locked", "bị khóa"):
        return "suspended"
    if s in ("pending", "chờ kích hoạt"):
        return "pending"
    return "active"


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


def _serialize_admin_class(c: Any) -> dict[str, Any]:
    return {
        "id": c["id"],
        "code": c["code"],
        "name": c["name"],
        "teacher": c["teacher_name"],
        "students": c["student_count"],
        "progressPct": c["avg_progress_pct"],
        "pendingDualReviews": c["pending_dual_reviews"],
        "health": c["health"],
        "room": c["room"],
        "dockerImage": c["docker_image"],
        "sandboxEnabled": bool(c["sandbox_enabled"]),
        "aiDefenseEnabled": bool(c["ai_defense_enabled"]),
    }


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
        courses = conn.execute("SELECT * FROM courses ORDER BY code ASC").fetchall()
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
        "classes": [_serialize_admin_class(c) for c in courses],
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
        new_name = payload.name.strip() if payload.name else target["full_name"]

        conn.execute(
            "UPDATE users SET role=?, status=?, full_name=?, display_name=?, updated_at=? WHERE id=?",
            (new_role, new_status, new_name, new_name, now, user_id),
        )
        m_role = "org_admin" if new_role == "admin" else new_role
        conn.execute("UPDATE memberships SET role=? WHERE user_id=?", (m_role, user_id))
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
    conn.execute("DELETE FROM defense_sessions WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM security_otp_codes WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM jwt_sessions WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM student_notes WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM student_profiles WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM consents WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM memberships WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))


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
        rows = conn.execute("SELECT * FROM courses ORDER BY code ASC").fetchall()
    return {"classes": [_serialize_admin_class(r) for r in rows]}


@router.post("/admin/classes", status_code=status.HTTP_201_CREATED)
def create_admin_class(
    payload: AdminClassCreateIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Khởi tạo học phần mới dùng chung giữa Admin, Instructor và Student."""
    code_upper = payload.code.strip().upper()
    class_id = f"cls-{uid()[:8]}"
    now = now_utc()
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
                    "dockerImage": payload.dockerImage,
                    "testCases": [],
                }
            ],
        }
    ]
    with db() as conn:
        dup = conn.execute("SELECT id FROM courses WHERE upper(code)=?", (code_upper,)).fetchone()
        if dup:
            raise HTTPException(status_code=400, detail=f"Mã học phần {code_upper} đã tồn tại")
        conn.execute(
            """INSERT INTO courses(
                   id, subject_id, code, name, semester, teacher_name, student_count, avg_progress_pct,
                   pending_dual_reviews, health, room, docker_image, sandbox_enabled, ai_defense_enabled,
                   chapters_json, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                class_id, code_upper.lower(), code_upper, payload.name.strip(), "Học kỳ 1 / 2026",
                payload.teacher.strip(), payload.students, 0, 0, "Tốt", payload.room.strip(),
                payload.dockerImage.strip(), 1, 1, json.dumps(default_chapters, ensure_ascii=False), now,
            ),
        )
        created = conn.execute("SELECT * FROM courses WHERE id=?", (class_id,)).fetchone()

    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        "Tạo lớp học phần",
        f"{code_upper} ({payload.teacher})",
        log_type="class",
        resource_type="course",
        resource_id=class_id,
    )
    return {"class": _serialize_admin_class(created)}


@router.patch("/admin/classes/{class_id}")
def patch_admin_class(
    class_id: str,
    payload: AdminClassPatchIn,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Điều phối giảng viên, Docker Runner image hoặc bật/tắt Sandbox & AI Defense."""
    now = now_utc()
    with db() as conn:
        row = conn.execute("SELECT * FROM courses WHERE id=?", (class_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy học phần")

        teacher = payload.teacher.strip() if payload.teacher is not None else row["teacher_name"]
        students = payload.students if payload.students is not None else row["student_count"]
        room = payload.room.strip() if payload.room is not None else row["room"]
        docker_img = payload.dockerImage.strip() if payload.dockerImage is not None else row["docker_image"]
        health = payload.health if payload.health is not None else row["health"]
        sandbox_en = int(payload.sandboxEnabled) if payload.sandboxEnabled is not None else row["sandbox_enabled"]
        defense_en = int(payload.aiDefenseEnabled) if payload.aiDefenseEnabled is not None else row["ai_defense_enabled"]

        conn.execute(
            """UPDATE courses
               SET teacher_name=?, student_count=?, room=?, docker_image=?, health=?,
                   sandbox_enabled=?, ai_defense_enabled=?, updated_at=?
               WHERE id=?""",
            (teacher, students, room, docker_img, health, sandbox_en, defense_en, now, class_id),
        )
        updated = conn.execute("SELECT * FROM courses WHERE id=?", (class_id,)).fetchone()

    record_audit_log(
        admin_user.get("full_name") or admin_user.get("display_name") or "Admin AIO",
        admin_user["id"],
        f"Điều phối học phần {updated['code']} (Sandbox={'ON' if sandbox_en else 'OFF'}, AI3D={'ON' if defense_en else 'OFF'})",
        f"{updated['code']} — {updated['teacher_name']}",
        log_type="class",
        resource_type="course",
        resource_id=class_id,
    )
    return {"class": _serialize_admin_class(updated)}


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
    with db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO system_settings(key, value_json, updated_at) VALUES('broadcast', ?, ?)",
            (json.dumps({"title": payload.title.strip(), "message": payload.message.strip()}, ensure_ascii=False), now_utc()),
        )
    text = f"{payload.title.strip()}: {payload.message.strip()}"
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
            "student_notes",
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
