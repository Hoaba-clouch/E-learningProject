from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, H4DateTime, TimestampMixin


class Submission(TimestampMixin, Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    learning_session_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("learning_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    exercise_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    programming_language: Mapped[str] = mapped_column(String(32), nullable=False, default="python")
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    source_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    submission_no: Mapped[int] = mapped_column(Integer, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    passed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_count: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    test_results: Mapped[list["TestResult"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
        order_by="TestResult.sequence_no",
    )


class TestResult(TimestampMixin, Base):
    __test__ = False
    __tablename__ = "test_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    submission_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("submissions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    sequence_no: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    safe_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    submission: Mapped["Submission"] = relationship(back_populates="test_results")


class AIInteraction(TimestampMixin, Base):
    __tablename__ = "ai_interactions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    learning_session_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("learning_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    submission_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_message: Mapped[str] = mapped_column(Text, nullable=False)
    assistant_message: Mapped[str] = mapped_column(Text, nullable=False)
    policy_decision: Mapped[str] = mapped_column(String(64), nullable=False)
    model_id: Mapped[str] = mapped_column(String(128), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)
    citation_json: Mapped[str] = mapped_column(Text, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)

    hints: Mapped[list["AIHint"]] = relationship(
        back_populates="interaction",
        cascade="all, delete-orphan",
        order_by="AIHint.level",
    )


class AIHint(TimestampMixin, Base):
    __tablename__ = "ai_hints"
    __table_args__ = (UniqueConstraint("ai_interaction_id", "level", name="uq_ai_hint_level"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    ai_interaction_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("ai_interactions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    hint_text: Mapped[str] = mapped_column(Text, nullable=False)
    opened_at: Mapped[datetime] = mapped_column(
        H4DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    policy_passed: Mapped[int] = mapped_column(Integer, nullable=False)

    interaction: Mapped["AIInteraction"] = relationship(back_populates="hints")


class Evidence(TimestampMixin, Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    learning_session_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("learning_sessions.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    first_submission_id: Mapped[str] = mapped_column(String(64), nullable=False)
    final_submission_id: Mapped[str] = mapped_column(String(64), nullable=False)
    hint_count: Mapped[int] = mapped_column(Integer, nullable=False)
    passed_count: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(
        H4DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
