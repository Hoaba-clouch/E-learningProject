from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

class SubmissionIn(BaseModel):
    exercise_id: str = "exercise-deque"
    code: str
    idempotency_key: str

class AIInteractionIn(BaseModel):
    message: str
    submission_id: str | None = None
    idempotency_key: str
