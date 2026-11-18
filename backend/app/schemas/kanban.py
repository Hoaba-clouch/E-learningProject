from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    board_id: str
    column_id: str
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    assignee_id: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    due_date_utc: str | None = None


class TaskMove(BaseModel):
    column_id: str
    new_position: int = Field(ge=0)


# ─── Branch 2 Fullstack Schemas (Engineering Projects & Kanban Workspace) ───


class WorkspaceProjectCreateIn(BaseModel):
    id: str | None = None
    code: str | None = None
    name: str = Field(min_length=1, max_length=255)
    client: str = "CodeMind Campus"
    course: str = "CNTT-2026 · Đồ án Chuyên ngành"
    sprint: str = "Sprint 1 (Tuần 1 - 4)"
    kind: str = "AI / FULLSTACK"
    status: str = "active"
    fav: bool = True
    due_date: str = "15/12/2026"
    due_text: str | None = None
    story_points: int | None = None
    team_members: list[str] = Field(default_factory=list)


class WorkspaceProjectPatchIn(BaseModel):
    fav: bool | None = None
    status: str | None = None
    name: str | None = None
    sprint: str | None = None
    due_date: str | None = None
    team: list[dict[str, Any]] | None = None


class WorkspaceTaskCreateIn(BaseModel):
    id: str | None = None
    code: str | None = None
    title: str = Field(min_length=1, max_length=300)
    description: str = ""
    column: str = "ready"
    priority: str = "medium"
    moscow: str = "should"
    points: int = Field(default=3, ge=1, le=21)
    assignee: dict[str, Any] = Field(default_factory=dict)
    estimateHours: float = Field(default=4.0, ge=0.0, le=200.0)
    dueDate: str = ""
    epic: str = "Sprint Goal"
    epicColor: str = "bg-blue-50 text-blue-700 border-blue-200"
    dependsOn: str | None = None
    checklist: list[dict[str, Any]] = Field(default_factory=list)
    definitionOfDone: list[dict[str, Any]] = Field(default_factory=list)
    userStory: dict[str, Any] | None = None
    acceptanceCriteria: str | None = None
    deliverable: dict[str, Any] | None = None
    submissionRequirement: str | None = None
    submissionUrl: str | None = None
    isBonus: bool = False
    commentsCount: int = 0
    attachmentsCount: int = 0
    auditLogs: list[dict[str, Any]] = Field(default_factory=list)


class WorkspaceTaskBatchCreateIn(BaseModel):
    tasks: list[WorkspaceTaskCreateIn] = Field(default_factory=list)


class WorkspaceTaskPatchIn(BaseModel):
    title: str | None = None
    description: str | None = None
    column: str | None = None
    priority: str | None = None
    moscow: str | None = None
    points: int | None = Field(default=None, ge=1, le=21)
    assignee: dict[str, Any] | None = None
    estimateHours: float | None = None
    dueDate: str | None = None
    epic: str | None = None
    epicColor: str | None = None
    dependsOn: str | None = None
    checklist: list[dict[str, Any]] | None = None
    definitionOfDone: list[dict[str, Any]] | None = None
    userStory: dict[str, Any] | None = None
    acceptanceCriteria: str | None = None
    deliverable: dict[str, Any] | None = None
    submissionRequirement: str | None = None
    submissionUrl: str | None = None
    isBonus: bool | None = None
    commentsCount: int | None = None
    attachmentsCount: int | None = None
    auditLogs: list[dict[str, Any]] | None = None
    positionOrder: int | None = Field(default=None, ge=0)


class WorkspaceTaskMoveIn(BaseModel):
    target_column: str = Field(min_length=1, max_length=32)
    target_index: int = Field(default=0, ge=0)


class WorkspaceAiWbsIn(BaseModel):
    feature_name: str = Field(min_length=1, max_length=255)
    description: str = ""
    stack: str = "backend"
    custom_tech: str = ""
    granularity: int = Field(default=3, ge=2, le=6)
    include_h2: bool = True
    selected_members: list[dict[str, Any]] = Field(default_factory=list)
