from __future__ import annotations

from typing import Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from app.core.database import db, row_dict
from app.core.security import TOKENS, decode_token, uid
from app.core.timezone import now_utc

security = HTTPBearer(auto_error=False)


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
        with db() as conn:
            user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
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

    with db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản người dùng không tồn tại trong hệ thống",
            )
        if user["status"] != "active":
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
