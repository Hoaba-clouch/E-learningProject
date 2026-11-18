from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class ChapterCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class ChapterPatchIn(BaseModel):
    title: str | None = None
    status: Literal["Đã phát hành", "Bản nháp"] | None = None


class LessonCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    duration: str = "12 phút"


class LessonSaveIn(BaseModel):
    title: str | None = None
    duration: str | None = None
    status: Literal["Đã phát hành", "Bản nháp"] | None = None
    isGenerated: bool | None = None
    documents: list[dict[str, Any]] | None = None
    content: dict[str, Any] | None = None


class DockerTestCaseIn(BaseModel):
    id: str | None = None
    title: str = Field(min_length=1, max_length=255)
    input: str = ""
    expectedOutput: str = ""
    isEdgeCase: bool = False
    timeoutMs: int = Field(default=1500, ge=100, le=30000)
    memoryLimitMb: int = Field(default=128, ge=16, le=2048)


class MindmapSaveIn(BaseModel):
    mindmapNodes: list[dict[str, Any]] = Field(default_factory=list)
    mindmapEdges: list[dict[str, Any]] = Field(default_factory=list)
    mindmapGenerated: bool = True


class DualDecisionIn(BaseModel):
    action: Literal["approve", "redefense"]
    final_score: int | None = Field(default=None, ge=0, le=100)
    instructor_feedback: str = ""


class DefenseRubricIn(BaseModel):
    cicdWeightPct: int = Field(ge=0, le=100)
    defenseWeightPct: int = Field(ge=0, le=100)
    strictAntiCopyGuardrail: bool = True
    autoFlagDiscrepancyThreshold: int = Field(default=25, ge=5, le=100)
    mandatoryProbes: list[dict[str, Any]] = Field(default_factory=list)


class SessionActionIn(BaseModel):
    action_type: Literal["award_xp", "assign_reading", "send_reminder"]
    note: str = ""


class CopilotPromptIn(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    class_id: str | None = None
