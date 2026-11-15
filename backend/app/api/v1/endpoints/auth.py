from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, log_audit
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.database import get_db
from app.core.security import (
    TOKENS,
    create_access_token,
    create_refresh_token,
    generate_access_token,
    uid,
    verify_token,
)
from app.models.user import Consent, StudentProfile, User
from app.schemas.auth import (
    ConsentIn,
    DemoSessionIn,
    RefreshTokenIn,
    TokenResponse,
    UserLoginIn,
    UserPreferencesIn,
    UserRegisterIn,
)
from app.services.analytics import track_event
from app.services.user_service import (
    DEFAULT_ORG_ID,
    authenticate_user,
    create_user,
    get_user_by_id,
    update_user,
)

router = APIRouter(tags=["Auth"])


def _issue_token_pair(user: User) -> dict[str, Any]:
    user_role = user.role or "student"
    normalized_role = "admin" if user_role == "org_admin" else user_role
    access_token = create_access_token({"sub": user.id, "email": user.email, "role": normalized_role})
    refresh_token = create_refresh_token({"sub": user.id, "role": normalized_role})
    user_data = user.to_dict(exclude={"password_hash"})
    user_data["role"] = normalized_role
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "role": normalized_role,
        "user": user_data,
    }


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Đăng ký tài khoản người dùng mới:
      - Băm mật khẩu an toàn bằng Bcrypt.
      - Phân vai trò: student, instructor, admin.
      - Nếu là student: tự động khởi tạo hồ sơ học tập (student_profiles) và consent mặc định.
      - Cấp cặp Access Token (15 phút) và Refresh Token (7 ngày).
    """
    try:
        user = create_user(
            db,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            role=payload.role,
            timezone_name=payload.timezone,
            organization_id=DEFAULT_ORG_ID,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    log_audit(user.id, "register", "user", user.id, "allow", db=db)
    track_event(user.id, None, "user_registered", {"role": payload.role, "email": user.email}, db=db)
    return _issue_token_pair(user)


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: UserLoginIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Đăng nhập hệ thống bằng email và mật khẩu:
      - Đối chiếu mật khẩu băm Bcrypt.
      - Cấp Access Token (15 phút) và Refresh Token (7 ngày).
    """
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        db.rollback()
        log_audit(None, "login_failed", "auth", None, "deny", "invalid_credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "active" or not user.is_active:
        db.rollback()
        log_audit(user.id, "login_blocked", "auth", user.id, "deny", "account_inactive")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên.",
        )

    user_role = user.role or "student"
    log_audit(user.id, "login_success", "auth", user.id, "allow", db=db)
    track_event(user.id, None, "user_logged_in", {"role": user_role}, db=db)
    return _issue_token_pair(user)


@router.post("/auth/refresh", response_model=TokenResponse)
def refresh_token_endpoint(payload: RefreshTokenIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Cấp lại Access Token mới (15 phút) và xoay vòng Refresh Token (7 ngày)."""
    try:
        decoded = verify_token(payload.refresh_token, expected_type="refresh")
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token đã hết hạn (quá 7 ngày). Vui lòng đăng nhập lại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token không hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_by_id(db, decoded["sub"])
    if not user or user.status != "active" or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tài khoản không tồn tại hoặc đã bị khóa")

    log_audit(user.id, "token_refreshed", "auth", user.id, "allow", db=db)
    return _issue_token_pair(user)


@router.get("/auth/me")
@router.get("/users/me")
def get_me(
    user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Xem thông tin hồ sơ của tài khoản đang đăng nhập."""
    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user["id"]))
    result = dict(user)
    result.pop("password_hash", None)
    if profile:
        result["profile"] = profile.to_dict()
    return result


@router.patch("/users/me/preferences")
def update_user_preferences(
    payload: UserPreferencesIn,
    user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Cập nhật múi giờ hiển thị và theme giao diện của người dùng hiện tại."""
    db_user = get_user_by_id(db, user["id"])
    if not db_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    update_user(
        db,
        db_user,
        timezone_name=payload.timezone,
        theme_preference=payload.theme_preference,
    )
    log_audit(db_user.id, "update_preferences", "user", db_user.id, "allow", db=db)
    return db_user.to_dict(exclude={"password_hash"})


@router.post("/demo/session", status_code=status.HTTP_201_CREATED)
def create_demo_session(payload: DemoSessionIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Khởi tạo phiên đăng nhập demo (student, instructor, admin) để kiểm thử nhanh."""
    role_to_user = {
        "student": "student-demo",
        "instructor": "instructor-demo",
        "admin": "admin-demo",
        "org_admin": "admin-demo",
    }
    user_id = role_to_user.get(payload.demo_role, "student-demo")
    token = generate_access_token()
    actual_role = "admin" if payload.demo_role in ("admin", "org_admin") else payload.demo_role

    TOKENS[token] = {
        "id": user_id,
        "user_id": user_id,
        "role": actual_role,
        "organization_id": DEFAULT_ORG_ID,
    }
    demo_user = get_user_by_id(db, user_id)
    user_payload = (
        {
            "id": demo_user.id,
            "email": demo_user.email,
            "display_name": demo_user.display_name,
            "full_name": demo_user.full_name,
            "role": demo_user.role,
        }
        if demo_user
        else None
    )

    track_event(user_id, None, "demo_login_succeeded", {"role": payload.demo_role, "source": "local"}, db=db)
    refresh_token = create_refresh_token({"sub": user_id, "role": actual_role})
    return {
        "access_token": token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_payload,
        "role": actual_role,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.patch("/me/consents/{purpose}")
def update_consent(
    purpose: str,
    payload: ConsentIn,
    user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Cập nhật quyền consent của sinh viên (academic_integrity, teacher_visibility)."""
    allowed = {"academic_integrity", "teacher_visibility", "analytics_optional"}
    if purpose not in allowed:
        raise HTTPException(status_code=422, detail="Consent purpose không hợp lệ")

    now = datetime.now(timezone.utc)
    consent = db.scalar(select(Consent).where(Consent.user_id == user["id"], Consent.purpose == purpose))
    if consent:
        consent.granted = int(payload.granted)
        consent.policy_version = payload.policy_version
        consent.granted_at = now if payload.granted else consent.granted_at
        consent.revoked_at = None if payload.granted else now
        consent.updated_at = now
    else:
        consent = Consent(
            id=uid(),
            user_id=user["id"],
            purpose=purpose,
            policy_version=payload.policy_version,
            granted=int(payload.granted),
            granted_at=now if payload.granted else None,
            revoked_at=None if payload.granted else now,
            created_at=now,
            updated_at=now,
        )
        db.add(consent)

    db.flush()
    log_audit(user["id"], "update_consent", "user_consent", consent.id, "allow", db=db)
    track_event(
        user["id"],
        None,
        "consent_updated",
        {"purpose": purpose, "granted": payload.granted, "policy_version": payload.policy_version},
        db=db,
    )
    return consent.to_dict()
