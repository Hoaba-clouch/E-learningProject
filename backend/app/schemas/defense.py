from __future__ import annotations

from pydantic import BaseModel, Field


class DefenseStartIn(BaseModel):
    project_id: str = "prj-codemind"
    class_id: str = "class-oop"


class DefenseRespondIn(BaseModel):
    round_number: int = Field(default=1, ge=1, le=5)
    argument_text: str = Field(min_length=1, max_length=4000)
    argument_type: str = "optimal"
    rebuttal_score: int = Field(default=88, ge=0, le=100)


class DefenseCompleteIn(BaseModel):
    chapter_title: str = "Đồ án Bảo vệ Hội đồng AI 3D"
    repo_url: str = "https://github.com/codemind-sv/project-submission"
    passed_tests: int = Field(default=5, ge=0, le=20)
    total_tests: int = Field(default=5, ge=1, le=20)
