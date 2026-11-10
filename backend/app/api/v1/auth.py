from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
import jwt

from app.api.deps import get_current_user, log_audit
from app.core.database import db, row_dict
from app.core.security import (
    TOKENS,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_access_token,
    hash_password,
    uid,
    verify_password,
)
from app.core.timezone import now_utc
from app.schemas.auth import (
    ConsentIn,
    DemoSessionIn,
    RefreshTokenIn,
    TokenResponse,
    UserLoginIn,
    UserOut,
    UserRegisterIn,
)
from app.services.analytics import track_event

router = APIRouter(tags=["Auth"])


# ============================================================================
# 1. Đăng ký tài khoản mới (Register) với băm mật khẩu Bcrypt
# ============================================================================

@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterIn) -> dict[str, Any]:
    """
    Đăng ký tài khoản người dùng mới:
      - Băm mật khẩu an toàn bằng Bcrypt.
      - Phân vai trò: student, instructor, admin.
      - Nếu là student: tự động khởi tạo hồ sơ học tập (student_profiles) và consent mặc định.
      - Cấp cặp Access Token (15 phút) và Refresh Token (7 ngày).
    """
    clean_email = payload.email.strip().lower()
    timestamp = now_utc()

    with db() as conn:
        # Kiểm tra trùng email
        existing = conn.execute("SELECT id FROM users WHERE lower(email) = ?", (clean_email,)).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.",
            )

        user_id = uid()
        pwd_hash = hash_password(payload.password)
        org_id = "org-demo-codemind"

        # Tạo bản ghi người dùng
        conn.execute(
            """INSERT INTO users(id, email, password_hash, full_name, display_name, role, status, locale, timezone, theme_preference, created_at, updated_at)
               VALUES(?, ?, ?, ?, ?, ?, 'active', 'vi-VN', ?, 'one-dark', ?, ?)""",
            (user_id, clean_email, pwd_hash, payload.full_name, payload.full_name, payload.role, payload.timezone, timestamp, timestamp),
        )

        # Gán membership
        membership_role = "org_admin" if payload.role == "admin" else payload.role
        conn.execute(
            "INSERT INTO memberships(id, organization_id, user_id, role, status) VALUES(?, ?, ?, ?, 'active')",
            (uid(), org_id, user_id, membership_role),
        )

        # Nếu là sinh viên, khởi tạo hồ sơ học tập & gamification ban đầu
        if payload.role == "student":
            conn.execute(
                """INSERT INTO student_profiles(id, user_id, current_streak, longest_streak, exp_points, selected_title,
                                                radar_algorithm, radar_debugging, radar_cleancode, radar_teamwork, radar_defense)
                   VALUES(?, ?, 0, 0, 0, 'Novice Developer', 10.0, 10.0, 10.0, 10.0, 10.0)""",
                (uid(), user_id),
            )
            for purpose in ("academic_integrity", "teacher_visibility"):
                conn.execute(
                    "INSERT INTO consents(id, user_id, purpose, policy_version, granted, granted_at, updated_at) VALUES(?, ?, ?, '2026-08-01', 1, ?, ?)",
                    (uid(), user_id, purpose, timestamp, timestamp),
                )

        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    # Cấp token: Access Token (15 phút) và Refresh Token (7 ngày)
    access_token = create_access_token({"sub": user_id, "email": clean_email, "role": payload.role})
    refresh_token = create_refresh_token({"sub": user_id, "role": payload.role})

    log_audit(user_id, "register", "user", user_id, "allow")
    track_event(user_id, None, "user_registered", {"role": payload.role, "email": clean_email})

    user_data = row_dict(user_row) or {}
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 15 * 60,  # 15 phút (900 giây)
        "role": payload.role,
        "user": user_data,
    }


# ============================================================================
# 2. Đăng nhập (Login) đối chiếu Bcrypt & Cấp Access Token (15m) + Refresh Token (7d)
# ============================================================================

@router.post("/auth/login", response_model=TokenResponse)
def login(payload: UserLoginIn) -> dict[str, Any]:
    """
    Đăng nhập hệ thống bằng email và mật khẩu:
      - Đối chiếu mật khẩu băm Bcrypt.
      - Cấp Access Token có thời hạn 15 phút.
      - Cấp Refresh Token có thời hạn 7 ngày.
    """
    clean_email = payload.email.strip().lower()

    with db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE lower(email) = ?", (clean_email,)).fetchone()

    if not user_row or not verify_password(payload.password, user_row["password_hash"]):
        log_audit(None, "login_failed", "auth", None, "deny", "invalid_credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user_row["status"] != "active":
        log_audit(user_row["id"], "login_blocked", "auth", user_row["id"], "deny", "account_inactive")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên.",
        )

    user_id = user_row["id"]
    user_role = user_row["role"] or "student"

    access_token = create_access_token({"sub": user_id, "email": user_row["email"], "role": user_role})
    refresh_token = create_refresh_token({"sub": user_id, "role": user_role})

    log_audit(user_id, "login_success", "auth", user_id, "allow")
    track_event(user_id, None, "user_logged_in", {"role": user_role})

    user_data = row_dict(user_row) or {}
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 15 * 60,  # 15 phút
        "role": user_role,
        "user": user_data,
    }


# ============================================================================
# 3. Cấp mới Access Token bằng Refresh Token (Token Rotation)
# ============================================================================

@router.post("/auth/refresh", response_model=TokenResponse)
def refresh_token_endpoint(payload: RefreshTokenIn) -> dict[str, Any]:
    """
    Cấp lại Access Token mới (15 phút) từ Refresh Token hợp lệ (7 ngày).
    Đồng thời cấp mới Refresh Token (Token Rotation) để bảo mật tối đa.
    """
    try:
        decoded = decode_token(payload.refresh_token)
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

    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token gửi lên không phải là Refresh Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = decoded.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token thiếu thông tin định danh")

    with db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    if not user_row or user_row["status"] != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tài khoản không tồn tại hoặc đã bị khóa")

    user_role = user_row["role"] or "student"

    new_access_token = create_access_token({"sub": user_id, "email": user_row["email"], "role": user_role})
    new_refresh_token = create_refresh_token({"sub": user_id, "role": user_role})

    log_audit(user_id, "token_refreshed", "auth", user_id, "allow")

    user_data = row_dict(user_row) or {}
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": 15 * 60,
        "role": user_role,
        "user": user_data,
    }


# ============================================================================
# 4. Lấy thông tin tài khoản hiện tại (Me / Profile)
# ============================================================================

@router.get("/auth/me")
@router.get("/users/me")
def get_me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Xem thông tin hồ sơ của tài khoản đang đăng nhập."""
    with db() as conn:
        profile = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user["id"],)).fetchone()
    
    result = dict(user)
    # Loại bỏ trường nhạy cảm
    result.pop("password_hash", None)
    if profile:
        result["profile"] = row_dict(profile)
    return result


# ============================================================================
# 5. Demo session & Consents (Duy trì tương thích ngược 100%)
# ============================================================================

@router.post("/demo/session", status_code=status.HTTP_201_CREATED)
def create_demo_session(payload: DemoSessionIn) -> dict[str, Any]:
    """Khởi tạo phiên đăng nhập demo (student, instructor, admin) để kiểm thử nhanh."""
    role_to_user = {
        "student": "student-demo",
        "instructor": "instructor-demo",
        "admin": "admin-demo",
    }
    user_id = role_to_user.get(payload.demo_role, "student-demo")
    token = generate_access_token()
    actual_role = "admin" if payload.demo_role == "admin" else payload.demo_role

    TOKENS[token] = {
        "id": user_id,
        "user_id": user_id,
        "role": actual_role,
        "organization_id": "org-demo-codemind",
    }
    with db() as conn:
        user = conn.execute("SELECT id, email, display_name, full_name, role FROM users WHERE id=?", (user_id,)).fetchone()
    track_event(user_id, None, "demo_login_succeeded", {"role": payload.demo_role, "source": "local"})

    # Cung cấp cả refresh_token cho demo
    refresh_token = create_refresh_token({"sub": user_id, "role": actual_role})
    return {
        "access_token": token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": row_dict(user),
        "role": actual_role,
        "expires_in": 15 * 60,
    }


@router.patch("/me/consents/{purpose}")
def update_consent(
    purpose: str,
    payload: ConsentIn,
    user: dict[str, Any] = Depends(get_current_user),
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
