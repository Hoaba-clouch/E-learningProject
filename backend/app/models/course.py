from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, H4DateTime, TimestampMixin


class Lesson(TimestampMixin, Base):
    __tablename__ = "lessons"
    __table_args__ = (UniqueConstraint("slug", "version", name="uq_lesson_slug_version"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    course_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    published_at: Mapped[datetime | None] = mapped_column(H4DateTime, nullable=True)

    steps: Mapped[list["LessonStep"]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="LessonStep.sequence_no",
    )
    lesson_sources: Mapped[list["LessonSource"]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="LessonSource.display_order",
    )


class LessonStep(TimestampMixin, Base):
    __tablename__ = "lesson_steps"
    __table_args__ = (UniqueConstraint("lesson_id", "sequence_no", name="uq_lesson_step_seq"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    sequence_no: Mapped[int] = mapped_column(Integer, nullable=False)
    step_type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    completion_rule: Mapped[str] = mapped_column(Text, nullable=False)

    lesson: Mapped["Lesson"] = relationship(back_populates="steps")


class Source(TimestampMixin, Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    canonical_url: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    publisher: Mapped[str] = mapped_column(String(255), nullable=False)
    trust_status: Mapped[str] = mapped_column(String(32), nullable=False)

    versions: Mapped[list["SourceVersion"]] = relationship(
        back_populates="source",
        cascade="all, delete-orphan",
    )


class SourceVersion(TimestampMixin, Base):
    __tablename__ = "source_versions"
    __table_args__ = (UniqueConstraint("source_id", "version_label", name="uq_source_version_label"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("sources.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    version_label: Mapped[str] = mapped_column(String(64), nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    content_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    retrieved_at: Mapped[datetime] = mapped_column(
        H4DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    availability_status: Mapped[str] = mapped_column(String(32), nullable=False)

    source: Mapped["Source"] = relationship(back_populates="versions")


class LessonSource(TimestampMixin, Base):
    __tablename__ = "lesson_sources"
    __table_args__ = (UniqueConstraint("lesson_id", "source_version_id", name="uq_lesson_source_ver"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source_version_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("source_versions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    lesson: Mapped["Lesson"] = relationship(back_populates="lesson_sources")
    source_version: Mapped["SourceVersion"] = relationship()
