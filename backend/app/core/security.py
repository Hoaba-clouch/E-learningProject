from __future__ import annotations

import hashlib
import uuid
import secrets

# In-memory session tokens store (compatible with previous token store)
TOKENS: dict[str, dict[str, str]] = {}

def uid() -> str:
    """Tạo UUIDv4 string ngẫu nhiên."""
    return str(uuid.uuid4())

def sha256(value: str) -> str:
    """Băm chuỗi bằng thuật toán SHA256."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def generate_access_token() -> str:
    """Sinh token ngẫu nhiên an toàn."""
    return secrets.token_hex(24)
