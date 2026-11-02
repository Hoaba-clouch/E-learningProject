from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

class SessionStartIn(BaseModel):
    lesson_id: str
    organization_id: str

class ProgressIn(BaseModel):
    target_step: int = Field(ge=1, le=6)
    progress_version: int

class TermsIn(BaseModel):
    source_version_id: str
    terms: list[str]

class ConceptAnswerItem(BaseModel):
    relation_key: str
    selected_option: str

class ConceptAnswersIn(BaseModel):
    answers: list[ConceptAnswerItem]
