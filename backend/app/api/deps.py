from __future__ import annotations

from typing import Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import db, row_dict
from app.core.security import TOKENS, uid
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
    """Ghi nhận audit log cho các thao tác nhạy cảm."""
    with db() as conn:
        conn.execute(
            "INSERT INTO audit_events(id,actor_user_id,action,resource_type,resource_id,decision,reason_code,created_at) VALUES(?,?,?,?,?,?,?,?)",
            (uid(), actor_id, action, resource_type, resource_id, decision, reason_code, now_utc()),
        )


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict[str, Any]:
    """Dependency trích xuất user từ Bearer Token."""
    if not credentials or credentials.credentials not in TOKENS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cần phiên đăng nhập demo hợp lệ",
        )
    token_data = TOKENS[credentials.credentials]
    user_id = token_data.get("id") or token_data.get("user_id")
    with db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        membership = conn.execute("SELECT role, organization_id FROM memberships WHERE user_id=? LIMIT 1", (user_id,)).fetchone()
    
    user_dict = row_dict(user) if user else {"id": user_id, "display_name": "Demo User"}
    user_dict["role"] = token_data.get("role") or (membership["role"] if membership else "student")
    user_dict["organization_id"] = token_data.get("organization_id") or (membership["organization_id"] if membership else "org-demo-codemind")
    return user_dict


def require_role(user: dict[str, Any], *roles: str) -> None:
    """Kiểm tra quyền truy cập theo vai trò (student, instructor, org_admin)."""
    if user.get("role") not in roles:
        log_audit(user.get("id"), "access", "protected_resource", None, "deny", "role_required")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vai trò không được phép")


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
