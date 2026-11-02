from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user, log_audit
from app.core.database import db, row_dict
from app.core.security import TOKENS, generate_access_token, uid
from app.core.timezone import now_utc
from app.schemas.auth import DemoSessionIn, ConsentIn
from app.services.analytics import track_event

router = APIRouter(tags=["Auth"])


@router.post("/demo/session", status_code=status.HTTP_201_CREATED)
def create_demo_session(payload: DemoSessionIn) -> dict[str, Any]:
    """Khởi tạo phiên đăng nhập demo (student, instructor, admin)."""
    role_to_user = {
        "student": "student-demo",
        "instructor": "instructor-demo",
        "admin": "admin-demo",
    }
    user_id = role_to_user.get(payload.demo_role, "student-demo")
    token = generate_access_token()
    actual_role = "org_admin" if payload.demo_role == "admin" else payload.demo_role
    TOKENS[token] = {
        "id": user_id,
        "user_id": user_id,
        "role": actual_role,
        "organization_id": "org-demo-codemind",
    }
    with db() as conn:
        user = conn.execute("SELECT id, email, display_name FROM users WHERE id=?", (user_id,)).fetchone()
    track_event(user_id, None, "demo_login_succeeded", {"role": payload.demo_role, "source": "local"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": row_dict(user),
        "role": payload.demo_role,
        "expires_in": 3600,
    }


@router.patch("/me/consents/{purpose}")
def update_consent(
    purpose: str,
    payload: ConsentIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Cập nhật quyền consent của sinh viên (academic_integrity, teacher_visibility)."""
    allowed = {"academic_integrity", "teacher_visibility", "analytics_optional"}
    if purpose not in allowed:
        raise HTTPException(status_code=422, detail="Consent purpose không hợp lệ")
    timestamp = now_utc()
    with db() as conn:
        existing = conn.execute("SELECT id, granted_at FROM consents WHERE user_id=? AND purpose=?", (user["id"], purpose)).fetchone()
        if existing:
            conn.execute(
                "UPDATE consents SET granted=?, policy_version=?, granted_at=?, revoked_at=?, updated_at=? WHERE id=?",
                (
                    int(payload.granted),
                    payload.policy_version,
                    timestamp if payload.granted else existing["granted_at"],
                    None if payload.granted else timestamp,
                    timestamp,
                    existing["id"],
                ),
            )
        else:
            conn.execute(
                "INSERT INTO consents(id, user_id, purpose, policy_version, granted, granted_at, updated_at) VALUES(?,?,?,?,?,?,?)",
                (uid(), user["id"], purpose, payload.policy_version, int(payload.granted), timestamp if payload.granted else None, timestamp),
            )
        consent = conn.execute("SELECT * FROM consents WHERE user_id=? AND purpose=?", (user["id"], purpose)).fetchone()
    log_audit(user["id"], "update_consent", "user_consent", consent["id"] if consent else None, "allow")
    track_event(user["id"], None, "consent_updated", {"purpose": purpose, "granted": payload.granted, "policy_version": payload.policy_version})
    return row_dict(consent) or {}
