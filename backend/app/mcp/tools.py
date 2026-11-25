"""Các MCP Tools cho CodeMind Learning OS.

Thực thi đọc và ghi dữ liệu trực tiếp trên MySQL 8.0 với đầy đủ kiểm tra
ràng buộc toàn vẹn dữ liệu, RBAC, và Hard Constraint H2 (Definition of Done & Dependencies).
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.api.deps import record_audit_log
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc
from app.mcp.protocol import McpDispatcher


def _resolve_project_id(conn: Any, raw_id: str) -> str:
    """Cho phép truyền ID ('prj-codemind') hoặc mã đồ án ('PRJ-CODEMIND')."""
    row = conn.execute(
        "SELECT id FROM engineering_projects WHERE id = ? OR code = ? LIMIT 1",
        (raw_id, raw_id),
    ).fetchone()
    return row["id"] if row else raw_id


def _mcp_can_read_project(caller: dict[str, Any] | None, proj_row: Any) -> bool:
    if not caller:
        return True
    role = str(caller.get("role") or "student").strip().lower()
    if role in ("admin", "org_admin"):
        return True
    from app.api.v1.kanban import is_user_in_project
    return is_user_in_project(caller, proj_row)


def _mcp_assert_project_access(
    caller: dict[str, Any] | None,
    proj_row: Any,
    *,
    write: bool = False,
    require_advisor_for_instructor: bool = False,
) -> None:
    if not caller:
        return
    role = str(caller.get("role") or "student").strip().lower()
    if role in ("admin", "org_admin"):
        return
    p_dict = dict(proj_row)
    from app.api.v1.kanban import _normalize_project_status, _user_matches_project_advisor, is_user_in_project

    if role == "student":
        if not is_user_in_project(caller, proj_row):
            raise ValueError("Quyền truy cập bị từ chối: Bạn không phải thành viên của đồ án này.")
        if write:
            if bool(p_dict.get("is_frozen")):
                raise ValueError("Đồ án đã bị đóng băng nộp bài, không thể thêm hoặc sửa công việc.")
            if _normalize_project_status(p_dict.get("status")) == "delivered":
                raise ValueError("Đồ án đã bảo vệ xong, không thể chỉnh sửa công việc.")
        return

    if role == "instructor":
        is_adv = _user_matches_project_advisor(caller, proj_row)
        rev_id = str(p_dict.get("reviewer_id") or "").strip()
        is_rev = bool(rev_id and rev_id == str(caller.get("id") or "").strip())
        if write or require_advisor_for_instructor:
            if not is_adv:
                raise ValueError("Chỉ Giảng viên hướng dẫn của đồ án này hoặc Admin mới có quyền thay đổi công việc.")
        elif not (is_adv or is_rev):
            raise ValueError("Bạn không phụ trách hướng dẫn hoặc phản biện đồ án này.")


def register_all_tools(dispatcher: McpDispatcher) -> None:
    """Đăng ký toàn bộ danh mục MCP tools vào dispatcher."""

    # ------------------------------------------------------------------------
    # 1. list_projects
    # ------------------------------------------------------------------------
    def handle_list_projects(args: dict[str, Any]) -> dict[str, Any]:
        status_filter = args.get("status")
        course_filter = args.get("course_id")
        keyword = args.get("keyword", "").strip()
        limit = min(int(args.get("limit", 20)), 100)

        query = "SELECT * FROM engineering_projects WHERE 1=1"
        params: list[Any] = []

        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
        if course_filter:
            query += " AND course_id = ?"
            params.append(course_filter)
        if keyword:
            query += " AND (code LIKE ? OR name LIKE ? OR client LIKE ?)"
            kw = f"%{keyword}%"
            params.extend([kw, kw, kw])

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        caller = args.get("_caller")
        with db() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()
            projects = []
            for r in rows:
                if not _mcp_can_read_project(caller, r):
                    continue
                p = row_dict(r)
                pid = p["id"]
                # Thống kê số tasks
                task_stats = conn.execute(
                    """SELECT column_id, COUNT(*) as cnt, SUM(points) as pts
                       FROM engineering_tasks
                       WHERE project_id = ?
                       GROUP BY column_id""",
                    (pid,),
                ).fetchall()
                col_counts = {t["column_id"]: t["cnt"] for t in task_stats}
                total_tasks = sum(t["cnt"] for t in task_stats)
                done_tasks = col_counts.get("done", 0) + col_counts.get("verified", 0)
                completion_rate = round((done_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

                # Thống kê commit
                commit_cnt = conn.execute(
                    "SELECT COUNT(*) as c FROM git_commits WHERE project_id = ?",
                    (pid,),
                ).fetchone()["c"]

                try:
                    team = json.loads(p.get("team_json") or "[]")
                except Exception:
                    team = []

                projects.append({
                    "id": p["id"],
                    "code": p["code"],
                    "name": p["name"],
                    "course": p["course"],
                    "course_id": p.get("course_id"),
                    "instructor_name": p.get("instructor_name"),
                    "sprint": p["sprint"],
                    "status": p["status"],
                    "due_date": p["due_date"],
                    "story_points_budget": p["story_points_budget"],
                    "total_tasks": total_tasks,
                    "done_tasks": done_tasks,
                    "completion_rate_pct": completion_rate,
                    "total_commits": commit_cnt,
                    "team_members_count": len(team),
                    "team": team,
                })

        return {"count": len(projects), "projects": projects}

    dispatcher.register_tool(
        name="list_projects",
        description="Lấy danh sách các đồ án kỹ thuật (Engineering Projects) trên CodeMind, kèm thống kê tiến độ, tasks, commits và thành viên.",
        input_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Lọc theo trạng thái ('active', 'completed', 'archived')"},
                "course_id": {"type": "string", "description": "Lọc theo mã khóa học (ví dụ: 'oop', 'dsa')"},
                "keyword": {"type": "string", "description": "Tìm kiếm theo mã đồ án, tên đề tài hoặc đối tác doanh nghiệp"},
                "limit": {"type": "integer", "description": "Số lượng kết quả tối đa (mặc định: 20)", "default": 20},
            },
        },
        handler=handle_list_projects,
    )

    # ------------------------------------------------------------------------
    # 2. get_project_detail
    # ------------------------------------------------------------------------
    def handle_get_project_detail(args: dict[str, Any]) -> dict[str, Any]:
        project_id = args.get("project_id", "").strip()
        if not project_id:
            raise ValueError("Thiếu tham số 'project_id'.")

        caller = args.get("_caller")
        with db() as conn:
            proj = conn.execute("SELECT * FROM engineering_projects WHERE id = ?", (project_id,)).fetchone()
            if not proj:
                # Thử tìm theo code (e.g. PRJ-01)
                proj = conn.execute("SELECT * FROM engineering_projects WHERE code = ?", (project_id,)).fetchone()
            if not proj:
                raise ValueError(f"Không tìm thấy đồ án với ID hoặc Code '{project_id}'.")
            _mcp_assert_project_access(caller, proj, write=False)

            p = row_dict(proj)
            pid = p["id"]

            # Git repo
            repo_row = conn.execute("SELECT * FROM git_repositories WHERE project_id = ?", (pid,)).fetchone()
            repo = row_dict(repo_row) if repo_row else None

            # Tasks breakdown
            tasks = conn.execute(
                """SELECT id, code, title, column_id, priority, points, estimate_hours, assignee_user_id, depends_on
                   FROM engineering_tasks WHERE project_id = ?
                   ORDER BY position_order ASC""",
                (pid,),
            ).fetchall()

            columns_summary = {
                "backlog": 0,
                "ready": 0,
                "in-progress": 0,
                "review": 0,
                "done": 0,
                "verified": 0,
            }
            for t in tasks:
                col = t["column_id"]
                columns_summary[col] = columns_summary.get(col, 0) + 1

            # Commits count & PRs count
            commit_cnt = conn.execute("SELECT COUNT(*) as c FROM git_commits WHERE project_id = ?", (pid,)).fetchone()["c"]
            pr_cnt = conn.execute("SELECT COUNT(*) as c FROM git_pull_requests WHERE project_id = ?", (pid,)).fetchone()["c"]

            try:
                team = json.loads(p.get("team_json") or "[]")
            except Exception:
                team = []

        return {
            "project": {
                "id": p["id"],
                "code": p["code"],
                "name": p["name"],
                "client": p["client"],
                "course": p["course"],
                "course_id": p.get("course_id"),
                "instructor_name": p.get("instructor_name"),
                "sprint": p["sprint"],
                "status": p["status"],
                "due_date": p["due_date"],
                "story_points_budget": p["story_points_budget"],
                "team": team,
            },
            "git_repository": repo,
            "tasks_summary": {
                "total": len(tasks),
                "by_column": columns_summary,
            },
            "git_summary": {
                "total_commits": commit_cnt,
                "total_pull_requests": pr_cnt,
            },
            "tasks": [row_dict(t) for t in tasks],
        }

    dispatcher.register_tool(
        name="get_project_detail",
        description="Lấy chi tiết toàn diện của một đồ án kỹ thuật: kiến trúc, kho mã Git, thành viên nhóm, phân bổ Kanban tasks.",
        input_schema={
            "type": "object",
            "required": ["project_id"],
            "properties": {
                "project_id": {"type": "string", "description": "ID hoặc mã đồ án (ví dụ: 'proj-oop-ecommerce' hoặc 'PRJ-01')"},
            },
        },
        handler=handle_get_project_detail,
    )

    _col_labels = {
        "backlog": "Backlog",
        "ready": "Cần làm",
        "todo": "Cần làm",
        "in-progress": "Đang làm",
        "in_progress": "Đang làm",
        "in_review": "Đang review",
        "done": "Hoàn thành",
        "verified": "Đã nghiệm thu",
        "fail": "Cần sửa lại",
    }

    # ------------------------------------------------------------------------
    # 3. list_kanban_tasks
    # ------------------------------------------------------------------------
    def handle_list_kanban_tasks(args: dict[str, Any]) -> dict[str, Any]:
        raw_project_id = args.get("project_id", "").strip()
        column_id = args.get("column_id")
        assignee_id = args.get("assignee_user_id")
        priority = args.get("priority")
        limit = min(int(args.get("limit", 50)), 200)

        if not raw_project_id:
            raise ValueError("Thiếu tham số 'project_id'.")

        caller = args.get("_caller")
        with db() as conn:
            project_id = _resolve_project_id(conn, raw_project_id)
            proj = conn.execute("SELECT * FROM engineering_projects WHERE id = ?", (project_id,)).fetchone()
            if proj:
                _mcp_assert_project_access(caller, proj, write=False)
            query = "SELECT * FROM engineering_tasks WHERE project_id = ?"
            params: list[Any] = [project_id]

            if column_id:
                query += " AND column_id = ?"
                params.append(column_id)
            if assignee_id:
                query += " AND assignee_user_id = ?"
                params.append(assignee_id)
            if priority:
                query += " AND priority = ?"
                params.append(priority)

            query += " ORDER BY position_order ASC LIMIT ?"
            params.append(limit)

            rows = conn.execute(query, tuple(params)).fetchall()
            tasks = []
            for r in rows:
                t = row_dict(r)
                # Parse JSON fields
                for f in ["checklist_json", "dod_json", "assignee_json", "audit_logs_json"]:
                    try:
                        t[f] = json.loads(t.get(f) or "[]")
                    except Exception:
                        t[f] = []
                tasks.append(t)

        return {"project_id": project_id, "count": len(tasks), "tasks": tasks}

    dispatcher.register_tool(
        name="list_kanban_tasks",
        description="Lấy danh sách các công việc trên bảng Kanban của một đồ án (có thể lọc theo cột, người thực hiện, mức độ ưu tiên).",
        input_schema={
            "type": "object",
            "required": ["project_id"],
            "properties": {
                "project_id": {"type": "string", "description": "ID đồ án kỹ thuật"},
                "column_id": {"type": "string", "description": "Cột Kanban ('backlog', 'ready', 'in-progress', 'review', 'done', 'verified')"},
                "assignee_user_id": {"type": "string", "description": "Lọc theo ID sinh viên được phân công"},
                "priority": {"type": "string", "description": "Lọc theo ưu tiên ('low', 'medium', 'high', 'critical')"},
                "limit": {"type": "integer", "description": "Số lượng tối đa (mặc định: 50)", "default": 50},
            },
        },
        handler=handle_list_kanban_tasks,
    )

    # ------------------------------------------------------------------------
    # 4. create_kanban_task
    # ------------------------------------------------------------------------
    def handle_create_kanban_task(args: dict[str, Any]) -> dict[str, Any]:
        project_id = args.get("project_id", "").strip()
        title = args.get("title", "").strip()
        if not project_id or not title:
            raise ValueError("Cần cung cấp cả 'project_id' và 'title'.")

        description = args.get("description", "").strip()
        points = int(args.get("points", 3))
        priority = args.get("priority", "medium").lower()
        moscow = args.get("moscow", "should").lower()
        epic = args.get("epic", "Sprint Goal")
        estimate_hours = float(args.get("estimate_hours", 4.0))
        depends_on = args.get("depends_on")
        column_id = args.get("column_id", "backlog").strip().lower()
        actor_name = args.get("actor_name", "MCP Agent")

        caller = args.get("_caller")
        caller_role = str((caller or {}).get("role") or "").strip().lower()
        if caller_role == "student" and column_id == "verified":
            raise ValueError("Học viên không thể khởi tạo task trực tiếp ở cột 'verified' (Đã nghiệm thu).")

        now = now_utc()
        task_id = uid()

        with db() as conn:
            project_id = _resolve_project_id(conn, project_id)
            proj = conn.execute("SELECT * FROM engineering_projects WHERE id = ?", (project_id,)).fetchone()
            if not proj:
                raise ValueError(f"Không tìm thấy đồ án '{project_id}'.")
            _mcp_assert_project_access(caller, proj, write=True)

            # Tính toán mã task tự động: tìm số thứ tự lớn nhất
            count_row = conn.execute(
                "SELECT COUNT(*) as c FROM engineering_tasks WHERE project_id = ?",
                (project_id,),
            ).fetchone()
            next_num = (count_row["c"] or 0) + 1
            code = f"TASK-{next_num:03d}"

            # Vị trí thứ tự
            max_pos = conn.execute(
                "SELECT MAX(position_order) as m FROM engineering_tasks WHERE project_id=? AND column_id=?",
                (project_id, column_id),
            ).fetchone()["m"]
            next_pos = (max_pos + 1) if max_pos is not None else 0

            # Checklist & DoD mặc định (khớp chuẩn key 'done' của KanbanBoard)
            checklist = [
                {"id": uid(), "text": "Phân tích yêu cầu và viết test case ban đầu", "done": False},
                {"id": uid(), "text": "Triển khai mã nguồn lõi và hoàn thành Unit Test", "done": False},
            ]
            dod = [
                {"id": uid(), "text": "Mã nguồn tuân thủ Clean Code & chạy qua Static Analysis", "done": False},
                {"id": uid(), "text": "Unit Test Coverage đạt tối thiểu 80%", "done": False},
            ]
            audit_logs = [
                {
                    "timestamp": now,
                    "action": "Tạo task mới từ MCP Agent",
                    "actor": actor_name,
                    "user": actor_name,
                    "fromColumn": "MCP Agent",
                    "toColumn": _col_labels.get(column_id, column_id),
                    "detail": f"Khởi tạo task {code} trên cột '{column_id}' với {points} story points.",
                }
            ]

            assignee_json = json.dumps({"name": "Chưa phân công", "avatar": "U", "role": "Unassigned"}, ensure_ascii=False)

            conn.execute(
                """INSERT INTO engineering_tasks (
                    id, project_id, code, title, description, column_id, priority, moscow,
                    points, assignee_user_id, assignee_json, estimate_hours, due_date,
                    epic, epic_color, depends_on, checklist_json, dod_json,
                    audit_logs_json, position_order, created_at, updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    task_id,
                    project_id,
                    code,
                    title,
                    description,
                    column_id,
                    priority,
                    moscow,
                    points,
                    None,
                    assignee_json,
                    estimate_hours,
                    "",
                    epic,
                    "bg-blue-50 text-blue-700 border-blue-200",
                    depends_on,
                    json.dumps(checklist, ensure_ascii=False),
                    json.dumps(dod, ensure_ascii=False),
                    json.dumps(audit_logs, ensure_ascii=False),
                    next_pos,
                    now,
                    now,
                ),
            )
            created_task = conn.execute("SELECT * FROM engineering_tasks WHERE id = ?", (task_id,)).fetchone()

        res = row_dict(created_task)
        res["checklist_json"] = checklist
        res["dod_json"] = dod
        res["audit_logs_json"] = audit_logs
        return {"success": True, "task": res}

    dispatcher.register_tool(
        name="create_kanban_task",
        description="Tạo một công việc (Kanban Task) mới vào đồ án kỹ thuật với đầy đủ checklist, Definition of Done và audit log.",
        input_schema={
            "type": "object",
            "required": ["project_id", "title"],
            "properties": {
                "project_id": {"type": "string", "description": "ID đồ án kỹ thuật"},
                "title": {"type": "string", "description": "Tiêu đề công việc"},
                "description": {"type": "string", "description": "Mô tả chi tiết kỹ thuật"},
                "points": {"type": "integer", "description": "Điểm Story Point (mặc định: 3)", "default": 3},
                "priority": {"type": "string", "description": "Mức ưu tiên ('low', 'medium', 'high', 'critical')", "default": "medium"},
                "epic": {"type": "string", "description": "Tên Epic hoặc Milestone", "default": "Sprint Goal"},
                "estimate_hours": {"type": "number", "description": "Thời gian ước tính (giờ)", "default": 4.0},
                "depends_on": {"type": "string", "description": "ID task phụ thuộc (phải hoàn thành trước)"},
                "column_id": {"type": "string", "description": "Cột ban đầu ('backlog', 'ready', 'in-progress')", "default": "backlog"},
                "actor_name": {"type": "string", "description": "Tên tác nhân ghi nhận audit log", "default": "MCP Agent"},
            },
        },
        handler=handle_create_kanban_task,
    )

    # ------------------------------------------------------------------------
    # 5. move_kanban_task (với kiểm tra Ràng buộc H2 nghiêm ngặt)
    # ------------------------------------------------------------------------
    def handle_move_kanban_task(args: dict[str, Any]) -> dict[str, Any]:
        task_id = args.get("task_id", "").strip()
        target_column = args.get("target_column", "").strip().lower()
        actor_name = args.get("actor_name", "MCP Agent")

        if not task_id or not target_column:
            raise ValueError("Thiếu tham số 'task_id' hoặc 'target_column'.")

        valid_columns = ("backlog", "ready", "in-progress", "review", "done", "verified")
        if target_column not in valid_columns:
            raise ValueError(f"target_column không hợp lệ: '{target_column}'. Cho phép: {list(valid_columns)}")

        caller = args.get("_caller")
        caller_role = str((caller or {}).get("role") or "").strip().lower()
        if caller_role == "student" and target_column == "verified":
            raise ValueError(
                "RBAC Guard: Học viên không được phép tự chuyển task sang cột 'verified' (Đã nghiệm thu). "
                "Chỉ Giảng viên hướng dẫn hoặc Admin mới có quyền nghiệm thu."
            )

        now = now_utc()

        with db() as conn:
            task = conn.execute("SELECT * FROM engineering_tasks WHERE id = ?", (task_id,)).fetchone()
            if not task:
                task = conn.execute("SELECT * FROM engineering_tasks WHERE code = ?", (task_id,)).fetchone()
            if not task:
                raise ValueError(f"Không tìm thấy task '{task_id}'.")
            task = row_dict(task)

            proj = conn.execute("SELECT * FROM engineering_projects WHERE id = ?", (task["project_id"],)).fetchone()
            if proj:
                _mcp_assert_project_access(
                    caller,
                    proj,
                    write=True,
                    require_advisor_for_instructor=True,
                )

            actual_id = task["id"]
            current_col = task["column_id"]

            # KIỂM TRA RÀNG BUỘC H2
            # Nếu task được chuyển sang 'done' hoặc 'verified', kiểm tra xem task cha đã hoàn thành chưa
            if target_column in ("done", "verified", "in-progress"):
                dep_id = task["depends_on"]
                if dep_id:
                    parent = conn.execute(
                        "SELECT id, code, title, column_id FROM engineering_tasks WHERE id=? AND project_id=?",
                        (dep_id, task["project_id"]),
                    ).fetchone()
                    if parent and parent["column_id"] not in ("done", "verified"):
                        raise ValueError(
                            f"Vi phạm Ràng buộc H2 (Hard Constraint): Task #{parent['code']} ('{parent['title']}') "
                            f"đang ở trạng thái '{parent['column_id']}'. "
                            f"Task phụ thuộc này bắt buộc phải hoàn thành ('done' hoặc 'verified') "
                            f"trước khi task #{task['code']} có thể chuyển sang '{target_column}'."
                        )

            if current_col in ("done", "verified") and target_column not in ("done", "verified"):
                dependent = conn.execute(
                    "SELECT code, title FROM engineering_tasks WHERE project_id=? AND depends_on=? AND column_id IN ('done', 'verified') LIMIT 1",
                    (task["project_id"], actual_id),
                ).fetchone()
                if dependent:
                    raise ValueError(
                        f"Vi phạm Ràng buộc H2 ngược: Không thể kéo lùi task #{task['code']} khi task phụ thuộc "
                        f"#{dependent['code']} ('{dependent['title']}') đang ở trạng thái Hoàn thành / Đã nghiệm thu."
                    )

            if caller and caller_role == "student" and target_column == "done":
                from app.api.v1.kanban import _check_git_proof_for_done
                try:
                    _check_git_proof_for_done(conn, caller, task, target_column)
                except Exception as exc:
                    detail = getattr(exc, "detail", str(exc))
                    raise ValueError(str(detail))

            # Cập nhật Audit Log
            try:
                logs = json.loads(task["audit_logs_json"] or "[]")
            except Exception:
                logs = []

            logs.append({
                "timestamp": now,
                "action": f"Chuyển cột: {current_col} -> {target_column}",
                "actor": actor_name,
                "user": actor_name,
                "fromColumn": _col_labels.get(current_col, current_col),
                "toColumn": _col_labels.get(target_column, target_column),
                "detail": f"Được cập nhật bởi MCP Tool move_kanban_task lúc {now}",
            })

            # Tính toán position mới
            max_pos = conn.execute(
                "SELECT MAX(position_order) as m FROM engineering_tasks WHERE project_id=? AND column_id=?",
                (task["project_id"], target_column),
            ).fetchone()["m"]
            next_pos = (max_pos + 1) if max_pos is not None else 0

            # Cập nhật DB
            conn.execute(
                """UPDATE engineering_tasks
                   SET column_id = ?, position_order = ?, audit_logs_json = ?, updated_at = ?
                   WHERE id = ?""",
                (target_column, next_pos, json.dumps(logs, ensure_ascii=False), now, actual_id),
            )

            # Nếu chuyển sang verified hoặc done -> cộng XP cho sinh viên thực tế
            xp_reward = 0
            if target_column in ("verified", "done") and task.get("xp_awarded", 0) == 0:
                xp_reward = max(50, int(task.get("points") or 3) * 10)
                conn.execute(
                    "UPDATE engineering_tasks SET xp_awarded = ? WHERE id = ?",
                    (xp_reward, actual_id),
                )
                target_uid = task.get("assignee_user_id")
                if not target_uid:
                    try:
                        from app.api.v1.kanban import _resolve_student_uid_from_assignee
                        ass_obj = json.loads(task.get("assignee_json") or "{}")
                        target_uid = _resolve_student_uid_from_assignee(conn, ass_obj)
                    except Exception:
                        target_uid = None
                if not target_uid and caller and caller_role == "student":
                    target_uid = caller.get("id")
                if target_uid:
                    conn.execute(
                        "UPDATE student_profiles SET exp_points = exp_points + ? WHERE user_id = ?",
                        (xp_reward, target_uid),
                    )

            updated = conn.execute("SELECT * FROM engineering_tasks WHERE id = ?", (actual_id,)).fetchone()

        return {
            "success": True,
            "task_id": actual_id,
            "code": updated["code"],
            "title": updated["title"],
            "previous_column": current_col,
            "current_column": target_column,
            "xp_awarded": xp_reward,
            "updated_at": now,
        }

    dispatcher.register_tool(
        name="move_kanban_task",
        description="Chuyển trạng thái cột của Task trên Kanban Board. Tự động kiểm tra nghiêm ngặt Ràng buộc H2 (Definition of Done & Task Dependencies) và ghi nhận audit log.",
        input_schema={
            "type": "object",
            "required": ["task_id", "target_column"],
            "properties": {
                "task_id": {"type": "string", "description": "ID hoặc mã task (ví dụ: 'TASK-001')"},
                "target_column": {
                    "type": "string",
                    "description": "Cột đích",
                    "enum": ["backlog", "ready", "in-progress", "review", "done", "verified"],
                },
                "actor_name": {"type": "string", "description": "Tên người hoặc agent thực hiện di chuyển", "default": "MCP Agent"},
            },
        },
        handler=handle_move_kanban_task,
    )

    # ------------------------------------------------------------------------
    # 6. list_git_commits
    # ------------------------------------------------------------------------
    def handle_list_git_commits(args: dict[str, Any]) -> dict[str, Any]:
        raw_project_id = args.get("project_id", "").strip()
        branch = args.get("branch")
        author_name = args.get("author_name")
        limit = min(int(args.get("limit", 20)), 100)

        if not raw_project_id:
            raise ValueError("Thiếu tham số 'project_id'.")

        caller = args.get("_caller")
        with db() as conn:
            project_id = _resolve_project_id(conn, raw_project_id)
            proj = conn.execute("SELECT * FROM engineering_projects WHERE id = ?", (project_id,)).fetchone()
            if proj:
                _mcp_assert_project_access(caller, proj, write=False)
            query = "SELECT * FROM git_commits WHERE project_id = ?"
            params: list[Any] = [project_id]

            if branch:
                query += " AND branch = ?"
                params.append(branch)
            if author_name:
                query += " AND author_name LIKE ?"
                params.append(f"%{author_name}%")

            query += " ORDER BY position_order ASC, created_at DESC LIMIT ?"
            params.append(limit)

            rows = conn.execute(query, tuple(params)).fetchall()
            commits = []
            for r in rows:
                c = row_dict(r)
                try:
                    c["files_changed_json"] = json.loads(c.get("files_changed_json") or "[]")
                except Exception:
                    c["files_changed_json"] = []
                commits.append(c)

        return {"project_id": project_id, "count": len(commits), "commits": commits}

    dispatcher.register_tool(
        name="list_git_commits",
        description="Lấy danh sách các Git commits của đồ án kỹ thuật từ MySQL (kèm mã SHA, nhánh branch, tác giả, file thay đổi, diff stats).",
        input_schema={
            "type": "object",
            "required": ["project_id"],
            "properties": {
                "project_id": {"type": "string", "description": "ID đồ án kỹ thuật"},
                "branch": {"type": "string", "description": "Lọc theo nhánh Git (ví dụ: 'main', 'develop', 'feature/auth')"},
                "author_name": {"type": "string", "description": "Lọc theo tên tác giả commit"},
                "limit": {"type": "integer", "description": "Số lượng tối đa (mặc định: 20)", "default": 20},
            },
        },
        handler=handle_list_git_commits,
    )

    # ------------------------------------------------------------------------
    # 7. list_pull_requests
    # ------------------------------------------------------------------------
    def handle_list_pull_requests(args: dict[str, Any]) -> dict[str, Any]:
        raw_project_id = args.get("project_id", "").strip()
        status_filter = args.get("status")
        limit = min(int(args.get("limit", 20)), 100)

        if not raw_project_id:
            raise ValueError("Thiếu tham số 'project_id'.")

        caller = args.get("_caller")
        with db() as conn:
            project_id = _resolve_project_id(conn, raw_project_id)
            proj = conn.execute("SELECT * FROM engineering_projects WHERE id = ?", (project_id,)).fetchone()
            if proj:
                _mcp_assert_project_access(caller, proj, write=False)
            query = "SELECT * FROM git_pull_requests WHERE project_id = ?"
            params: list[Any] = [project_id]

            if status_filter:
                query += " AND status = ?"
                params.append(status_filter)

            query += " ORDER BY pr_number DESC LIMIT ?"
            params.append(limit)

            rows = conn.execute(query, tuple(params)).fetchall()
            prs = []
            for r in rows:
                p = row_dict(r)
                for f in ["ai_findings_json", "diff_preview_json", "defense_questions_json"]:
                    try:
                        p[f] = json.loads(p.get(f) or "[]")
                    except Exception:
                        p[f] = []
                prs.append(p)

        return {"project_id": project_id, "count": len(prs), "pull_requests": prs}

    dispatcher.register_tool(
        name="list_pull_requests",
        description="Lấy danh sách Pull Requests của đồ án, kèm điểm AI Code Review, đánh giá độ ảnh hưởng (blast radius), phát hiện lỗi và câu hỏi phản biện.",
        input_schema={
            "type": "object",
            "required": ["project_id"],
            "properties": {
                "project_id": {"type": "string", "description": "ID đồ án kỹ thuật"},
                "status": {"type": "string", "description": "Lọc trạng thái PR ('open', 'merged', 'closed')"},
                "limit": {"type": "integer", "description": "Số lượng tối đa (mặc định: 20)", "default": 20},
            },
        },
        handler=handle_list_pull_requests,
    )

    # ------------------------------------------------------------------------
    # 8. list_academic_schedules
    # ------------------------------------------------------------------------
    def handle_list_academic_schedules(args: dict[str, Any]) -> dict[str, Any]:
        category = args.get("category")
        course_id = args.get("course_id")
        date = args.get("date")
        limit = min(int(args.get("limit", 20)), 100)

        query = "SELECT * FROM academic_schedules WHERE 1=1"
        params: list[Any] = []

        if category:
            query += " AND category = ?"
            params.append(category)
        if course_id:
            query += " AND course_id = ?"
            params.append(course_id)
        if date:
            query += " AND schedule_date = ?"
            params.append(date)

        query += " ORDER BY schedule_date ASC, start_hour ASC LIMIT ?"
        params.append(limit)

        with db() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()
            schedules = [row_dict(r) for r in rows]

        return {"count": len(schedules), "schedules": schedules}

    dispatcher.register_tool(
        name="list_academic_schedules",
        description="Lấy lịch bảo vệ đồ án, buổi cố vấn 1-on-1, lịch thi hoặc học tập trên CodeMind Campus.",
        input_schema={
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Loại lịch ('defense', '1-on-1', 'exam', 'lecture')"},
                "course_id": {"type": "string", "description": "Mã khóa học (ví dụ: 'oop', 'dsa')"},
                "date": {"type": "string", "description": "Ngày diễn ra (định dạng YYYY-MM-DD)"},
                "limit": {"type": "integer", "description": "Số lượng tối đa (mặc định: 20)", "default": 20},
            },
        },
        handler=handle_list_academic_schedules,
    )

    # ------------------------------------------------------------------------
    # 9. list_defense_sessions
    # ------------------------------------------------------------------------
    def handle_list_defense_sessions(args: dict[str, Any]) -> dict[str, Any]:
        caller = args.get("_caller")
        caller_role = str((caller or {}).get("role") or "").strip().lower()
        project_id = args.get("project_id")
        user_id = args.get("user_id")
        if caller and caller_role == "student":
            user_id = caller["id"]
        status_filter = args.get("status")
        limit = min(int(args.get("limit", 20)), 100)

        query = "SELECT * FROM defense_sessions WHERE 1=1"
        params: list[Any] = []

        if project_id:
            query += " AND project_id = ?"
            params.append(project_id)
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        with db() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()
            sessions = []
            for r in rows:
                s = row_dict(r)
                try:
                    s["transcript_json"] = json.loads(s.get("transcript_json") or "[]")
                except Exception:
                    s["transcript_json"] = []
                sessions.append(s)

        return {"count": len(sessions), "defense_sessions": sessions}

    dispatcher.register_tool(
        name="list_defense_sessions",
        description="Lấy danh sách các phiên phản biện đồ án AI Defense, kèm điểm Kiến trúc, Thuật toán, Triển khai và biên bản câu hỏi.",
        input_schema={
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "Lọc theo ID đồ án"},
                "user_id": {"type": "string", "description": "Lọc theo ID sinh viên bảo vệ"},
                "status": {"type": "string", "description": "Trạng thái ('in_progress', 'completed', 'flagged')"},
                "limit": {"type": "integer", "description": "Số lượng tối đa (mặc định: 20)", "default": 20},
            },
        },
        handler=handle_list_defense_sessions,
    )

    # ------------------------------------------------------------------------
    # 10. get_student_analytics
    # ------------------------------------------------------------------------
    def handle_get_student_analytics(args: dict[str, Any]) -> dict[str, Any]:
        caller = args.get("_caller")
        caller_role = str((caller or {}).get("role") or "").strip().lower()
        requested_user_id = str(args.get("user_id") or "").strip()
        if caller and caller_role == "student":
            if not requested_user_id or requested_user_id in ("usr-sv-02", "student-demo"):
                requested_user_id = str(caller["id"])
            elif requested_user_id != str(caller["id"]) and requested_user_id != str(caller.get("user_code") or ""):
                raise ValueError("Quyền truy cập bị từ chối: Học viên chỉ được xem phân tích học tập của chính mình.")

        with db() as conn:
            user = None
            if requested_user_id:
                user = conn.execute(
                    "SELECT id, user_code, email, full_name, display_name, role FROM users WHERE id = ? OR user_code = ? LIMIT 1",
                    (requested_user_id, requested_user_id),
                ).fetchone()
            if not user and (not requested_user_id or requested_user_id == "student-demo"):
                user = conn.execute(
                    "SELECT id, user_code, email, full_name, display_name, role FROM users WHERE id = 'usr-sv-02' LIMIT 1"
                ).fetchone()
                if not user:
                    user = conn.execute(
                        "SELECT id, user_code, email, full_name, display_name, role FROM users WHERE role = 'student' ORDER BY id ASC LIMIT 1"
                    ).fetchone()
            if not user:
                raise ValueError(f"Không tìm thấy người dùng với ID '{requested_user_id}'.")

            user_dict = row_dict(user)
            resolved_user_id = user_dict["id"]

            profile = conn.execute(
                "SELECT * FROM student_profiles WHERE user_id = ?",
                (resolved_user_id,),
            ).fetchone()
            prof_dict = row_dict(profile) if profile else {}

            # Số lượng commit đóng góp
            commits_cnt = conn.execute(
                "SELECT COUNT(*) as c FROM git_commits WHERE author_name LIKE ?",
                (f"%{user_dict['full_name']}%",),
            ).fetchone()["c"]

            # Số tasks đã hoàn thành
            tasks_done = conn.execute(
                """SELECT COUNT(*) as c FROM engineering_tasks
                   WHERE assignee_user_id = ? AND column_id IN ('done', 'verified')""",
                (resolved_user_id,),
            ).fetchone()["c"]

            # Dual submissions
            subs = conn.execute(
                "SELECT id, chapter_title, status, defense_score, final_score FROM dual_submissions WHERE user_id = ?",
                (resolved_user_id,),
            ).fetchall()

        exp_points = int(prof_dict.get("exp_points") or 0)
        level = max(1, int(exp_points // 250) + 1)
        streak_days = int(prof_dict.get("current_streak") or 0)

        return {
            "user": user_dict,
            "profile": {
                "student_code": user_dict.get("user_code") or "SV2026-001",
                "level": level,
                "exp_points": exp_points,
                "streak_days": streak_days,
                "longest_streak": int(prof_dict.get("longest_streak") or streak_days),
                "selected_title": prof_dict.get("selected_title") or "Novice Developer",
                "radar_skills": {
                    "algorithm": float(prof_dict.get("radar_algorithm") or 0.0),
                    "debugging": float(prof_dict.get("radar_debugging") or 0.0),
                    "cleancode": float(prof_dict.get("radar_cleancode") or 0.0),
                    "teamwork": float(prof_dict.get("radar_teamwork") or 0.0),
                    "defense": float(prof_dict.get("radar_defense") or 0.0),
                },
                "total_commits": commits_cnt,
                "tasks_completed": tasks_done,
                "dual_submissions_count": len(subs),
                "submissions_history": [row_dict(s) for s in subs],
            },
        }

    dispatcher.register_tool(
        name="get_student_analytics",
        description="Lấy hồ sơ phân tích học tập toàn diện của sinh viên: Level, XP, chuỗi ngày streak, biểu đồ radar 5 kỹ năng công nghiệp, đóng góp Git và bài tập.",
        input_schema={
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "ID hoặc mã sinh viên (mặc định: 'usr-sv-02')", "default": "usr-sv-02"},
            },
        },
        handler=handle_get_student_analytics,
    )

    # ------------------------------------------------------------------------
    # 11. submit_ai_defense_audit
    # ------------------------------------------------------------------------
    def handle_submit_ai_defense_audit(args: dict[str, Any]) -> dict[str, Any]:
        session_id = args.get("session_id", "").strip()
        verdict = args.get("verdict", "approved").strip().lower()
        auditor_name = args.get("auditor_name", "AI Defense Council")
        notes = args.get("notes", "").strip()
        score_adjustment = int(args.get("score_adjustment", 0))

        if not session_id:
            raise ValueError("Thiếu tham số 'session_id'.")

        now = now_utc()

        caller = args.get("_caller")
        with db() as conn:
            sess = conn.execute("SELECT * FROM defense_sessions WHERE id = ?", (session_id,)).fetchone()
            if not sess:
                raise ValueError(f"Không tìm thấy phiên phản biện '{session_id}'.")
            sess = row_dict(sess)
            proj = conn.execute("SELECT * FROM engineering_projects WHERE id = ?", (sess["project_id"],)).fetchone()
            if proj:
                _mcp_assert_project_access(caller, proj, write=False)

            current_score = sess["final_defense_score"] or sess["production_score"] or 85
            new_score = max(0, min(100, current_score + score_adjustment))

            # Cập nhật defense session
            conn.execute(
                """UPDATE defense_sessions
                   SET final_defense_score = ?, status = ?, updated_at = ?
                   WHERE id = ?""",
                (new_score, "completed" if verdict != "flagged_plagiarism" else "flagged", now, session_id),
            )

        # Ghi Audit Log chuẩn theo bảng audit_events của MySQL
        record_audit_log(
            actor_name=auditor_name,
            actor_id=sess["user_id"],
            action="mcp:submit_ai_defense_audit",
            target=f"{session_id} · {verdict} ({new_score}/100)",
            log_type="mcp",
            resource_type="defense_session",
            resource_id=session_id,
            decision="allow",
        )

        return {
            "success": True,
            "session_id": session_id,
            "verdict": verdict,
            "final_score": new_score,
            "auditor": auditor_name,
            "notes": notes,
            "timestamp": now,
        }

    dispatcher.register_tool(
        name="submit_ai_defense_audit",
        description="Thẩm định và ghi nhận phán quyết của Hội đồng Phản biện AI (AI Defense Council) vào phiên bảo vệ đồ án, ghi log kiểm toán bảo mật.",
        input_schema={
            "type": "object",
            "required": ["session_id", "verdict", "notes"],
            "properties": {
                "session_id": {"type": "string", "description": "ID phiên phản biện bảo vệ"},
                "verdict": {
                    "type": "string",
                    "description": "Kết luận thẩm định",
                    "enum": ["approved", "needs_revision", "flagged_plagiarism"],
                },
                "auditor_name": {"type": "string", "description": "Tên thẩm định viên / AI Council", "default": "AI Defense Council"},
                "notes": {"type": "string", "description": "Nhận xét chuyên môn hoặc bằng chứng vi phạm"},
                "score_adjustment": {"type": "integer", "description": "Điểm cộng/trừ (-20 đến +20)", "default": 0},
            },
        },
        handler=handle_submit_ai_defense_audit,
    )
