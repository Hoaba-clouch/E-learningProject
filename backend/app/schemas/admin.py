from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class AdminUserCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    code: str = ""
    role: str = "student"
    password: str = Field(default="CodeMind@2026", min_length=6)


class AdminUserPatchIn(BaseModel):
    role: str | None = None
    status: str | None = None
    name: str | None = None


class ApprovalResolveIn(BaseModel):
    decision: Literal["approved", "rejected"]


class AdminClassCreateIn(BaseModel):
    mode: str = "new_course"  # "new_course" | "new_section"
    course_id: str | None = None
    section_code: str | None = None
    code: str = Field(default="", max_length=24)
    name: str = Field(default="", max_length=255)
    instructor_id: str | None = None
    teacher: str = Field(default="", max_length=120)
    semester: str = "Học kỳ 1 / 2026"
    stage_number: int = Field(default=1, ge=1, le=5)
    credits: int = Field(default=3, ge=1, le=10)
    students: int = Field(default=45, ge=1, le=500)
    max_students: int = Field(default=45, ge=1, le=500)
    room: str = "Lab A3-201"
    dockerImage: str = "codemind/cpp20-sandbox:latest"


class AdminClassPatchIn(BaseModel):
    instructor_id: str | None = None
    teacher: str | None = None
    section_code: str | None = None
    semester: str | None = None
    students: int | None = Field(default=None, ge=1, le=500)
    max_students: int | None = Field(default=None, ge=1, le=500)
    room: str | None = None
    dockerImage: str | None = None
    health: str | None = None
    status: str | None = None
    stage_number: int | None = Field(default=None, ge=1, le=5)
    credits: int | None = Field(default=None, ge=1, le=10)
    sandboxEnabled: bool | None = None
    aiDefenseEnabled: bool | None = None


class AdminEnrollmentCreateIn(BaseModel):
    student_id: str = Field(min_length=1, max_length=64)


class AdminServicePatchIn(BaseModel):
    active: bool | None = None
    quotaPct: int | None = Field(default=None, ge=0, le=100)


class AdminPoliciesIn(BaseModel):
    budgetCap: float = Field(default=500, ge=50, le=10000)
    guardrailRefuseAnswer: bool = True
    rateLimit20PerHour: bool = True
    dockerNetworkNone: bool = True
    require2FA: bool = True
    blockConcurrentIP: bool = True
    autoLockFailedAttempts: bool = True


class AdminBroadcastIn(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    message: str = Field(min_length=1, max_length=1000)
