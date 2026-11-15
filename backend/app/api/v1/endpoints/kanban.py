from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.database import get_db
from app.core.security import uid
from app.core.timezone import ensure_utc
from app.models.kanban import KanbanBoard, KanbanColumn, Milestone, Project, Task, TaskDependency
from app.schemas.kanban import MilestoneCreate, ProjectCreate, TaskCreate, TaskDependencyCreate, TaskMove

router = APIRouter(tags=["Engineering Kanban & Projects"])


def _validate_h4_deadlines(
    db: Session,
    *,
    project: Project,
    milestone_id: str | None = None,
    task_due: datetime | None = None,
    milestone_due: datetime | None = None,
) -> Milestone | None:
    """
    Thực thi Hard Constraint H4 (Subtask Deadline Bound):
    Due Date(Task) <= Due Date(Milestone) <= Due Date(Project) với chuẩn datetime aware UTC.
    """
    proj_deadline = ensure_utc(project.deadline_utc)
    ms_due_utc = ensure_utc(milestone_due)
    task_due_utc = ensure_utc(task_due)

    if ms_due_utc and proj_deadline and ms_due_utc > proj_deadline:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ràng buộc H4 vi phạm: Hạn chót Milestone không được vượt quá deadline của Project.",
        )

    milestone: Milestone | None = None
    if milestone_id:
        milestone = db.get(Milestone, milestone_id)
        if not milestone or milestone.project_id != project.id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Milestone không thuộc Project của bảng Kanban này.",
            )
        bound_ms_due = ensure_utc(milestone.due_date_utc)
        if task_due_utc and bound_ms_due and task_due_utc > bound_ms_due:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Ràng buộc H4 vi phạm: Due Date của Task phải <= Due Date của Milestone.",
            )

    if task_due_utc and proj_deadline and task_due_utc > proj_deadline:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ràng buộc H4 vi phạm: Due Date của Task không được vượt quá deadline của Project.",
        )
    return milestone


@router.get("/projects")
def list_projects(
    _user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Danh sách các dự án kỹ thuật (Project Workspace)."""
    projects = db.scalars(select(Project).order_by(Project.created_at.desc())).all()
    return {"projects": [p.to_dict() for p in projects]}


@router.post("/projects", status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    _user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Tạo mới một dự án và khởi tạo sẵn Kanban Board mặc định."""
    now = datetime.now(timezone.utc)
    project_id = uid()
    board_id = uid()

    project = Project(
        id=project_id,
        title=payload.title,
        description=payload.description,
        mode=payload.mode,
        deadline_utc=ensure_utc(payload.deadline_utc),
        created_at=now,
        updated_at=now,
    )
    db.add(project)
    db.flush()

    db.add(KanbanBoard(id=board_id, project_id=project_id, title="Main Board"))
    db.flush()

    default_columns = (
        ("Backlog", 0),
        ("Ready", 1),
        ("In Progress", 2),
        ("Review / PR", 3),
        ("Done", 4),
    )
    for title, order in default_columns:
        db.add(KanbanColumn(id=uid(), board_id=board_id, title=title, position_order=order))

    db.flush()
    return {"project": project.to_dict(), "board_id": board_id}


@router.get("/projects/{project_id}/milestones")
def list_milestones(
    project_id: str,
    _user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Danh sách Milestone thuộc một Project."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy Project")
    milestones = db.scalars(
        select(Milestone).where(Milestone.project_id == project_id).order_by(Milestone.due_date_utc.asc())
    ).all()
    return {"milestones": [m.to_dict() for m in milestones]}


@router.post("/projects/{project_id}/milestones", status_code=status.HTTP_201_CREATED)
def create_milestone(
    project_id: str,
    payload: MilestoneCreate,
    _user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Tạo Milestone mới thuộc Project, thực thi ràng buộc H4 (Milestone <= Project Deadline)."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy Project")

    due_utc = ensure_utc(payload.due_date_utc)
    _validate_h4_deadlines(db, project=project, milestone_due=due_utc)

    now = datetime.now(timezone.utc)
    milestone = Milestone(
        id=uid(),
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        due_date_utc=due_utc,
        created_at=now,
        updated_at=now,
    )
    db.add(milestone)
    db.flush()
    return milestone.to_dict()


@router.get("/kanban/boards/{board_id}")
def get_kanban_board(
    board_id: str,
    _user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Lấy dữ liệu toàn bộ bảng Kanban gồm columns, tasks, milestones và dependencies."""
    board = db.get(KanbanBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Không tìm thấy Kanban Board")

    columns = db.scalars(
        select(KanbanColumn)
        .where(KanbanColumn.board_id == board_id)
        .order_by(KanbanColumn.position_order.asc())
    ).all()
    tasks = db.scalars(
        select(Task)
        .where(Task.board_id == board_id)
        .order_by(Task.position_order.asc())
    ).all()
    milestones = db.scalars(
        select(Milestone)
        .where(Milestone.project_id == board.project_id)
        .order_by(Milestone.created_at.asc())
    ).all()
    deps = db.execute(
        select(TaskDependency.task_id, TaskDependency.depends_on_task_id)
        .join(Task, Task.id == TaskDependency.task_id)
        .where(Task.board_id == board_id)
    ).mappings().all()

    return {
        "board": board.to_dict(),
        "columns": [c.to_dict() for c in columns],
        "tasks": [t.to_dict() for t in tasks],
        "milestones": [m.to_dict() for m in milestones],
        "dependencies": [dict(d) for d in deps],
    }


@router.post("/kanban/tasks", status_code=status.HTTP_201_CREATED)
def create_kanban_task(
    payload: TaskCreate,
    _user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Tạo mới một atomic task trên bảng Kanban, kiểm tra ràng buộc H4 UTC Deadline."""
    board = db.get(KanbanBoard, payload.board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Không tìm thấy Kanban Board")

    column = db.get(KanbanColumn, payload.column_id)
    if not column or column.board_id != board.id:
        raise HTTPException(status_code=422, detail="Cột Kanban không hợp lệ hoặc không thuộc bảng này")

    project = db.get(Project, board.project_id)
    if project:
        _validate_h4_deadlines(
            db,
            project=project,
            milestone_id=payload.milestone_id,
            task_due=ensure_utc(payload.due_date_utc),
        )

    max_pos = db.scalar(select(func.max(Task.position_order)).where(Task.column_id == payload.column_id))
    next_pos = (max_pos + 1) if max_pos is not None else 0
    now = datetime.now(timezone.utc)

    task = Task(
        id=uid(),
        board_id=payload.board_id,
        column_id=payload.column_id,
        milestone_id=payload.milestone_id,
        title=payload.title,
        description=payload.description,
        assignee_id=payload.assignee_id,
        priority=payload.priority,
        due_date_utc=ensure_utc(payload.due_date_utc),
        position_order=next_pos,
        created_at=now,
        updated_at=now,
    )
    db.add(task)
    db.flush()
    return task.to_dict()


@router.post("/kanban/tasks/dependencies", status_code=status.HTTP_201_CREATED)
def create_task_dependency(
    payload: TaskDependencyCreate,
    _user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Khai báo phụ thuộc giữa 2 task để áp dụng Hard Constraint H2 khi kéo sang Done."""
    if payload.task_id == payload.depends_on_task_id:
        raise HTTPException(status_code=422, detail="Task không thể phụ thuộc vào chính nó.")

    task = db.get(Task, payload.task_id)
    dep_task = db.get(Task, payload.depends_on_task_id)
    if not task or not dep_task:
        raise HTTPException(status_code=404, detail="Không tìm thấy task để tạo phụ thuộc.")

    existing = db.scalar(
        select(TaskDependency).where(
            TaskDependency.task_id == payload.task_id,
            TaskDependency.depends_on_task_id == payload.depends_on_task_id,
        )
    )
    if existing:
        return existing.to_dict()

    dep = TaskDependency(
        id=uid(),
        task_id=payload.task_id,
        depends_on_task_id=payload.depends_on_task_id,
    )
    db.add(dep)
    db.flush()
    return dep.to_dict()


@router.patch("/kanban/tasks/{task_id}/move")
def move_kanban_task(
    task_id: str,
    payload: TaskMove,
    _user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Di chuyển task giữa các cột, đồng thời kiểm tra Hard Constraint H2 (Task Dependencies)."""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy task")

    target_column = db.get(KanbanColumn, payload.column_id)
    if not target_column:
        raise HTTPException(status_code=404, detail="Không tìm thấy cột đích")

    if target_column.title.strip().lower() == "done":
        unmet_deps = db.execute(
            select(Task.id, Task.title)
            .join(TaskDependency, TaskDependency.depends_on_task_id == Task.id)
            .join(KanbanColumn, KanbanColumn.id == Task.column_id)
            .where(
                TaskDependency.task_id == task_id,
                func.lower(KanbanColumn.title) != "done",
            )
        ).mappings().all()
        if unmet_deps:
            dep_titles = ", ".join(f"'{d['title']}'" for d in unmet_deps)
            raise HTTPException(
                status_code=422,
                detail=f"Ràng buộc H2 vi phạm: Bạn phải hoàn thành các task phụ thuộc ({dep_titles}) trước khi hoàn thành task này.",
            )

    task.column_id = payload.column_id
    task.position_order = payload.new_position
    task.updated_at = datetime.now(timezone.utc)
    db.flush()
    return task.to_dict()
