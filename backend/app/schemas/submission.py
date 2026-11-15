from __future__ import annotations

from pydantic import Field

from app.schemas.common import UTCSchema


class SubmissionIn(UTCSchema):
    exercise_id: str = "exercise-deque"
    code: str
    idempotency_key: str = Field(min_length=1, max_length=128)


class AIInteractionIn(UTCSchema):
    message: str = Field(min_length=1)
    submission_id: str | None = None
    idempotency_key: str = Field(min_length=1, max_length=128)
