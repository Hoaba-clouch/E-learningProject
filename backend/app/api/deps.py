from __future__ import annotations

import json
from typing import Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from app.core.database import db, row_dict
from app.core.security import TOKENS, decode_token, sha256, uid
from app.core.timezone import now_utc

security = HTTPBearer(auto_error=False)

DEFAULT_SYSTEM_POLICIES: dict[str, Any] = {
    "budgetCap": 500.0,
    "guardrailRefuseAnswer": True,
    "rateLimit20PerHour": True,
    "dockerNetworkNone": True,
    "require2FA": False,
    "blockConcurrentIP": True,
    "autoLockFailedAttempts": True,
}


def load_system_policies(conn: Any) -> dict[str, Any]:
    """Đọc cấu hình chính sách An ninh & AI Guardrail từ bảng system_settings."""
    merged = dict(DEFAULT_SYSTEM_POLICIES)
    row = conn.execute("SELECT value_json FROM system_settings WHERE key='policies'").fetchone()
    if row and row.get("value_json"):
        try:
            parsed = json.loads(row["value_json"])
            if isinstance(parsed, dict):
                merged.update(parsed)
        except Exception:
            pass
    return merged


def assert_ai_service_active(
    conn: Any,
    service_id: str,
    service_label: str,
    *,
    check_budget: bool = True,
) -> dict[str, Any]:
    """Kiểm tra công tắc dịch vụ AI của Admin (503) và trần ngân sách AI tháng (429)."""
    svc = conn.execute("SELECT active FROM ai_service_units WHERE id=?", (service_id,)).fetchone()
    if svc and not svc["active"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Dịch vụ {service_label} hiện đang tạm dừng bởi Quản trị viên.",
        )
    policies = load_system_policies(conn)
    if check_budget:
        budget_cap = float(policies.get("budgetCap", 500.0) or 500.0)
        cost_row = conn.execute("SELECT COALESCE(SUM(estimated_cost), 0) AS total_cost FROM ai_service_units").fetchone()
        total_cost = float(cost_row["total_cost"] or 0.0) if cost_row else 0.0
        if total_cost >= budget_cap:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Ngân sách AI tháng (${total_cost:.2f}/${budget_cap:.0f}) đã chạm trần giới hạn do Quản trị viên cấu hình.",
            )
    return policies


def assert_sandbox_enabled_for_exercise(
    conn: Any,
    user: dict[str, Any],
    exercise_id: str = "",
    *,
    session_id: str | None = None,
) -> dict[str, Any]:
    """Kiểm tra cả dịch vụ svc-docker (503) lẫn công tắc sandboxEnabled của lớp học phần (403)."""
    docker_svc = conn.execute("SELECT active FROM ai_service_units WHERE id='svc-docker'").fetchone()
    if docker_svc and not docker_svc["active"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Docker CI/CD Isolated Sandbox Pool đang được Quản trị viên tạm dừng bảo trì.",
        )
    policies = load_system_policies(conn)
    course = None
    ex_clean = (exercise_id or "").strip()

    if session_id:
        sess = conn.execute("SELECT course_code FROM learning_sessions WHERE id=?", (session_id,)).fetchone()
        if sess and sess.get("course_code"):
            course = conn.execute("SELECT id, code, subject_id, sandbox_enabled FROM courses WHERE code=?", (sess["course_code"],)).fetchone()

    if not course and ex_clean:
        if ex_clean == "exercise-deque":
            course = conn.execute("SELECT id, code, subject_id, sandbox_enabled FROM courses WHERE id='class-oop'").fetchone()
        elif ex_clean.startswith("ex-"):
            parts = ex_clean[3:].rsplit("-", 1)
            subj_guess = parts[0] if len(parts) == 2 and parts[1].isdigit() else ex_clean[3:]
            course = conn.execute(
                "SELECT id, code, subject_id, sandbox_enabled FROM courses WHERE subject_id=?",
                (subj_guess,),
            ).fetchone()
        if not course:
            course = conn.execute(
                "SELECT id, code, subject_id, sandbox_enabled FROM courses WHERE chapters_json LIKE ? LIMIT 1",
                (f'%"{ex_clean}"%',),
            ).fetchone()

    if course:
        if not course["sandbox_enabled"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quản trị viên đã tạm khóa Docker Sandbox cho học phần {course['code']}.",
            )
        if (user.get("role") or "").lower() == "student":
            enr_sec = conn.execute(
                """SELECT cs.section_code, cs.sandbox_enabled
                   FROM class_enrollments ce
                   JOIN class_sections cs ON cs.id = ce.section_id
                   WHERE ce.student_id = ? AND cs.course_id = ? AND ce.status = 'active'
                   LIMIT 1""",
                (user["id"], course["id"]),
            ).fetchone()
            if enr_sec and not enr_sec["sandbox_enabled"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Quản trị viên đã tạm khóa Docker Sandbox cho lớp học phần {enr_sec['section_code']}.",
                )
    return policies


def log_audit(
    actor_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str | None,
    decision: str,
    reason_code: str | None = None,
) -> None:
    """Ghi nhận audit log cho các thao tác nhạy cảm và kiểm soát quyền truy cập."""
    with db() as conn:
        conn.execute(
            "INSERT INTO audit_events(id,actor_user_id,action,resource_type,resource_id,decision,reason_code,created_at) VALUES(?,?,?,?,?,?,?,?)",
            (uid(), actor_id, action, resource_type, resource_id, decision, reason_code, now_utc()),
        )


def record_audit_log(
    actor_name: str,
    actor_id: str | None,
    action: str,
    target: str,
    log_type: str = "security",
    resource_type: str = "platform",
    resource_id: str | None = None,
    decision: str = "allow",
) -> None:
    """Ghi nhật ký kiểm toán chi tiết phục vụ Admin Audit Console."""
    safe_action = (str(action) if action is not None else "")[:64]
    safe_target = (str(target) if target is not None else "")[:190]
    safe_actor_name = (str(actor_name) if actor_name is not None else "")[:190]
    with db() as conn:
        conn.execute(
            """INSERT INTO audit_events(
                   id, actor_user_id, actor_label, action, resource_type, resource_id,
                   target_label, decision, reason_code, category, created_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (uid(), actor_id, safe_actor_name, safe_action, resource_type, resource_id, safe_target, decision, log_type, log_type, now_utc()),
        )


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict[str, Any]:
    """
    FastAPI Dependency: Trích xuất và xác thực thông tin người dùng từ Bearer Token.
    Hỗ trợ cả JWT Access Token (15 phút) và demo session tokens để tương thích ngược.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu thông tin xác thực Bearer Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    raw_token = credentials.credentials

    # 1. Hỗ trợ token Demo in-memory (tương thích ngược cho các bài test và demo nhanh)
    if raw_token in TOKENS:
        token_data = TOKENS[raw_token]
        user_id = token_data.get("id") or token_data.get("user_id")
        tok_hash = sha256(raw_token)
        with db() as conn:
            revoked_demo = conn.execute(
                "SELECT revoked FROM jwt_sessions WHERE token_hash=? AND revoked=1 LIMIT 1",
                (tok_hash,),
            ).fetchone()
            if revoked_demo:
                TOKENS.pop(raw_token, None)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Phiên đăng nhập trên thiết bị này đã bị thu hồi",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
            if user and user["status"] not in ("active", "pending"):
                TOKENS.pop(raw_token, None)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động",
                )
            membership = conn.execute(
                "SELECT role, organization_id FROM memberships WHERE user_id=? LIMIT 1",
                (user_id,),
            ).fetchone()

        user_dict = row_dict(user) if user else {"id": user_id, "display_name": "Demo User"}
        db_role = user_dict.get("role") if user_dict else None
        user_dict["role"] = token_data.get("role") or db_role or (membership["role"] if membership else "student")
        if user_dict["role"] == "org_admin":
            user_dict["role"] = "admin"
        user_dict["organization_id"] = token_data.get("organization_id") or (
            membership["organization_id"] if membership else "org-demo-codemind"
        )
        return user_dict

    # 2. Xác thực chuẩn JWT Access Token
    try:
        payload = decode_token(raw_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access Token đã hết hạn (thời hạn 15 phút). Vui lòng sử dụng Refresh Token để cấp lại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc chữ ký không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_type = payload.get("type")
    if token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Loại token không hợp lệ (yêu cầu Access Token)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin định danh người dùng",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = payload.get("jti")
    with db() as conn:
        if jti:
            revoked_row = conn.execute(
                "SELECT revoked FROM jwt_sessions WHERE jti=? AND revoked=1 LIMIT 1",
                (jti,),
            ).fetchone()
            if revoked_row:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Phiên đăng nhập JWT đã bị thu hồi bởi Quản trị viên",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản người dùng không tồn tại trong hệ thống",
            )
        if user["status"] not in ("active", "pending"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động",
            )
        membership = conn.execute(
            "SELECT role, organization_id FROM memberships WHERE user_id=? LIMIT 1",
            (user_id,),
        ).fetchone()

    user_dict = row_dict(user)
    user_role = user_dict.get("role") or payload.get("role") or (membership["role"] if membership else "student")
    if user_role == "org_admin":
        user_role = "admin"
    user_dict["role"] = user_role
    user_dict["organization_id"] = membership["organization_id"] if membership else "org-demo-codemind"
    return user_dict


# Bí danh tương thích ngược với mã nguồn hiện tại
current_user = get_current_user


def block_pending_student(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> None:
    """
    Router-level Guard: Chặn học viên mới đăng ký (status == 'pending') truy cập
    vào các API học tập, đồ án, sandbox, AI, lịch học hoặc thông báo trước khi được Admin duyệt.
    Không chặn yêu cầu chưa gửi token để các guard 401/public hoạt động bình thường.
    """
    if not credentials or not credentials.credentials:
        return

    raw_token = credentials.credentials
    user_id: str | None = None

    if raw_token in TOKENS:
        token_data = TOKENS[raw_token]
        user_id = token_data.get("id") or token_data.get("user_id")
    else:
        try:
            payload = decode_token(raw_token)
        except jwt.PyJWTError:
            return
        if payload.get("type") != "access":
            return
        user_id = payload.get("sub")

    if not user_id:
        return

    with db() as conn:
        row = conn.execute("SELECT status, role FROM users WHERE id=?", (user_id,)).fetchone()
        if row and row["status"] == "pending":
            role_label = "giảng viên" if (row.get("role") or "").lower() == "instructor" else "học viên"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tài khoản {role_label} đang chờ Quản trị viên phê duyệt cấp quyền. Bạn hiện chỉ có thể xem trang giới thiệu.",
            )


# ============================================================================
# FastAPI Dependencies Phân quyền 3 vai trò: Student, Instructor, Admin
# ============================================================================

class RoleChecker:
    """
    Dependency kiểm tra vai trò người dùng theo chuẩn RBAC (Role-Based Access Control).
    3 vai trò cốt lõi theo đặc tả CodeMind Campus:
      - student: Sinh viên học tập, nộp bài, xem tiến độ, sổ tay lỗi sai.
      - instructor: Giảng viên quản lý bài tập, theo dõi bằng chứng học tập của sinh viên.
      - admin: Quản trị viên hệ thống, quản lý người dùng, cấu hình và reset dữ liệu.
    """

    def __init__(self, allowed_roles: list[str]) -> None:
        self.allowed_roles = [r.lower() for r in allowed_roles]

    def __call__(self, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        user_role = (user.get("role") or "student").lower()

        # Kiểm tra quyền: Admin sở hữu quyền quản trị cao nhất
        has_permission = False
        for allowed in self.allowed_roles:
            if user_role == allowed:
                has_permission = True
                break
            if allowed in ("admin", "org_admin") and user_role in ("admin", "org_admin"):
                has_permission = True
                break
            # Admin có toàn quyền truy cập tài nguyên của instructor
            if allowed == "instructor" and user_role in ("admin", "org_admin"):
                has_permission = True
                break

        if not has_permission:
            log_audit(
                user.get("id"),
                "access_denied",
                "protected_resource",
                None,
                "deny",
                f"role_required_{'_'.join(self.allowed_roles)}",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quyền truy cập bị từ chối. Yêu cầu một trong các vai trò: {', '.join(self.allowed_roles)}",
            )
        return user


# 3 FastAPI Dependencies phân quyền chính
require_student = RoleChecker(["student", "admin", "org_admin"])
require_instructor = RoleChecker(["instructor", "admin", "org_admin"])
require_admin = RoleChecker(["admin", "org_admin"])


def require_roles(*roles: str) -> RoleChecker:
    """Factory dependency kiểm tra tập hợp vai trò bất kỳ."""
    return RoleChecker(list(roles))


def require_role(user: dict[str, Any], *roles: str) -> None:
    """Hàm kiểm tra quyền trực tiếp (tương thích ngược với các router cũ)."""
    user_role = (user.get("role") or "").lower()
    normalized_roles = [r.lower() for r in roles]

    is_allowed = user_role in normalized_roles
    if not is_allowed and "admin" in normalized_roles and user_role in ("admin", "org_admin"):
        is_allowed = True
    if not is_allowed and "org_admin" in normalized_roles and user_role in ("admin", "org_admin"):
        is_allowed = True
    if not is_allowed and "instructor" in normalized_roles and user_role in ("admin", "org_admin"):
        is_allowed = True

    if not is_allowed:
        log_audit(user.get("id"), "access", "protected_resource", None, "deny", "role_required")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Vai trò không được phép. Yêu cầu: {', '.join(roles)}",
        )


def session_owned(session_id: str, user_id: str) -> dict[str, Any]:
    """Kiểm tra quyền sở hữu learning_session của user."""
    with db() as conn:
        session = conn.execute("SELECT * FROM learning_sessions WHERE id=?", (session_id,)).fetchone()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên học")
    if session["user_id"] != user_id:
        log_audit(user_id, "read_session", "learning_session", session_id, "deny", "owner_check")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền với phiên học này")
    return row_dict(session) or {}


def get_optional_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict[str, Any] | None:
    """Dependency trích xuất user nếu có token hợp lệ, nếu không có token hoặc hết hạn thì trả về None thay vì quăng lỗi 401."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials)
    except Exception:
        return None
