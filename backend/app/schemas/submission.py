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


class SandboxEvaluateIn(BaseModel):
    exercise_id: str = "exercise-deque"
    code: str
    language: str = "python"
    idempotency_key: str | None = None


class SocraticHistoryTurn(BaseModel):
    role: str = "user"
    text: str = ""


class SocraticWorkspaceContext(BaseModel):
    lesson_id: str | None = None
    quiz_attempt_id: str | None = None
    view_mode: str | None = None
    subject_id: str | None = None
    subject_code: str | None = None
    subject_name: str | None = None
    chapter_number: int | None = None
    chapter_title: str | None = None
    lesson_code: str | None = None
    lesson_title: str | None = None
    lesson_summary: str | None = None
    lesson_takeaways: list[str] = Field(default_factory=list)
    lesson_code_snippet: str | None = None
    exercise_id: str | None = None
    exercise_title: str | None = None
    exercise_language: str | None = None
    exercise_objective: str | None = None
    exercise_problem: str | None = None
    exercise_requirements: list[str] = Field(default_factory=list)
    exercise_hints: list[str] = Field(default_factory=list)
    exercise_test_cases: list[str] = Field(default_factory=list)
    exercise_submission_status: str | None = None
    quiz_index: int | None = None
    quiz_total: int | None = None
    quiz_question: str | None = None
    quiz_options: list[str] = Field(default_factory=list)
    quiz_selected_option: str | None = None
    quiz_submitted: bool = False
    quiz_explanation: str | None = None


class SocraticChatIn(BaseModel):
    message: str
    code_context: str | None = None
    session_id: str | None = None
    workspace_context: SocraticWorkspaceContext | None = None
    history: list[SocraticHistoryTurn] = Field(default_factory=list)
    hint_level: int | None = Field(default=None, ge=1, le=3)
