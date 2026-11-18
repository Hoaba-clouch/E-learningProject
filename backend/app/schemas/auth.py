from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


# ============================================================================
# Schemas Đăng ký & Đăng nhập & Bảo mật Phiên (Auth & Device Schemas)
# ============================================================================

class UserRegisterIn(BaseModel):
    """Payload đăng ký tài khoản mới."""
    email: str = Field(
        ...,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        description="Email người dùng (ví dụ: student@codemind.edu.vn)",
    )
    password: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    full_name: str = Field(..., min_length=2, max_length=100, description="Họ và tên đầy đủ")
    role: Literal["student", "instructor", "admin"] = Field(
        default="student",
        description="Vai trò người dùng: student | instructor | admin",
    )
    timezone: str = Field(default="Asia/Ho_Chi_Minh", description="Múi giờ IANA chuẩn (mặc định Asia/Ho_Chi_Minh)")
    user_code: str | None = Field(default=None, max_length=40, description="Mã sinh viên hoặc mã giảng viên")
    device_name: str | None = Field(default=None, max_length=120)


class UserLoginIn(BaseModel):
    """Payload đăng nhập hệ thống."""
    email: str = Field(..., description="Email đăng nhập")
    password: str = Field(..., description="Mật khẩu plain-text")
    remember_me: bool = Field(default=False, description="Ghi nhớ phiên Refresh Token tối đa 30 ngày")
    device_name: str | None = Field(default=None, max_length=120)


class RefreshTokenIn(BaseModel):
    """Payload yêu cầu cấp mới Access Token bằng Refresh Token."""
    refresh_token: str = Field(..., description="JWT Refresh Token hợp lệ")


class Verify2FaIn(BaseModel):
    """Payload xác thực mã OTP 2 lớp khi đăng nhập."""
    challenge_token: str = Field(..., min_length=6)
    otp_code: str = Field(..., min_length=4, max_length=10)
    device_name: str | None = Field(default=None, max_length=120)


class ForgotPasswordIn(BaseModel):
    """Payload yêu cầu mã khôi phục mật khẩu."""
    email: str = Field(..., min_length=3, max_length=200)


class ResetPasswordIn(BaseModel):
    """Payload đặt lại mật khẩu bằng mã OTP khôi phục."""
    challenge_token: str = Field(..., min_length=6)
    otp_code: str = Field(..., min_length=4, max_length=10)
    new_password: str = Field(..., min_length=6, max_length=128)


class ChangePasswordIn(BaseModel):
    """Payload đổi mật khẩu cho tài khoản đang đăng nhập."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)
    revoke_other_sessions: bool = Field(default=True)


class SecuritySettingsPatchIn(BaseModel):
    """Cấu hình xác thực 2 lớp cá nhân."""
    two_factor_enabled: bool


class DeviceTrustPatchIn(BaseModel):
    """Đánh dấu thiết bị là tin cậy hoặc đáng ngờ."""
    trusted: bool


class SimulateDeviceIn(BaseModel):
    """Giả lập một thiết bị đăng nhập mới để kiểm thử quản lý phiên."""
    preset: str = Field(default="mobile", max_length=40)


class UserOut(BaseModel):
    """Thông tin công khai của người dùng trả về sau khi xác thực."""
    id: str
    email: str
    full_name: str
    display_name: str
    role: str
    timezone: str
    theme_preference: str = "one-dark"
    created_at: str


class TokenResponse(BaseModel):
    """Cấu trúc phản hồi sau khi đăng ký / đăng nhập / verify 2FA / refresh token."""
    access_token: str = ""
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int = 900  # 15 phút (900 giây)
    user: UserOut | dict[str, Any] = Field(default_factory=dict)
    role: str = "student"
    session_id: str | None = None
    requires_2fa: bool = False
    challenge_token: str | None = None
    masked_email: str | None = None
    demo_otp_hint: str | None = None


# ============================================================================
# Schemas Demo & Consents (Tương thích ngược)
# ============================================================================

class DemoSessionIn(BaseModel):
    demo_role: Literal["student", "instructor", "admin"] = "student"
    preferred_email: str | None = None


class ConsentIn(BaseModel):
    granted: bool
    policy_version: str = "2026-08-01"
