from __future__ import annotations

from typing import Literal
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
