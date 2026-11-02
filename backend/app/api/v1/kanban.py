from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import current_user
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc
from app.schemas.kanban import TaskCreate, TaskMove

router = APIRouter(tags=["Engineering Kanban & Projects"])


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    mode: str = "team"
    deadline_utc: str | None = None


@router.get("/projects")
def list_projects(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Danh sách các dự án kỹ thuật (Project Workspace)."""
    with db() as conn:
        projects = conn.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
    return {"projects": [row_dict(p) for p in projects]}


@router.post("/projects", status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Tạo mới một dự án và khởi tạo sẵn Kanban Board mặc định."""
    project_id = uid()
    timestamp = now_utc()
    board_id = uid()
    with db() as conn:
        conn.execute(
            "INSERT INTO projects(id, title, description, mode, deadline_utc, created_at) VALUES(?,?,?,?,?,?)",
            (project_id, payload.title, payload.description, payload.mode, payload.deadline_utc, timestamp),
        )
        # Create default board and columns
        conn.execute("INSERT INTO kanban_boards(id, project_id, title) VALUES(?,?,?)", (board_id, project_id, "Main Board"))
        columns = [
            ("Backlog", 0),
            ("Ready", 1),
            ("In Progress", 2),
            ("Review / PR", 3),
            ("Done", 4),
        ]
        for title, order in columns:
            conn.execute(
                "INSERT INTO kanban_columns(id, board_id, title, position_order) VALUES(?,?,?,?)",
                (uid(), board_id, title, order),
            )
        project = conn.execute("SELECT * FROM projects WHERE id=?", (project_id,)).fetchone()
    return {"project": row_dict(project), "board_id": board_id}


@router.get("/kanban/boards/{board_id}")
def get_kanban_board(board_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy dữ liệu toàn bộ bảng Kanban gồm các cột (columns) và danh sách thẻ công việc (tasks)."""
    with db() as conn:
        board = conn.execute("SELECT * FROM kanban_boards WHERE id=?", (board_id,)).fetchone()
        if not board:
            raise HTTPException(status_code=404, detail="Không tìm thấy Kanban Board")
        columns = conn.execute("SELECT * FROM kanban_columns WHERE board_id=? ORDER BY position_order ASC", (board_id,)).fetchall()
        tasks = conn.execute("SELECT * FROM tasks WHERE board_id=? ORDER BY position_order ASC", (board_id,)).fetchall()
        dependencies = conn.execute(
            """SELECT td.task_id, td.depends_on_task_id FROM task_dependencies td
               JOIN tasks t ON t.id = td.task_id WHERE t.board_id=?""",
            (board_id,),
        ).fetchall()
        
    return {
        "board": row_dict(board),
        "columns": [row_dict(c) for c in columns],
        "tasks": [row_dict(t) for t in tasks],
        "dependencies": [row_dict(d) for d in dependencies],
    }


@router.post("/kanban/tasks", status_code=status.HTTP_201_CREATED)
def create_kanban_task(payload: TaskCreate, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Tạo mới một atomic task trên bảng Kanban."""
    task_id = uid()
    timestamp = now_utc()
    with db() as conn:
        # Get highest position order in column
        max_pos = conn.execute("SELECT MAX(position_order) as m FROM tasks WHERE column_id=?", (payload.column_id,)).fetchone()["m"]
        next_pos = (max_pos + 1) if max_pos is not None else 0
        conn.execute(
            """INSERT INTO tasks(id, board_id, column_id, title, description, assignee_id, priority, due_date_utc, position_order, created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (task_id, payload.board_id, payload.column_id, payload.title, payload.description, payload.assignee_id, payload.priority, payload.due_date_utc, next_pos, timestamp),
        )
        task = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    return row_dict(task) or {}


@router.patch("/kanban/tasks/{task_id}/move")
def move_kanban_task(task_id: str, payload: TaskMove, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Di chuyển task giữa các cột, đồng thời kiểm tra Hard Constraint H2 (Task Dependencies)."""
    with db() as conn:
        task = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Không tìm thấy task")
            
        target_column = conn.execute("SELECT * FROM kanban_columns WHERE id=?", (payload.column_id,)).fetchone()
        if not target_column:
            raise HTTPException(status_code=404, detail="Không tìm thấy cột đích")
            
        # Hard Constraint H2: Nếu chuyển sang cột 'Done', các task phụ thuộc phải ở cột 'Done'
        if target_column["title"].strip().lower() == "done":
            unmet_deps = conn.execute(
                """SELECT t.id, t.title FROM task_dependencies td
                   JOIN tasks t ON t.id = td.depends_on_task_id
                   JOIN kanban_columns kc ON kc.id = t.column_id
                   WHERE td.task_id = ? AND LOWER(kc.title) != 'done'""",
                (task_id,),
            ).fetchall()
            if unmet_deps:
                dep_titles = ", ".join(f"'{d['title']}'" for d in unmet_deps)
                raise HTTPException(
                    status_code=422,
                    detail=f"Ràng buộc H2 vi phạm: Bạn phải hoàn thành các task phụ thuộc ({dep_titles}) trước khi hoàn thành task này.",
                )
                
        conn.execute(
            "UPDATE tasks SET column_id=?, position_order=? WHERE id=?",
            (payload.column_id, payload.new_position, task_id),
        )
        updated = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    return row_dict(updated) or {}
