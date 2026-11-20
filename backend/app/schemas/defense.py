from __future__ import annotations

from pydantic import BaseModel, Field


class DefenseStartIn(BaseModel):
    project_id: str = "prj-codemind"
    class_id: str | None = None


class DefenseRespondIn(BaseModel):
    round_number: int = Field(default=1, ge=1, le=5)
    phase: str = Field(default="oral", description="oral | rebuttal")
    question_text: str = ""
    speaker_label: str = ""
    argument_text: str = Field(min_length=1, max_length=4000)
    expected_keywords: list[str] = Field(default_factory=list)
    rebuttal_option_score: int | None = Field(default=None, ge=0, le=100)
    # Optional backward-compatible fields
    argument_type: str | None = None
    rebuttal_score: int | None = Field(default=None, ge=0, le=100)


class DefenseCompleteIn(BaseModel):
    chapter_title: str | None = None
    repo_url: str | None = None
    passed_tests: int | None = Field(default=None, ge=0, le=100)
    total_tests: int | None = Field(default=None, ge=1, le=100)


class ToggleCourseDefenseIn(BaseModel):
    ai_defense_enabled: bool
