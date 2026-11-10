from __future__ import annotations

import datetime
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
from typing import Any
import uuid

import bcrypt
import jwt

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SECRET_KEY,
)

# In-memory session tokens store (compatible with previous demo session token store)
TOKENS: dict[str, dict[str, Any]] = {}


def uid() -> str:
    """Tạo UUIDv4 string ngẫu nhiên."""
    return str(uuid.uuid4())


def sha256(value: str) -> str:
    """Băm chuỗi bằng thuật toán SHA256."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def generate_access_token() -> str:
    """Sinh token ngẫu nhiên an toàn cho demo session."""
    return secrets.token_hex(24)


# ============================================================================
# Băm mật khẩu bằng Bcrypt
# ============================================================================

def hash_password(password: str) -> str:
    """Băm mật khẩu plain-text bằng thuật toán Bcrypt với Salt ngẫu nhiên."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    """Kiểm tra tính hợp lệ của mật khẩu đối chiếu với mật khẩu đã băm Bcrypt."""
    if not hashed_password or not plain_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ============================================================================
# Cấp và Giải mã JWT Token (Access Token 15 phút, Refresh Token 7 ngày)
# ============================================================================

def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Cấp JWT Access Token có thời hạn (mặc định 15 phút theo đặc tả CodeMind Campus).
    Payload bao gồm type='access', thời điểm phát hành (iat), hết hạn (exp) và jti ngẫu nhiên.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": uid(),
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Cấp JWT Refresh Token có thời hạn (mặc định 7 ngày theo đặc tả CodeMind Campus).
    Payload bao gồm type='refresh', thời điểm phát hành (iat), hết hạn (exp) và jti ngẫu nhiên.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
    to_encode.update({
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": uid(),
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """
    Giải mã và kiểm tra chữ ký của JWT token.
    Ném ra ExpiredSignatureError nếu token hết hạn, InvalidTokenError nếu token không hợp lệ.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
