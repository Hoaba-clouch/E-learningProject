from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field

class DemoSessionIn(BaseModel):
    demo_role: Literal["student", "instructor", "admin"] = "student"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    display_name: str
    timezone: str

class ConsentIn(BaseModel):
    granted: bool
    policy_version: str = "2026-08-01"
