from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, H4DateTime, TimestampMixin


class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    lesson_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    organization_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="in_progress")
    current_step_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    progress_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    teacher_visibility: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(
        H4DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        H4DateTime,
        nullable=True,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    completed_at: Mapped[datetime | None] = mapped_column(H4DateTime, nullable=True)

    attempts: Mapped[list["StepAttempt"]] = relationship(
        back_populates="learning_session",
        cascade="all, delete-orphan",
    )
    terms: Mapped[list["TermSelection"]] = relationship(
        back_populates="learning_session",
        cascade="all, delete-orphan",
    )
    concept_answers: Mapped[list["ConceptAnswer"]] = relationship(
        back_populates="learning_session",
        cascade="all, delete-orphan",
    )


class StepAttempt(TimestampMixin, Base):
    __tablename__ = "step_attempts"
    __table_args__ = (
        UniqueConstraint("learning_session_id", "lesson_step_id", "attempt_no", name="uq_step_attempt"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    learning_session_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("learning_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    lesson_step_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("lesson_steps.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    attempt_no: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(H4DateTime, nullable=True)

    learning_session: Mapped["LearningSession"] = relationship(back_populates="attempts")


class TermSelection(TimestampMixin, Base):
    __tablename__ = "term_selections"
    __table_args__ = (
        UniqueConstraint("learning_session_id", "term_normalized", name="uq_term_session_normalized"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    learning_session_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("learning_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source_version_id: Mapped[str] = mapped_column(String(64), nullable=False)
    term_text: Mapped[str] = mapped_column(String(255), nullable=False)
    term_normalized: Mapped[str] = mapped_column(String(255), nullable=False)
    context_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)

    learning_session: Mapped["LearningSession"] = relationship(back_populates="terms")


class ConceptAnswer(TimestampMixin, Base):
    __tablename__ = "concept_answers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    learning_session_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("learning_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    relation_key: Mapped[str] = mapped_column(String(128), nullable=False)
    selected_option: Mapped[str] = mapped_column(String(255), nullable=False)
    is_correct: Mapped[int] = mapped_column(Integer, nullable=False)
    rule_version: Mapped[str] = mapped_column(String(64), nullable=False)
    answered_at: Mapped[datetime | None] = mapped_column(
        H4DateTime,
        nullable=True,
        default=lambda: datetime.now(timezone.utc),
    )

    learning_session: Mapped["LearningSession"] = relationship(back_populates="concept_answers")
