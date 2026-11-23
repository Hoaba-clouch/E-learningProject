from __future__ import annotations

from pydantic import BaseModel, Field


class LessonCompleteIn(BaseModel):
    subject_id: str = Field(min_length=1, max_length=64)
    chapter_id: str = Field(min_length=1, max_length=64)
    lesson_id: str = Field(min_length=1, max_length=64)
    xp: int = Field(default=50, ge=0, le=300)
    quiz_score: int = Field(default=0, ge=0, le=100)
    quiz_total: int = Field(default=0, ge=0, le=100)


class VideoProgressIn(BaseModel):
    subject_id: str = Field(min_length=1, max_length=64)
    lesson_id: str = Field(min_length=1, max_length=64)
    watched_seconds: int = Field(default=0, ge=0, le=86400)
    duration_seconds: int = Field(default=0, ge=0, le=86400)
    completed: bool = False


class VideoNoteCreateIn(BaseModel):
    subject_id: str = Field(min_length=1, max_length=64)
    lesson_id: str = Field(default="1.1", max_length=64)
    time_sec: int = Field(default=0, ge=0)
    timestamp: str = Field(default="00:00", max_length=20)
    content: str = Field(min_length=1, max_length=2000)


class ChapterExerciseSubmitIn(BaseModel):
    subject_id: str = Field(min_length=1, max_length=64)
    chapter_number: int = Field(default=1, ge=1, le=20)
    exercise_id: str = Field(min_length=1, max_length=64)
    exercise_title: str = Field(min_length=1, max_length=255)
    repo_url: str = Field(min_length=3, max_length=1000)
    student_note: str = ""
    xp: int = Field(default=100, ge=0, le=300)


class XpShopPurchaseIn(BaseModel):
    category: str = Field(min_length=1, max_length=32)
    item_id: str = Field(min_length=1, max_length=64)
    cost: int = Field(ge=0, le=20000)


class XpShopEquipIn(BaseModel):
    category: str = Field(min_length=1, max_length=32)
    item_id: str = Field(min_length=1, max_length=64)


class XpQuestClaimIn(BaseModel):
    quest_id: str = Field(min_length=1, max_length=64)
    reward: int = Field(ge=1, le=500)


class StudentUpdateTitleIn(BaseModel):
    title: str = Field(min_length=1, max_length=100)


class StudentProfilePreferencesIn(BaseModel):
    theme: str | None = Field(default=None, max_length=64)
    avatar: str | None = Field(default=None, max_length=64)
    badge: str | None = Field(default=None, max_length=64)
    title: str | None = Field(default=None, max_length=100)

