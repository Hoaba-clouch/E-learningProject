from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import UTCDatetime


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    mode: Literal["team", "solo"] = "team"
    deadline_utc: UTCDatetime | None = None


class MilestoneCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    due_date_utc: UTCDatetime | None = None


class TaskCreate(BaseModel):
    board_id: str
    column_id: str
    milestone_id: str | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    assignee_id: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    due_date_utc: UTCDatetime | None = None


class TaskMove(BaseModel):
    column_id: str
    new_position: int = Field(ge=0)


class TaskDependencyCreate(BaseModel):
    task_id: str
    depends_on_task_id: str
