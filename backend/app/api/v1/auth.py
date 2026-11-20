from __future__ import annotations

from datetime import datetime, timedelta, timezone
import secrets
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
import jwt

from app.api.deps import get_current_user, log_audit, record_audit_log, security
from app.core.database import db, row_dict
from app.core.security import (
    TOKENS,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_access_token,
    hash_password,
    sha256,
    uid,
    verify_password,
)
from app.core.timezone import now_utc, now_utc_dt
from app.schemas.auth import (
    ChangePasswordIn,
    ConsentIn,
    DemoSessionIn,
    DeviceTrustPatchIn,
    ForgotPasswordIn,
    RefreshTokenIn,
    ResetPasswordIn,
    SecuritySettingsPatchIn,
    SimulateDeviceIn,
    TokenResponse,
    UserLoginIn,
    UserPreferencesPatchIn,
    UserRegisterIn,
    Verify2FaIn,
)
from app.services.analytics import track_event

router = APIRouter(tags=["Auth"])

MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

SIMULATED_DEVICE_PRESETS: dict[str, tuple[str, str, str, str, str]] = {
    "mobile": ("mobile", "Mobile Safari 18", "iOS 18.2", "iPhone 15 Pro · Mobile Safari", "171.244.18.92 (TP.HCM · 4G LTE)"),
    "linux": ("desktop", "Firefox 128", "Ubuntu 24.04", "Ubuntu Workstation · Firefox 128", "27.72.104.11 (Đà Nẵng)"),
    "lab": ("desktop", "Edge 126", "Windows 11", "Windows 11 Lab PC · Edge 126", "10.0.4.88 (Phòng Lab B2)"),
}


def _vi_role_label(role: str) -> str:
    if role in ("admin", "org_admin"):
        return "Quản trị viên"
    if role == "instructor":
        return "Giảng viên"
    return "Học viên"


def _mask_email(email: str) -> str:
    local, _, domain = (email or "").partition("@")
    if len(local) <= 2:
        return f"{local[:1]}***@{domain}"
    return f"{local[:2]}***{local[-1:]}@{domain}"


VALID_BG_THEMES = {"diagonal", "blueprint", "matrix", "sunrise", "graphite"}
VALID_COLOR_MODES = {"light", "dark"}


def _parse_theme_preference(raw: str | None) -> tuple[str, str]:
    clean = (raw or "").strip().lower()
    if ":" in clean:
        mode_part, bg_part = clean.split(":", 1)
        cm = mode_part if mode_part in VALID_COLOR_MODES else "light"
        bg = bg_part if bg_part in VALID_BG_THEMES else "diagonal"
        return cm, bg
    if clean in VALID_BG_THEMES:
        return "light", clean
    if clean in VALID_COLOR_MODES:
        return clean, "diagonal"
    return "light", "diagonal"


def _parse_device_info(request: Request | None, explicit_name: str | None = None) -> dict[str, str]:
    ua = (request.headers.get("user-agent") if request else "") or ""
    ua_l = ua.lower()

    os_name = "Windows 11"
    device_type = "desktop"
    if "iphone" in ua_l:
        os_name = "iOS 18"
        device_type = "mobile"
    elif "ipad" in ua_l:
        os_name = "iPadOS 17"
        device_type = "tablet"
    elif "android" in ua_l:
        os_name = "Android 15"
        device_type = "mobile"
    elif "mac os" in ua_l or "macintosh" in ua_l:
        os_name = "macOS"
        device_type = "laptop"
    elif "linux" in ua_l:
        os_name = "Linux"
        device_type = "desktop"

    browser_name = "Chrome"
    if "edg/" in ua_l:
        browser_name = "Edge"
    elif "firefox" in ua_l:
        browser_name = "Firefox"
    elif "safari" in ua_l and "chrome" not in ua_l:
        browser_name = "Safari"
    elif "python" in ua_l or "httpx" in ua_l or not ua:
        browser_name = "CodeMind Web Client"

    client_ip = (request.client.host if request and request.client else None) or "127.0.0.1"
    device_label = (explicit_name or "").strip() or f"{os_name} · {browser_name}"
    ip_label = f"{client_ip} (Campus Network)"
    return {
        "device": device_label[:90],
        "device_type": device_type,
        "browser": browser_name,
        "os": os_name,
        "ip_location": ip_label,
    }


def _record_jwt_session(
    user_id: str,
    user_name: str,
    role: str,
    access_token: str,
    refresh_token: str | None = None,
    device_info: dict[str, str] | None = None,
    state_label: str = "Hợp lệ (JWT + Refresh)",
    is_untrusted: int = 0,
) -> str:
    try:
        jti = decode_token(access_token).get("jti")
    except Exception:
        jti = None
    try:
        refresh_jti = decode_token(refresh_token).get("jti") if refresh_token else None
    except Exception:
        refresh_jti = None

    info = device_info or {
        "device": "Web Browser · CodeMind",
        "device_type": "desktop",
        "browser": "Chrome",
        "os": "Windows 11",
        "ip_location": "127.0.0.1 (Campus Network)",
    }
    session_id = uid()
    now = now_utc()
    with db() as conn:
        conn.execute(
            """INSERT INTO jwt_sessions(
                   id, user_id, jti, refresh_jti, token_hash, user_name, role,
                   device, ip_location, state, issued_at, is_untrusted, revoked,
                   device_type, browser, os, last_active_at, created_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?)""",
            (
                session_id,
                user_id,
                jti,
                refresh_jti,
                sha256(access_token),
                user_name,
                _vi_role_label(role),
                info["device"],
                info["ip_location"],
                state_label,
                "Vừa xong",
                is_untrusted,
                info["device_type"],
                info["browser"],
                info["os"],
                now,
                now,
            ),
        )
        conn.execute(
            "UPDATE users SET last_device=?, last_active_label='Đang trực tuyến', updated_at=? WHERE id=?",
            (info["device"], now, user_id),
        )
    return session_id


def _is_account_locked(user_row: Any) -> bool:
    raw = user_row["locked_until"]
    if not raw:
        return False
    try:
        locked_dt = datetime.fromisoformat(raw)
        if locked_dt.tzinfo is None:
            locked_dt = locked_dt.replace(tzinfo=timezone.utc)
        return locked_dt > now_utc_dt()
    except Exception:
        return False


def _serialize_user_session(row: Any, current_session_id: str | None) -> dict[str, Any]:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "device": row["device"],
        "deviceType": row["device_type"] or "desktop",
        "browser": row["browser"] or "Chrome",
        "os": row["os"] or "Windows 11",
        "ipLocation": row["ip_location"],
        "state": row["state"],
        "issuedAt": row["issued_at"],
        "lastActiveAt": row["last_active_at"] or row["created_at"] or "",
        "isUntrusted": bool(row["is_untrusted"]),
        "revoked": bool(row["revoked"]),
        "revokedAt": row["revoked_at"],
        "isCurrent": row["id"] == current_session_id,
    }


def _compute_security_score(user_row: Any, active_sessions: list[Any]) -> int:
    score = 55
    if int(user_row["two_factor_enabled"] or 0) == 1:
        score += 25
    untrusted_count = sum(1 for s in active_sessions if int(s["is_untrusted"] or 0) == 1)
    if untrusted_count == 0:
        score += 15
    else:
        score -= min(20, untrusted_count * 10)
    if user_row["password_changed_at"]:
        score += 5
    return max(20, min(100, score))


def _resolve_current_session_row(conn: Any, user_id: str, raw_token: str | None) -> Any:
    if raw_token:
        tok_hash = sha256(raw_token)
        jti = None
        try:
            jti = decode_token(raw_token).get("jti")
        except Exception:
            jti = None
        if jti:
            row = conn.execute(
                "SELECT * FROM jwt_sessions WHERE user_id=? AND revoked=0 AND (jti=? OR token_hash=?) ORDER BY rowid DESC LIMIT 1",
                (user_id, jti, tok_hash),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM jwt_sessions WHERE user_id=? AND revoked=0 AND token_hash=? ORDER BY rowid DESC LIMIT 1",
                (user_id, tok_hash),
            ).fetchone()
        if row:
            return row
    return conn.execute(
        "SELECT * FROM jwt_sessions WHERE user_id=? AND revoked=0 AND is_untrusted=0 ORDER BY rowid DESC LIMIT 1",
        (user_id,),
    ).fetchone()


def _create_otp_challenge(conn: Any, user_row: Any, purpose: str, ttl_minutes: int, device_hint: str = "") -> tuple[str, str]:
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    challenge_token = uid()
    now_dt = now_utc_dt()
    expires_at = (now_dt + timedelta(minutes=ttl_minutes)).isoformat()
    conn.execute(
        "UPDATE security_otp_codes SET consumed=1 WHERE user_id=? AND purpose=? AND consumed=0",
        (user_row["id"], purpose),
    )
    conn.execute(
        """INSERT INTO security_otp_codes(
               id, user_id, email, purpose, code_hash, challenge_token,
               device_hint, expires_at, consumed, created_at
           ) VALUES(?,?,?,?,?,?,?,?,0,?)""",
        (
            uid(),
            user_row["id"],
            user_row["email"],
            purpose,
            sha256(otp_code),
            challenge_token,
            device_hint[:90],
            expires_at,
            now_dt.isoformat(),
        ),
    )
    return otp_code, challenge_token


# ============================================================================
# 1. Đăng ký tài khoản mới (Register) với băm mật khẩu Bcrypt & ghi nhận thiết bị
# ============================================================================

@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterIn, request: Request) -> dict[str, Any]:
    """
    Đăng ký tài khoản người dùng mới:
      - Băm mật khẩu an toàn bằng Bcrypt.
      - Phân vai trò: student, instructor, admin.
      - Nếu là student: tự động khởi tạo hồ sơ học tập (student_profiles) và consent mặc định.
      - Cấp cặp Access Token (15 phút) và Refresh Token (7 ngày) kèm phiên thiết bị đầu tiên.
    """
    clean_email = payload.email.strip().lower()
    timestamp = now_utc()
    device_info = _parse_device_info(request, payload.device_name)

    with db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE lower(email) = ?", (clean_email,)).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.",
            )

        user_id = uid()
        pwd_hash = hash_password(payload.password)
        org_id = "org-demo-codemind"
        user_code = (payload.user_code or "").strip() or (
            f"ADM-{secrets.randbelow(90) + 10}"
            if payload.role == "admin"
            else f"GV-{secrets.randbelow(900) + 100}"
            if payload.role == "instructor"
            else f"2210{secrets.randbelow(900) + 100}"
        )

        conn.execute(
            """INSERT INTO users(
                   id, email, password_hash, full_name, display_name, role, status,
                   locale, timezone, theme_preference, user_code, last_active_label, last_device,
                   created_at, updated_at
               ) VALUES(?, ?, ?, ?, ?, ?, 'active', 'vi-VN', ?, 'one-dark', ?, 'Vừa đăng ký', ?, ?, ?)""",
            (
                user_id,
                clean_email,
                pwd_hash,
                payload.full_name,
                payload.full_name,
                payload.role,
                payload.timezone,
                user_code,
                device_info["device"],
                timestamp,
                timestamp,
            ),
        )

        membership_role = "org_admin" if payload.role == "admin" else payload.role
        conn.execute(
            "INSERT INTO memberships(id, organization_id, user_id, role, status) VALUES(?, ?, ?, ?, 'active')",
            (uid(), org_id, user_id, membership_role),
        )

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

    access_token = create_access_token({"sub": user_id, "email": clean_email, "role": payload.role})
    refresh_token = create_refresh_token({"sub": user_id, "role": payload.role})
    session_id = _record_jwt_session(
        user_id,
        payload.full_name,
        payload.role,
        access_token,
        refresh_token=refresh_token,
        device_info=device_info,
    )

    log_audit(user_id, "register", "user", user_id, "allow")
    record_audit_log(
        payload.full_name,
        user_id,
        "Đăng ký tài khoản mới",
        f"{clean_email} ({device_info['device']})",
        log_type="security",
        resource_type="user",
        resource_id=user_id,
    )
    track_event(user_id, None, "user_registered", {"role": payload.role, "email": clean_email})

    user_data = row_dict(user_row) or {}
    user_data.pop("password_hash", None)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 15 * 60,
        "role": payload.role,
        "session_id": session_id,
        "user": user_data,
    }


# ============================================================================
# 2. Đăng nhập (Login): Brute-Force Guard + 2FA OTP + Cấp Access/Refresh Token
# ============================================================================

@router.post("/auth/login", response_model=TokenResponse)
def login(payload: UserLoginIn, request: Request) -> dict[str, Any]:
    """
    Đăng nhập hệ thống bằng email và mật khẩu:
      - Khóa tạm thời 15 phút (HTTP 423) nếu nhập sai mật khẩu >= 5 lần liên tiếp.
      - Nếu tài khoản bật 2FA OTP: trả challenge_token để xác minh tại /v1/auth/verify-2fa.
      - Nếu hợp lệ: cấp Access Token (15m) + Refresh Token (7d hoặc 30d nếu remember_me).
    """
    clean_email = payload.email.strip().lower()
    device_info = _parse_device_info(request, payload.device_name)

    outcome: str = "ok"
    user_row_dict: dict[str, Any] = {}
    otp_code_2fa = ""
    challenge_token_2fa = ""

    with db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE lower(email) = ?", (clean_email,)).fetchone()
        if user_row and _is_account_locked(user_row):
            outcome = "locked_attempt"
            user_row_dict = row_dict(user_row) or {}
        elif not user_row or not verify_password(payload.password, user_row["password_hash"]):
            if user_row:
                new_attempts = int(user_row["failed_login_attempts"] or 0) + 1
                user_row_dict = row_dict(user_row) or {}
                if new_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
                    lock_until = (now_utc_dt() + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
                    conn.execute(
                        "UPDATE users SET failed_login_attempts=?, locked_until=?, updated_at=? WHERE id=?",
                        (new_attempts, lock_until, now_utc(), user_row["id"]),
                    )
                    outcome = "brute_force_locked"
                else:
                    conn.execute(
                        "UPDATE users SET failed_login_attempts=?, updated_at=? WHERE id=?",
                        (new_attempts, now_utc(), user_row["id"]),
                    )
                    outcome = "invalid_credentials"
            else:
                outcome = "invalid_credentials"
        elif user_row["status"] != "active":
            outcome = "inactive"
            user_row_dict = row_dict(user_row) or {}
        else:
            user_row_dict = row_dict(user_row) or {}
            conn.execute(
                "UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE id=?",
                (user_row["id"],),
            )
            if int(user_row["two_factor_enabled"] or 0) == 1:
                otp_code_2fa, challenge_token_2fa = _create_otp_challenge(
                    conn,
                    user_row,
                    purpose="login_2fa",
                    ttl_minutes=5,
                    device_hint=device_info["device"],
                )
                outcome = "requires_2fa"

    if outcome == "locked_attempt":
        log_audit(user_row_dict["id"], "login_locked_attempt", "auth", user_row_dict["id"], "deny", "brute_force_lock")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Tài khoản đang tạm khóa 15 phút do nhập sai mật khẩu quá 5 lần. Vui lòng dùng tính năng Quên mật khẩu để mở khóa.",
        )

    if outcome == "brute_force_locked":
        record_audit_log(
            user_row_dict.get("display_name") or "User",
            user_row_dict["id"],
            "Khóa tạm thời do sai mật khẩu 5 lần",
            f"{clean_email} ({device_info['ip_location']})",
            log_type="security",
            resource_type="auth",
            resource_id=user_row_dict["id"],
            decision="deny",
        )
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Tài khoản đã tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp.",
        )

    if outcome == "invalid_credentials":
        log_audit(None, "login_failed", "auth", None, "deny", "invalid_credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if outcome == "inactive":
        log_audit(user_row_dict["id"], "login_blocked", "auth", user_row_dict["id"], "deny", "account_inactive")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên.",
        )

    user_id = user_row_dict["id"]
    user_role = user_row_dict.get("role") or "student"
    user_label = user_row_dict.get("full_name") or user_row_dict.get("display_name") or "User"

    if outcome == "requires_2fa":
        record_audit_log(
            user_label,
            user_id,
            "Yêu cầu xác thực 2FA OTP khi đăng nhập",
            device_info["device"],
            log_type="security",
            resource_type="auth",
            resource_id=user_id,
        )
        return {
            "access_token": "",
            "refresh_token": None,
            "token_type": "bearer",
            "expires_in": 0,
            "role": user_role,
            "user": {},
            "requires_2fa": True,
            "challenge_token": challenge_token_2fa,
            "masked_email": _mask_email(user_row_dict["email"]),
            "demo_otp_hint": otp_code_2fa,
        }

    refresh_ttl = timedelta(days=30) if payload.remember_me else None
    access_token = create_access_token({"sub": user_id, "email": user_row_dict["email"], "role": user_role})
    refresh_token = create_refresh_token({"sub": user_id, "role": user_role}, expires_delta=refresh_ttl)
    session_id = _record_jwt_session(
        user_id,
        user_label,
        user_role,
        access_token,
        refresh_token=refresh_token,
        device_info=device_info,
    )

    log_audit(user_id, "login_success", "auth", user_id, "allow")
    record_audit_log(
        user_label,
        user_id,
        "Đăng nhập thành công",
        device_info["device"],
        log_type="security",
        resource_type="jwt_session",
        resource_id=session_id,
    )
    track_event(user_id, None, "user_logged_in", {"role": user_role})

    user_data = dict(user_row_dict)
    user_data.pop("password_hash", None)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 15 * 60,
        "role": user_role,
        "session_id": session_id,
        "user": user_data,
    }


@router.post("/auth/verify-2fa", response_model=TokenResponse)
def verify_2fa_login(payload: Verify2FaIn, request: Request) -> dict[str, Any]:
    """Xác minh mã OTP 2 lớp khi đăng nhập và cấp JWT Token cho thiết bị."""
    device_info = _parse_device_info(request, payload.device_name)
    otp_hash = sha256(payload.otp_code.strip())
    now_iso = now_utc()

    with db() as conn:
        challenge = conn.execute(
            """SELECT * FROM security_otp_codes
               WHERE challenge_token=? AND purpose='login_2fa' AND consumed=0""",
            (payload.challenge_token.strip(),),
        ).fetchone()
        if not challenge or challenge["expires_at"] < now_iso or challenge["code_hash"] != otp_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã OTP 2 lớp không chính xác hoặc đã hết hạn.",
            )

        user_row = conn.execute("SELECT * FROM users WHERE id=?", (challenge["user_id"],)).fetchone()
        if not user_row or user_row["status"] != "active":
            raise HTTPException(status_code=403, detail="Tài khoản không khả dụng")

        conn.execute("UPDATE security_otp_codes SET consumed=1 WHERE id=?", (challenge["id"],))

    user_id = user_row["id"]
    user_role = user_row["role"] or "student"
    access_token = create_access_token({"sub": user_id, "email": user_row["email"], "role": user_role})
    refresh_token = create_refresh_token({"sub": user_id, "role": user_role})
    session_id = _record_jwt_session(
        user_id,
        user_row["full_name"] or user_row["display_name"],
        user_role,
        access_token,
        refresh_token=refresh_token,
        device_info=device_info,
        state_label="Hợp lệ (JWT + 2FA OTP)",
    )
    record_audit_log(
        user_row["full_name"] or user_row["display_name"],
        user_id,
        "Xác thực 2FA OTP thành công",
        device_info["device"],
        log_type="security",
        resource_type="jwt_session",
        resource_id=session_id,
    )

    user_data = row_dict(user_row) or {}
    user_data.pop("password_hash", None)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 15 * 60,
        "role": user_role,
        "session_id": session_id,
        "user": user_data,
    }


@router.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordIn) -> dict[str, Any]:
    """Khởi tạo mã OTP khôi phục mật khẩu (kèm demo_otp_hint trên môi trường Campus Sandbox)."""
    clean_email = payload.email.strip().lower()
    with db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE lower(email)=?", (clean_email,)).fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản nào khớp với email này.")
        otp_code, challenge_token = _create_otp_challenge(
            conn,
            user_row,
            purpose="reset_password",
            ttl_minutes=10,
            device_hint="Password Recovery",
        )

    record_audit_log(
        user_row["full_name"] or user_row["display_name"],
        user_row["id"],
        "Yêu cầu khôi phục mật khẩu (OTP)",
        clean_email,
        log_type="security",
        resource_type="auth",
        resource_id=user_row["id"],
    )
    return {
        "challenge_token": challenge_token,
        "masked_email": _mask_email(clean_email),
        "expires_in": 600,
        "demo_otp_hint": otp_code,
    }


@router.post("/auth/reset-password")
def reset_password(payload: ResetPasswordIn) -> dict[str, str]:
    """Xác minh OTP khôi phục mật khẩu, mở khóa Brute-Force và thu hồi mọi phiên thiết bị cũ."""
    otp_hash = sha256(payload.otp_code.strip())
    now_iso = now_utc()

    with db() as conn:
        challenge = conn.execute(
            """SELECT * FROM security_otp_codes
               WHERE challenge_token=? AND purpose='reset_password' AND consumed=0""",
            (payload.challenge_token.strip(),),
        ).fetchone()
        if not challenge or challenge["expires_at"] < now_iso or challenge["code_hash"] != otp_hash:
            raise HTTPException(status_code=400, detail="Mã OTP khôi phục không chính xác hoặc đã hết hạn.")

        new_hash = hash_password(payload.new_password)
        user_id = challenge["user_id"]
        user_row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        conn.execute(
            """UPDATE users
               SET password_hash=?, failed_login_attempts=0, locked_until=NULL,
                   password_changed_at=?, updated_at=?
               WHERE id=?""",
            (new_hash, now_iso, now_iso, user_id),
        )
        conn.execute("UPDATE security_otp_codes SET consumed=1 WHERE id=?", (challenge["id"],))
        conn.execute(
            """UPDATE jwt_sessions
               SET revoked=1, state='Thu hồi do đặt lại mật khẩu', revoked_at=?
               WHERE user_id=? AND revoked=0""",
            (now_iso, user_id),
        )

    record_audit_log(
        (user_row["full_name"] or user_row["display_name"]) if user_row else "User",
        user_id,
        "Đặt lại mật khẩu & thu hồi toàn bộ phiên thiết bị cũ",
        challenge["email"],
        log_type="security",
        resource_type="user",
        resource_id=user_id,
    )
    return {
        "status": "reset_ok",
        "message": "Đặt lại mật khẩu thành công. Toàn bộ phiên thiết bị cũ đã được thu hồi an toàn.",
    }


# ============================================================================
# 3. Cấp mới Access Token bằng Refresh Token (Token Rotation)
# ============================================================================

@router.post("/auth/refresh", response_model=TokenResponse)
def refresh_token_endpoint(payload: RefreshTokenIn) -> dict[str, Any]:
    """
    Cấp lại Access Token mới (15 phút) từ Refresh Token hợp lệ.
    Kiểm tra trạng thái thu hồi của phiên trên thiết bị và xoay vòng cặp JWT mới.
    """
    try:
        decoded = decode_token(payload.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token đã hết hạn. Vui lòng đăng nhập lại.",
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
    old_ref_jti = decoded.get("jti")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token thiếu thông tin định danh")

    with db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if old_ref_jti:
            sess_row = conn.execute("SELECT * FROM jwt_sessions WHERE refresh_jti=? LIMIT 1", (old_ref_jti,)).fetchone()
            if sess_row and int(sess_row["revoked"] or 0) == 1:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Phiên đăng nhập trên thiết bị này đã bị thu hồi",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        else:
            sess_row = None

    if not user_row or user_row["status"] != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tài khoản không tồn tại hoặc đã bị khóa")

    user_role = user_row["role"] or "student"

    new_access_token = create_access_token({"sub": user_id, "email": user_row["email"], "role": user_role})
    new_refresh_token = create_refresh_token({"sub": user_id, "role": user_role})
    new_acc_jti = decode_token(new_access_token).get("jti")
    new_ref_jti = decode_token(new_refresh_token).get("jti")

    session_id = sess_row["id"] if sess_row else None
    if sess_row:
        with db() as conn:
            conn.execute(
                """UPDATE jwt_sessions
                   SET jti=?, refresh_jti=?, token_hash=?, last_active_at=?, issued_at='Vừa xoay vòng JWT'
                   WHERE id=?""",
                (new_acc_jti, new_ref_jti, sha256(new_access_token), now_utc(), sess_row["id"]),
            )

    log_audit(user_id, "token_refreshed", "auth", user_id, "allow")

    user_data = row_dict(user_row) or {}
    user_data.pop("password_hash", None)
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": 15 * 60,
        "role": user_role,
        "session_id": session_id,
        "user": user_data,
    }


# ============================================================================
# 4. Hồ sơ, Trung tâm Bảo mật & Quản lý Phiên Thiết bị Đa Nền Tảng
# ============================================================================

@router.get("/auth/me")
@router.get("/users/me")
def get_me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Xem thông tin hồ sơ của tài khoản đang đăng nhập."""
    with db() as conn:
        user_row = conn.execute("SELECT theme_preference FROM users WHERE id = ?", (user["id"],)).fetchone()
        profile = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user["id"],)).fetchone()

    result = dict(user)
    result.pop("password_hash", None)
    raw_pref = (user_row["theme_preference"] if user_row else None) or result.get("theme_preference")
    color_mode, background_theme = _parse_theme_preference(raw_pref)
    result["color_mode"] = color_mode
    result["background_theme"] = background_theme
    if profile:
        result["profile"] = row_dict(profile)
    return result


@router.patch("/auth/preferences")
def update_user_preferences(
    payload: UserPreferencesPatchIn,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Lưu giao diện nền miễn phí và chế độ sáng/tối cho tài khoản đang đăng nhập (cả 3 role)."""
    if payload.background_theme is not None and payload.background_theme not in VALID_BG_THEMES:
        raise HTTPException(status_code=422, detail="Mã giao diện nền không hợp lệ")
    if payload.color_mode is not None and payload.color_mode not in VALID_COLOR_MODES:
        raise HTTPException(status_code=422, detail="Chế độ hiển thị phải là light hoặc dark")

    with db() as conn:
        u_row = conn.execute("SELECT theme_preference FROM users WHERE id=?", (user["id"],)).fetchone()
        cur_mode, cur_bg = _parse_theme_preference(u_row["theme_preference"] if u_row else None)
        next_mode = payload.color_mode or cur_mode
        next_bg = payload.background_theme or cur_bg
        saved = f"{next_mode}:{next_bg}"
        conn.execute(
            "UPDATE users SET theme_preference=?, updated_at=? WHERE id=?",
            (saved, now_utc(), user["id"]),
        )
        conn.commit()
    return {
        "background_theme": next_bg,
        "color_mode": next_mode,
        "theme_preference": saved,
    }


@router.get("/navigation/counts")
def get_navigation_counts(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, int]:
    """Đếm số lượng thực tế từ MySQL để hiển thị badge điều hướng không dùng số cứng."""
    with db() as conn:
        users_cnt = int(conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"] or 0)
        courses_cnt = int(conn.execute("SELECT COUNT(*) AS c FROM courses").fetchone()["c"] or 0)
        ai_active = int(conn.execute("SELECT COUNT(*) AS c FROM ai_service_units WHERE active = 1").fetchone()["c"] or 0)
        ai_total = int(conn.execute("SELECT COUNT(*) AS c FROM ai_service_units").fetchone()["c"] or 0)
        projects_cnt = int(conn.execute("SELECT COUNT(*) AS c FROM engineering_projects").fetchone()["c"] or 0)
        team_cnt = int(
            conn.execute(
                """SELECT COUNT(*) AS c FROM users
                   WHERE role IN ('student', 'instructor')
                     AND status != 'suspended'
                     AND id NOT IN ('student-demo', 'instructor-demo', 'admin-demo')"""
            ).fetchone()["c"]
            or 0
        )
        kanban_total = int(conn.execute("SELECT COUNT(*) AS c FROM engineering_tasks").fetchone()["c"] or 0)
        kanban_open = int(
            conn.execute(
                "SELECT COUNT(*) AS c FROM engineering_tasks WHERE column_id NOT IN ('done', 'verified')"
            ).fetchone()["c"]
            or 0
        )
        schedules_cnt = int(
            conn.execute("SELECT COUNT(*) AS c FROM academic_schedules WHERE status != 'cancelled'").fetchone()["c"] or 0
        )
        pending_dual = int(
            conn.execute(
                "SELECT COUNT(*) AS c FROM dual_submissions WHERE status IN ('pending', 'flagged')"
            ).fetchone()["c"]
            or 0
        )
        completed_lessons = int(
            conn.execute(
                "SELECT COUNT(*) AS c FROM student_lesson_progress WHERE user_id = ?",
                (user["id"],),
            ).fetchone()["c"]
            or 0
        )
    return {
        "users": users_cnt,
        "courses": courses_cnt,
        "ai_services": ai_active,
        "ai_services_total": ai_total,
        "projects": projects_cnt,
        "team_members": team_cnt,
        "kanban_tasks": kanban_total,
        "kanban_open_tasks": kanban_open,
        "schedules": schedules_cnt,
        "pending_dual_reviews": pending_dual,
        "completed_lessons": completed_lessons,
    }


@router.get("/auth/security-overview")
def get_security_overview(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Lấy bảng điều khiển Bảo mật cá nhân, trạng thái 2FA, JWT Rotation và danh sách thiết bị."""
    raw_token = credentials.credentials if credentials else ""
    user_id = user["id"]
    device_info = _parse_device_info(request)

    with db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        current_sess = _resolve_current_session_row(conn, user_id, raw_token)
        if not current_sess and user_row:
            now = now_utc()
            sid = uid()
            jti = None
            try:
                jti = decode_token(raw_token).get("jti") if raw_token and raw_token not in TOKENS else None
            except Exception:
                jti = None
            conn.execute(
                """INSERT INTO jwt_sessions(
                       id, user_id, jti, refresh_jti, token_hash, user_name, role,
                       device, ip_location, state, issued_at, is_untrusted, revoked,
                       device_type, browser, os, last_active_at, created_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?)""",
                (
                    sid,
                    user_id,
                    jti,
                    None,
                    sha256(raw_token) if raw_token else None,
                    user_row["full_name"] or user_row["display_name"],
                    _vi_role_label(user_row["role"] or "student"),
                    device_info["device"],
                    device_info["ip_location"],
                    "Hợp lệ (JWT + Refresh)",
                    "Vừa xong",
                    0,
                    device_info["device_type"],
                    device_info["browser"],
                    device_info["os"],
                    now,
                    now,
                ),
            )
            current_sess = conn.execute("SELECT * FROM jwt_sessions WHERE id=?", (sid,)).fetchone()

        active_rows = conn.execute(
            "SELECT * FROM jwt_sessions WHERE user_id=? AND revoked=0 ORDER BY rowid DESC",
            (user_id,),
        ).fetchall()
        revoked_rows = conn.execute(
            "SELECT * FROM jwt_sessions WHERE user_id=? AND revoked=1 ORDER BY rowid DESC LIMIT 12",
            (user_id,),
        ).fetchall()
        audit_rows = conn.execute(
            """SELECT * FROM audit_events
               WHERE actor_user_id=? OR resource_id=?
               ORDER BY created_at DESC LIMIT 20""",
            (user_id, user_id),
        ).fetchall()

    current_sid = current_sess["id"] if current_sess else None
    score = _compute_security_score(user_row, active_rows) if user_row else 75

    return {
        "user": {
            "id": user_row["id"],
            "email": user_row["email"],
            "fullName": user_row["full_name"],
            "displayName": user_row["display_name"],
            "role": user_row["role"],
            "userCode": user_row["user_code"] or "2210842",
            "twoFactorEnabled": bool(user_row["two_factor_enabled"]),
            "failedLoginAttempts": int(user_row["failed_login_attempts"] or 0),
            "passwordChangedAt": user_row["password_changed_at"] or user_row["created_at"],
        },
        "securityScore": score,
        "tokenInfo": {
            "algorithm": "HS256 + Bcrypt",
            "accessTtlMinutes": 15,
            "refreshTtlDays": 7,
            "currentSessionId": current_sid,
            "lastIssuedLabel": current_sess["issued_at"] if current_sess else "Vừa xong",
        },
        "sessions": [_serialize_user_session(r, current_sid) for r in active_rows],
        "revokedSessions": [_serialize_user_session(r, current_sid) for r in revoked_rows],
        "recentAudits": [
            {
                "id": a["id"],
                "action": a["action"],
                "target": a["target_label"] or f"{a['resource_type']} {a['resource_id'] or ''}".strip(),
                "decision": a["decision"],
                "category": a["category"] or "security",
                "createdAt": a["created_at"],
            }
            for a in audit_rows
        ],
    }


@router.post("/auth/change-password")
def change_password(
    payload: ChangePasswordIn,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Đổi mật khẩu tài khoản hiện tại bằng Bcrypt và tùy chọn đăng xuất toàn bộ thiết bị khác."""
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=400, detail="Mật khẩu mới không được trùng mật khẩu hiện tại.")

    raw_token = credentials.credentials if credentials else ""
    now = now_utc()
    revoked_count = 0

    with db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
        if not user_row or not verify_password(payload.current_password, user_row["password_hash"]):
            raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác.")

        conn.execute(
            "UPDATE users SET password_hash=?, password_changed_at=?, updated_at=? WHERE id=?",
            (hash_password(payload.new_password), now, now, user["id"]),
        )
        if payload.revoke_other_sessions:
            cur_sess = _resolve_current_session_row(conn, user["id"], raw_token)
            cur_id = cur_sess["id"] if cur_sess else ""
            others = conn.execute(
                "SELECT id FROM jwt_sessions WHERE user_id=? AND revoked=0 AND id!=?",
                (user["id"], cur_id),
            ).fetchall()
            revoked_count = len(others)
            conn.execute(
                """UPDATE jwt_sessions
                   SET revoked=1, state='Thu hồi sau đổi mật khẩu', revoked_at=?
                   WHERE user_id=? AND revoked=0 AND id!=?""",
                (now, user["id"], cur_id),
            )

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "User",
        user["id"],
        "Đổi mật khẩu tài khoản Bcrypt",
        f"Thu hồi {revoked_count} thiết bị khác",
        log_type="security",
        resource_type="user",
        resource_id=user["id"],
    )
    return {
        "status": "updated",
        "revoked_other_count": revoked_count,
        "message": "Đã cập nhật mật khẩu an toàn.",
    }


@router.patch("/auth/security-settings")
def update_security_settings(
    payload: SecuritySettingsPatchIn,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Bật / tắt xác thực 2 lớp (2FA OTP) cho tài khoản hiện tại."""
    enabled = int(payload.two_factor_enabled)
    with db() as conn:
        conn.execute(
            "UPDATE users SET two_factor_enabled=?, updated_at=? WHERE id=?",
            (enabled, now_utc(), user["id"]),
        )
        user_row = conn.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
        active_rows = conn.execute(
            "SELECT * FROM jwt_sessions WHERE user_id=? AND revoked=0",
            (user["id"],),
        ).fetchall()

    score = _compute_security_score(user_row, active_rows)
    record_audit_log(
        user.get("full_name") or user.get("display_name") or "User",
        user["id"],
        f"{'Bật' if enabled else 'Tắt'} Xác thực 2 lớp (2FA OTP)",
        user.get("email") or user["id"],
        log_type="security",
        resource_type="user",
        resource_id=user["id"],
    )
    return {"twoFactorEnabled": bool(enabled), "securityScore": score}


@router.patch("/auth/sessions/{session_id}/trust")
def update_device_trust(
    session_id: str,
    payload: DeviceTrustPatchIn,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Đánh dấu thiết bị là Đáng tin cậy hoặc Cảnh báo thiết bị lạ."""
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM jwt_sessions WHERE id=? AND user_id=? AND revoked=0",
            (session_id, user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên thiết bị đang hoạt động")

        is_untrusted = 0 if payload.trusted else 1
        new_state = "Thiết bị tin cậy (Đã xác minh)" if payload.trusted else "Cảnh báo thiết bị lạ"
        conn.execute(
            "UPDATE jwt_sessions SET is_untrusted=?, state=? WHERE id=?",
            (is_untrusted, new_state, session_id),
        )
        updated = conn.execute("SELECT * FROM jwt_sessions WHERE id=?", (session_id,)).fetchone()

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "User",
        user["id"],
        "Xác nhận thiết bị tin cậy" if payload.trusted else "Đánh dấu thiết bị đáng ngờ",
        row["device"],
        log_type="security",
        resource_type="jwt_session",
        resource_id=session_id,
    )
    return {"session": _serialize_user_session(updated, None)}


@router.delete("/auth/sessions/{session_id}")
def revoke_user_session(
    session_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Đăng xuất từ xa một phiên thiết bị cụ thể và hủy Refresh Token đi kèm."""
    now = now_utc()
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM jwt_sessions WHERE id=? AND user_id=? AND revoked=0",
            (session_id, user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên thiết bị đang hoạt động")

        conn.execute(
            "UPDATE jwt_sessions SET revoked=1, state='Đã đăng xuất từ xa', revoked_at=? WHERE id=?",
            (now, session_id),
        )

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "User",
        user["id"],
        "Đăng xuất thiết bị từ xa",
        f"{row['device']} ({row['ip_location']})",
        log_type="security",
        resource_type="jwt_session",
        resource_id=session_id,
    )
    return {"status": "revoked", "id": session_id}


@router.post("/auth/sessions/revoke-others")
def revoke_other_sessions(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Thu hồi toàn bộ phiên đăng nhập trên các thiết bị khác, giữ lại thiết bị hiện tại."""
    raw_token = credentials.credentials if credentials else ""
    now = now_utc()
    with db() as conn:
        cur_sess = _resolve_current_session_row(conn, user["id"], raw_token)
        cur_id = cur_sess["id"] if cur_sess else ""
        others = conn.execute(
            "SELECT id FROM jwt_sessions WHERE user_id=? AND revoked=0 AND id!=?",
            (user["id"], cur_id),
        ).fetchall()
        revoked_count = len(others)
        conn.execute(
            """UPDATE jwt_sessions
               SET revoked=1, state='Thu hồi hàng loạt từ thiết bị chính', revoked_at=?
               WHERE user_id=? AND revoked=0 AND id!=?""",
            (now, user["id"], cur_id),
        )

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "User",
        user["id"],
        "Đăng xuất toàn bộ thiết bị khác",
        f"Đã thu hồi {revoked_count} phiên khác",
        log_type="security",
        resource_type="jwt_session",
        resource_id=user["id"],
    )
    return {"revoked_count": revoked_count}


@router.post("/auth/sessions/simulate-device", status_code=status.HTTP_201_CREATED)
def simulate_device_session(
    payload: SimulateDeviceIn,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Giả lập một lượt đăng nhập từ thiết bị lạ/phụ để kiểm thử tính năng quản lý & thu hồi."""
    preset_key = (payload.preset or "mobile").strip().lower()
    d_type, browser, os_name, device_label, ip_loc = SIMULATED_DEVICE_PRESETS.get(
        preset_key,
        SIMULATED_DEVICE_PRESETS["mobile"],
    )
    sim_refresh = create_refresh_token({"sub": user["id"], "role": user.get("role") or "student"})
    sim_acc = create_access_token({"sub": user["id"], "email": user.get("email") or "", "role": user.get("role") or "student"})
    sid = _record_jwt_session(
        user["id"],
        user.get("full_name") or user.get("display_name") or "User",
        user.get("role") or "student",
        sim_acc,
        refresh_token=sim_refresh,
        device_info={
            "device": device_label,
            "device_type": d_type,
            "browser": browser,
            "os": os_name,
            "ip_location": ip_loc,
        },
        state_label="Thiết bị mới (Chưa xác minh)",
        is_untrusted=1,
    )
    with db() as conn:
        row = conn.execute("SELECT * FROM jwt_sessions WHERE id=?", (sid,)).fetchone()

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "User",
        user["id"],
        "Phát hiện đăng nhập từ thiết bị mới",
        f"{device_label} ({ip_loc})",
        log_type="security",
        resource_type="jwt_session",
        resource_id=sid,
    )
    return {"session": _serialize_user_session(row, None)}


@router.post("/auth/logout")
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict[str, str]:
    """Đăng xuất và thu hồi phiên token hiện tại."""
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
        TOKENS.pop(raw_token, None)
        tok_hash = sha256(raw_token)
        now = now_utc()
        jti = None
        try:
            payload = decode_token(raw_token)
            jti = payload.get("jti")
        except Exception:
            jti = None
        with db() as conn:
            if jti:
                conn.execute(
                    "UPDATE jwt_sessions SET revoked=1, state='Đã đăng xuất', revoked_at=? WHERE jti=? OR token_hash=?",
                    (now, jti, tok_hash),
                )
            else:
                conn.execute(
                    "UPDATE jwt_sessions SET revoked=1, state='Đã đăng xuất', revoked_at=? WHERE token_hash=?",
                    (now, tok_hash),
                )
    return {"status": "logged_out", "message": "Đã đăng xuất và thu hồi phiên an toàn"}


# ============================================================================
# 5. Demo session & Consents (Duy trì tương thích ngược 100%)
# ============================================================================

@router.post("/demo/session", status_code=status.HTTP_201_CREATED)
def create_demo_session(payload: DemoSessionIn, request: Request) -> dict[str, Any]:
    """Khởi tạo phiên đăng nhập demo (student, instructor, admin) để kiểm thử nhanh."""
    role_to_user = {
        "student": "student-demo",
        "instructor": "instructor-demo",
        "admin": "admin-demo",
    }
    user_id = role_to_user.get(payload.demo_role, "student-demo")
    with db() as conn:
        if payload.preferred_email:
            found = conn.execute(
                "SELECT id FROM users WHERE lower(email)=? AND status='active'",
                (payload.preferred_email.strip().lower(),),
            ).fetchone()
            if found:
                user_id = found["id"]
        user = conn.execute("SELECT id, email, display_name, full_name, role FROM users WHERE id=?", (user_id,)).fetchone()

    token = generate_access_token()
    actual_role = "admin" if payload.demo_role == "admin" else payload.demo_role
    refresh_token = create_refresh_token({"sub": user_id, "role": actual_role})

    TOKENS[token] = {
        "id": user_id,
        "user_id": user_id,
        "role": actual_role,
        "organization_id": "org-demo-codemind",
    }
    device_info = _parse_device_info(request)
    session_id = _record_jwt_session(
        user_id,
        (user["full_name"] or user["display_name"]) if user else "Demo User",
        actual_role,
        token,
        refresh_token=refresh_token,
        device_info=device_info,
    )
    track_event(user_id, None, "demo_login_succeeded", {"role": payload.demo_role, "source": "local"})

    return {
        "access_token": token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": row_dict(user),
        "role": actual_role,
        "session_id": session_id,
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
