from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, H4DateTime, TimestampMixin


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    mode: Mapped[str] = mapped_column(String(32), nullable=False, default="team")
    deadline_utc: Mapped[datetime | None] = mapped_column(H4DateTime, nullable=True)

    milestones: Mapped[list["Milestone"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )
    teams: Mapped[list["Team"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )
    boards: Mapped[list["KanbanBoard"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )


class Milestone(TimestampMixin, Base):
    """Mốc thời gian dự án dùng cho ràng buộc H4: Due Date(Task) <= Due Date(Milestone) <= Due Date(Project)."""

    __tablename__ = "milestones"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date_utc: Mapped[datetime | None] = mapped_column(H4DateTime, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="milestones")
    tasks: Mapped[list["Task"]] = relationship(back_populates="milestone")


class Team(TimestampMixin, Base):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    team_name: Mapped[str] = mapped_column(String(255), nullable=False)
    leader_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="teams")


class KanbanBoard(TimestampMixin, Base):
    __tablename__ = "kanban_boards"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="boards")
    columns: Mapped[list["KanbanColumn"]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="KanbanColumn.position_order",
    )
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="Task.position_order",
    )


class KanbanColumn(TimestampMixin, Base):
    __tablename__ = "kanban_columns"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    board_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("kanban_boards.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    position_order: Mapped[int] = mapped_column(Integer, nullable=False)

    board: Mapped["KanbanBoard"] = relationship(back_populates="columns")
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="column",
        cascade="all, delete-orphan",
    )


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    board_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("kanban_boards.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    column_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("kanban_columns.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    milestone_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("milestones.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    assignee_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    priority: Mapped[str] = mapped_column(String(32), nullable=False, default="medium")
    due_date_utc: Mapped[datetime | None] = mapped_column(H4DateTime, nullable=True)
    position_order: Mapped[int] = mapped_column(Integer, nullable=False)

    board: Mapped["KanbanBoard"] = relationship(back_populates="tasks")
    column: Mapped["KanbanColumn"] = relationship(back_populates="tasks")
    milestone: Mapped["Milestone | None"] = relationship(back_populates="tasks")


class TaskDependency(Base):
    __tablename__ = "task_dependencies"
    __table_args__ = (UniqueConstraint("task_id", "depends_on_task_id", name="uq_task_dependency"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    depends_on_task_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        H4DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
