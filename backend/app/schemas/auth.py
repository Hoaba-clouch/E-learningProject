from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


# ============================================================================
# Schemas Đăng ký & Đăng nhập (Auth Schemas)
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


class UserLoginIn(BaseModel):
    """Payload đăng nhập hệ thống."""
    email: str = Field(..., description="Email đăng nhập")
    password: str = Field(..., description="Mật khẩu plain-text")


class RefreshTokenIn(BaseModel):
    """Payload yêu cầu cấp mới Access Token bằng Refresh Token."""
    refresh_token: str = Field(..., description="JWT Refresh Token hợp lệ (thời hạn 7 ngày)")


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
    """Cấu trúc phản hồi sau khi đăng ký / đăng nhập / refresh token thành công."""
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int = 900  # 15 phút (900 giây)
    user: UserOut | dict[str, Any]
    role: str


# ============================================================================
# Schemas Demo & Consents (Tương thích ngược)
# ============================================================================

class DemoSessionIn(BaseModel):
    demo_role: Literal["student", "instructor", "admin"] = "student"


class ConsentIn(BaseModel):
    granted: bool
    policy_version: str = "2026-08-01"
