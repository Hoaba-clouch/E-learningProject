from __future__ import annotations

from pydantic import Field

from app.schemas.common import UTCSchema


class SessionStartIn(UTCSchema):
    lesson_id: str
    organization_id: str | None = "org-demo-codemind"


class ProgressIn(UTCSchema):
    target_step: int = Field(ge=1, le=6)
    progress_version: int = Field(ge=1)


class TermsIn(UTCSchema):
    source_version_id: str
    terms: list[str]


class ConceptAnswerItem(UTCSchema):
    relation_key: str
    selected_option: str


class ConceptAnswersIn(UTCSchema):
    answers: list[ConceptAnswerItem]
