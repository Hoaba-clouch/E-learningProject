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


class DefensePackageIn(BaseModel):
    demo_url: str = Field(default="", max_length=500)
    slide_url: str = Field(default="", max_length=500)
    report_url: str = Field(default="", max_length=500)
    video_url: str = Field(default="", max_length=500)
    repo_url: str = Field(default="", max_length=500)
    architecture_summary: str = Field(default="", max_length=4000)
    member_roles_summary: str = Field(default="", max_length=4000)


class LiveCouncilMemberScoreIn(BaseModel):
    member_id: str
    name: str
    role: str = "Developer"
    contribution_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    suggested_factor: float = Field(default=1.0, ge=0.0, le=2.5)
    individual_score: float = Field(ge=0.0, le=10.0)
    asked_question: str = Field(default="", max_length=1000)
    live_qa_note: str = Field(default="", max_length=1000)


class LiveCouncilGradeIn(BaseModel):
    demo_score: float = Field(ge=0.0, le=10.0)
    architecture_score: float = Field(ge=0.0, le=10.0)
    process_score: float = Field(ge=0.0, le=10.0)
    defense_score: float = Field(ge=0.0, le=10.0)
    feedback: str = Field(default="", max_length=4000)
    verdict: str = Field(default="pass", description="pass | pass_with_revisions | fail")
    council_members: str = Field(default="", max_length=500)
    demo_verified: bool = True
    repo_verified: bool = True
    frozen_verified: bool = False
    member_scores: list[LiveCouncilMemberScoreIn] = Field(default_factory=list)
