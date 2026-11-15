from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import db_session, get_db
from app.core.security import TOKENS, uid, verify_token
from app.models.audit import AuditEvent
from app.models.learning import LearningSession
from app.models.user import Membership, User


def log_audit(
    actor_user_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str | None,
    decision: str,
    reason_code: str | None = None,
    db: Session | None = None,
) -> None:
    """Ghi nhận nhật ký bảo mật / phân quyền vào bảng audit_events."""
    entry = AuditEvent(
        id=uid(),
        actor_user_id=actor_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        decision=decision,
        reason_code=reason_code,
        created_at=datetime.now(timezone.utc),
    )
    if db is not None:
        db.add(entry)
        return
    with db_session() as own_session:
        own_session.add(entry)


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu Access Token hợp lệ")
    return authorization.split(" ", 1)[1].strip()


def _resolve_user_dict(user: User, membership: Membership | None, token: str) -> dict[str, Any]:
    raw_role = user.role or (membership.role if membership else "student")
    normalized_role = "admin" if raw_role == "org_admin" else raw_role
    membership_role = membership.role if membership else normalized_role

    payload = user.to_dict(exclude={"password_hash"})
    payload["role"] = normalized_role
    payload["membership_role"] = membership_role
    payload["organization_id"] = membership.organization_id if membership else "org-demo-codemind"
    payload["token"] = token
    return payload


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    FastAPI Dependency xác thực danh tính người dùng từ Bearer token.
    Hỗ trợ cả JWT (HS256) lẫn in-memory demo token và gắn Role + Organization từ ORM.
    """
    token = _extract_bearer_token(authorization)

    session_info = TOKENS.get(token)
    user_id: str | None = session_info["user_id"] if session_info else None

    if not user_id:
        try:
            payload = verify_token(token, expected_type="access")
        except Exception:
            raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn")
        user_id = payload.get("sub")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại")
    if user.status != "active" or not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa")

    membership = db.scalar(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.status == "active",
        )
    )
    return _resolve_user_dict(user, membership, token)


current_user = get_current_user


class RoleChecker:
    """FastAPI Dependency chuẩn hóa phân quyền RBAC theo danh sách vai trò cho phép."""

    def __init__(self, allowed_roles: list[str] | tuple[str, ...]) -> None:
        self.allowed_roles = set(allowed_roles)

    def __call__(self, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        user_role = user.get("role", "")
        membership_role = user.get("membership_role", "")

        has_access = (user_role in self.allowed_roles) or (membership_role in self.allowed_roles)
        if "instructor" in self.allowed_roles and user_role in ("admin", "org_admin"):
            has_access = True

        if not has_access:
            log_audit(
                user.get("id"),
                "rbac_access",
                "endpoint",
                None,
                "deny",
                f"role_{user_role}_forbidden",
            )
            raise HTTPException(
                status_code=403,
                detail=f"Truy cập bị từ chối: Yêu cầu quyền {sorted(self.allowed_roles)}",
            )
        return user


require_student = RoleChecker(["student", "instructor", "admin"])
require_instructor = RoleChecker(["instructor", "admin"])
require_admin = RoleChecker(["admin", "org_admin"])


def require_roles(*roles: str) -> RoleChecker:
    """Helper khởi tạo RoleChecker linh hoạt cho từng endpoint."""
    return RoleChecker(list(roles))


def require_role(user: dict[str, Any], *roles: str) -> None:
    """Kiểm tra vai trò trực tiếp (imperative) dùng trong route handler hiện có."""
    user_role = user.get("role", "")
    membership_role = user.get("membership_role", "")
    allowed = set(roles)
    if user_role in allowed or membership_role in allowed:
        return
    if "instructor" in allowed and user_role in ("admin", "org_admin"):
        return
    log_audit(user.get("id"), "access_check", "endpoint", None, "deny", "forbidden_role")
    raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện thao tác này")


def session_owned(
    session_id: str,
    user_id: str,
    db: Session | None = None,
) -> dict[str, Any]:
    """Xác minh người dùng là chủ sở hữu của phiên học (LearningSession)."""
    if db is not None:
        row = db.get(LearningSession, session_id)
        data = row.to_dict() if row else None
    else:
        with db_session() as own_session:
            row = own_session.get(LearningSession, session_id)
            data = row.to_dict() if row else None

    if not data:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên học")
    if data["user_id"] != user_id:
        log_audit(user_id, "read_session", "learning_session", session_id, "deny", "not_owner")
        raise HTTPException(status_code=403, detail="Không có quyền truy cập phiên học này")
    return data
