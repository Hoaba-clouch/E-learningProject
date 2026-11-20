from __future__ import annotations

import json
import random
from datetime import datetime
from typing import Any
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import current_user, get_optional_current_user, record_audit_log
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc
from app.schemas.kanban import (
    TaskCreate,
    TaskMove,
    WorkspaceAiWbsIn,
    WorkspaceProjectCreateIn,
    WorkspaceProjectPatchIn,
    WorkspaceTaskBatchCreateIn,
    WorkspaceTaskCreateIn,
    WorkspaceTaskMoveIn,
    WorkspaceTaskPatchIn,
)

router = APIRouter(tags=["Engineering Kanban & Projects"])


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    mode: str = "team"
    deadline_utc: str | None = None


@router.get("/projects")
def list_projects(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Danh sách các dự án kỹ thuật (Project Workspace - legacy compatibility)."""
    with db() as conn:
        projects = conn.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
    return {"projects": [row_dict(p) for p in projects]}


@router.post("/projects", status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Tạo mới một dự án và khởi tạo sẵn Kanban Board mặc định (legacy compatibility)."""
    project_id = uid()
    timestamp = now_utc()
    board_id = uid()
    with db() as conn:
        conn.execute(
            "INSERT INTO projects(id, title, description, mode, deadline_utc, created_at) VALUES(?,?,?,?,?,?)",
            (project_id, payload.title, payload.description, payload.mode, payload.deadline_utc, timestamp),
        )
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
    """Lấy dữ liệu toàn bộ bảng Kanban legacy."""
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
    """Tạo mới một atomic task trên bảng Kanban legacy."""
    task_id = uid()
    timestamp = now_utc()
    with db() as conn:
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
    """Di chuyển task giữa các cột (legacy), đồng thời kiểm tra Hard Constraint H2."""
    with db() as conn:
        task = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Không tìm thấy task")

        target_column = conn.execute("SELECT * FROM kanban_columns WHERE id=?", (payload.column_id,)).fetchone()
        if not target_column:
            raise HTTPException(status_code=404, detail="Không tìm thấy cột đích")

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


# ═════════════════════════════════════════════════════════════════════════════
# NHÁNH 2 FULLSTACK API: ENGINEERING PROJECTS, TASKS & KANBAN WORKSPACE
# ═════════════════════════════════════════════════════════════════════════════

COLUMN_LABEL = {
    "backlog": "Backlog",
    "ready": "Cần làm",
    "in-progress": "Đang làm",
    "done": "Hoàn thành",
    "verified": "Đã nghiệm thu",
    "fail": "Cần sửa lại",
}

PALETTE_CYCLE = [
    ("#C7D2FE", "#312E81", "bg-[#14161a] dark:bg-slate-700"),
    ("#FCD34D", "#78350F", "bg-amber-500"),
    ("#FED7AA", "#7C2D12", "bg-slate-600 dark:bg-slate-500"),
    ("#A7F3D0", "#064E3B", "bg-amber-600"),
    ("#E9D5FF", "#581C87", "bg-slate-700 dark:bg-slate-600"),
    ("#CCFBF1", "#115E59", "bg-slate-800"),
]


def _default_dod(is_done: bool = False) -> list[dict[str, Any]]:
    return [
        {"id": "dod-1", "text": "Code vượt qua 100% test cases trong Docker sandbox độc lập", "done": is_done},
        {"id": "dod-2", "text": "Tuân thủ Kiến trúc 3 tầng (Router -> Service -> Data Layer)", "done": is_done},
        {"id": "dod-3", "text": "Không có lỗi Type/Lint, timestamp chuẩn ISO-8601 UTC (H4)", "done": is_done},
        {"id": "dod-4", "text": "Được ít nhất 1 thành viên review và giải phóng Ràng buộc H2", "done": is_done},
    ]


def _normalize_project_status(raw: str | None) -> str:
    val = (raw or "active").strip().lower()
    if val in ("in-progress", "active"):
        return "active"
    if val in ("planning", "review", "delivered"):
        return val
    return "active"


def _to_kanban_project_status(raw: str | None) -> str:
    val = (raw or "active").strip().lower()
    if val == "active":
        return "in-progress"
    if val in ("in-progress", "planning", "review", "delivered"):
        return val
    return "in-progress"


def _normalize_team(raw_team: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cntt_members: list[dict[str, Any]] = []
    team_members: list[dict[str, Any]] = []
    for idx, m in enumerate(raw_team):
        bg, text_color, tailwind_color = PALETTE_CYCLE[idx % len(PALETTE_CYCLE)]
        name = str(m.get("name") or f"Member {idx + 1}")
        avatar = str(m.get("avatar") or name.strip()[:1].upper() or "M")
        initials = str(m.get("initials") or "".join(w[:1] for w in name.split()[-2:]).upper() or "DV")
        role = str(m.get("role") or "Developer")
        color = str(m.get("color") or tailwind_color)
        m_id = str(m.get("id") or f"m-{idx + 1}")
        cntt_members.append(
            {
                "id": m_id,
                "name": name,
                "initials": initials,
                "role": role,
                "bg": str(m.get("bg") or bg),
                "textColor": str(m.get("textColor") or text_color),
            }
        )
        team_members.append(
            {
                "id": m_id,
                "name": name,
                "avatar": avatar,
                "role": role,
                "color": color,
            }
        )
    return cntt_members, team_members


def _extract_repo_slug_from_url(repo_url: str | None) -> str:
    raw = (repo_url or "").strip()
    if not raw:
        return ""
    parsed = urlparse(raw)
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) >= 2:
        return f"{parts[0].lower()}/{parts[1].removesuffix('.git').lower()}"
    if len(parts) == 1:
        return parts[0].removesuffix(".git").lower()
    return ""


def _url_matches_project_repo(url: str | None, repo_obj: Any | None) -> bool:
    clean = (url or "").strip()
    if not (clean.startswith("http://") or clean.startswith("https://")):
        return False
    low = clean.rstrip("/").lower()
    if not repo_obj:
        return "github.com/" in low
    rd = dict(repo_obj)
    slug = str(rd.get("repo_slug") or rd.get("repoSlug") or "").strip().lower()
    repo_url = str(rd.get("repo_url") or rd.get("repoUrl") or "").strip().rstrip("/").lower()
    if slug and f"github.com/{slug}" in low:
        return True
    if repo_url and low.startswith(repo_url):
        return True
    if not slug and not repo_url:
        return "github.com/" in low
    return False


def _build_project_git_maps(
    conn: Any,
) -> tuple[
    dict[str, dict[str, Any]],
    dict[tuple[str, str], list[dict[str, Any]]],
    dict[tuple[str, str], list[dict[str, Any]]],
]:
    repo_rows = conn.execute("SELECT * FROM git_repositories").fetchall()
    commit_rows = conn.execute(
        "SELECT * FROM git_commits ORDER BY position_order DESC, created_at DESC"
    ).fetchall()
    pr_rows = conn.execute(
        "SELECT * FROM git_pull_requests ORDER BY pr_number DESC"
    ).fetchall()

    commits_count_by_proj: dict[str, int] = {}
    commits_by_proj_code: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for cr in commit_rows:
        pid = cr["project_id"]
        commits_count_by_proj[pid] = commits_count_by_proj.get(pid, 0) + 1
        code_key = str(cr["task_code"] or "").strip().lstrip("#").upper()
        if code_key:
            commits_by_proj_code.setdefault((pid, code_key), []).append(
                {
                    "id": cr["id"],
                    "sha": cr["sha"],
                    "branch": cr["branch"],
                    "message": cr["message"],
                    "authorName": cr["author_name"],
                    "timeAgo": cr["time_ago_label"] or cr["committed_at_label"] or "",
                }
            )

    repo_url_lookup: dict[str, str] = {}
    for rr in repo_rows:
        repo_url_lookup[rr["project_id"]] = str(rr["repo_url"] or "").rstrip("/")

    open_prs_by_proj: dict[str, int] = {}
    merged_prs_by_proj: dict[str, int] = {}
    total_prs_by_proj: dict[str, int] = {}
    prs_by_proj_code: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for pr in pr_rows:
        pid = pr["project_id"]
        st = str(pr["status"] or "open").lower()
        total_prs_by_proj[pid] = total_prs_by_proj.get(pid, 0) + 1
        if st == "merged":
            merged_prs_by_proj[pid] = merged_prs_by_proj.get(pid, 0) + 1
        else:
            open_prs_by_proj[pid] = open_prs_by_proj.get(pid, 0) + 1
        code_key = str(pr["task_code"] or "").strip().lstrip("#").upper()
        if code_key:
            base_url = repo_url_lookup.get(pid) or "https://github.com/Hoaba-clouch/E-learningProject"
            prs_by_proj_code.setdefault((pid, code_key), []).append(
                {
                    "id": pr["id"],
                    "prNumber": int(pr["pr_number"]),
                    "title": pr["title"],
                    "status": st,
                    "sourceBranch": pr["source_branch"],
                    "targetBranch": pr["target_branch"],
                    "aiReviewScore": int(pr["ai_review_score"] or 90),
                    "peerApproved": bool(pr["peer_approved"]),
                    "prUrl": f"{base_url}/pull/{int(pr['pr_number'])}",
                }
            )

    repo_by_proj: dict[str, dict[str, Any]] = {}
    for rr in repo_rows:
        pid = rr["project_id"]
        repo_by_proj[pid] = {
            "repoUrl": rr["repo_url"],
            "repoSlug": rr["repo_slug"],
            "targetBranch": rr["target_branch"] or "main",
            "webhookActive": bool(rr["webhook_active"]),
            "lastSyncedAt": rr["last_synced_at"] or "",
            "commitsCount": commits_count_by_proj.get(pid, 0),
            "openPrsCount": open_prs_by_proj.get(pid, 0),
            "mergedPrsCount": merged_prs_by_proj.get(pid, 0),
            "totalPrsCount": total_prs_by_proj.get(pid, 0),
        }

    return repo_by_proj, commits_by_proj_code, prs_by_proj_code


def _build_task_git_activity(
    submission_url: str | None,
    repo_summary: dict[str, Any] | None,
    commits_list: list[dict[str, Any]],
    prs_list: list[dict[str, Any]],
) -> dict[str, Any]:
    latest_pr = prs_list[0] if prs_list else None
    latest_commit = commits_list[0] if commits_list else None
    has_proof = (
        bool(commits_list)
        or bool(prs_list)
        or _url_matches_project_repo(submission_url or "", repo_summary)
    )
    return {
        "commits": commits_list[:6],
        "pullRequests": prs_list[:4],
        "commitsCount": len(commits_list),
        "latestCommitSha": latest_commit["sha"] if latest_commit else None,
        "latestPrNumber": latest_pr["prNumber"] if latest_pr else None,
        "latestPrStatus": latest_pr["status"] if latest_pr else None,
        "latestPrUrl": latest_pr["prUrl"] if latest_pr else None,
        "hasValidGitProof": has_proof,
    }


def _fetch_single_task_git_activity(conn: Any, task_row: Any) -> dict[str, Any]:
    pid = task_row["project_id"]
    code_key = str(task_row["code"] or "").strip().lstrip("#").upper()
    repo_row = conn.execute("SELECT * FROM git_repositories WHERE project_id=?", (pid,)).fetchone()
    repo_dict = (
        {
            "repoUrl": repo_row["repo_url"],
            "repoSlug": repo_row["repo_slug"],
        }
        if repo_row
        else None
    )
    commits_list: list[dict[str, Any]] = []
    prs_list: list[dict[str, Any]] = []
    if code_key:
        c_rows = conn.execute(
            """SELECT * FROM git_commits
               WHERE project_id=? AND upper(task_code)=upper(?)
               ORDER BY position_order DESC, created_at DESC""",
            (pid, code_key),
        ).fetchall()
        commits_list = [
            {
                "id": cr["id"],
                "sha": cr["sha"],
                "branch": cr["branch"],
                "message": cr["message"],
                "authorName": cr["author_name"],
                "timeAgo": cr["time_ago_label"] or cr["committed_at_label"] or "",
            }
            for cr in c_rows
        ]
        p_rows = conn.execute(
            """SELECT * FROM git_pull_requests
               WHERE project_id=? AND upper(task_code)=upper(?)
               ORDER BY pr_number DESC""",
            (pid, code_key),
        ).fetchall()
        base_url = (repo_dict["repoUrl"] if repo_dict else "https://github.com/Hoaba-clouch/E-learningProject").rstrip("/")
        prs_list = [
            {
                "id": pr["id"],
                "prNumber": int(pr["pr_number"]),
                "title": pr["title"],
                "status": str(pr["status"] or "open").lower(),
                "sourceBranch": pr["source_branch"],
                "targetBranch": pr["target_branch"],
                "aiReviewScore": int(pr["ai_review_score"] or 90),
                "peerApproved": bool(pr["peer_approved"]),
                "prUrl": f"{base_url}/pull/{int(pr['pr_number'])}",
            }
            for pr in p_rows
        ]
    return _build_task_git_activity(
        task_row["submission_url"],
        repo_dict,
        commits_list,
        prs_list,
    )


def _serialize_task(
    row: Any,
    git_activity: dict[str, Any] | None = None,
) -> dict[str, Any]:
    d = dict(row)
    assignee = json.loads(d.get("assignee_json") or "{}")
    if not assignee.get("name"):
        assignee = {"name": "Nguyễn Bá Hòa", "avatar": "H", "role": "Leader & Architect"}
    checklist = json.loads(d.get("checklist_json") or "[]")
    dod = json.loads(d.get("dod_json") or "[]")
    user_story = json.loads(d["user_story_json"]) if d.get("user_story_json") else None
    deliverable = json.loads(d["deliverable_json"]) if d.get("deliverable_json") else None
    audit_logs = json.loads(d.get("audit_logs_json") or "[]")

    res: dict[str, Any] = {
        "id": d["id"],
        "projectId": d["project_id"],
        "code": d["code"],
        "title": d["title"],
        "description": d["description"] or "",
        "column": d["column_id"],
        "column_id": d["column_id"],
        "priority": d["priority"] or "medium",
        "moscow": d["moscow"] or "should",
        "points": int(d["points"] or 3),
        "assignee": assignee,
        "estimateHours": float(d["estimate_hours"] or 4),
        "dueDate": d["due_date"] or "",
        "epic": d["epic"] or "Sprint Goal",
        "epicColor": d["epic_color"] or "bg-blue-50 text-blue-700 border-blue-200",
        "checklist": checklist,
        "definitionOfDone": dod,
        "commentsCount": int(d["comments_count"] or 0),
        "attachmentsCount": int(d["attachments_count"] or 0),
        "isBonus": bool(d["is_bonus"]),
        "auditLogs": audit_logs,
        "positionOrder": int(d["position_order"] or 0),
    }
    if d.get("depends_on"):
        res["dependsOn"] = d["depends_on"]
    if user_story:
        res["userStory"] = user_story
    if d.get("acceptance_criteria"):
        res["acceptanceCriteria"] = d["acceptance_criteria"]
    if deliverable:
        res["deliverable"] = deliverable
    if d.get("submission_requirement"):
        res["submissionRequirement"] = d["submission_requirement"]
    if d.get("submission_url"):
        res["submissionUrl"] = d["submission_url"]
    latest_note = None
    for lg in reversed(audit_logs):
        if isinstance(lg, dict) and lg.get("note"):
            latest_note = str(lg["note"])
            break
    if latest_note:
        res["reviewFeedback"] = latest_note
    if git_activity is not None:
        res["gitActivity"] = git_activity
    return res


DEFAULT_PROJECT_MENTORS: dict[str, str] = {
    "prj-codemind": "TS. Nguyễn Phước (GV Hướng dẫn)",
    "prj-compiler": "ThS. Trần Minh Quân (GV Hướng dẫn)",
    "prj-devnet": "Cô Trần Thị B (GV Hướng dẫn)",
    "prj-ecommerce": "TS. Nguyễn Phước (GV Hướng dẫn)",
    "prj-faceattend": "TS. Lê Hoàng Mai (GV Hướng dẫn)",
    "prj-medai": "TS. Lê Hoàng Mai (GV Hướng dẫn)",
    "prj-pintos": "ThS. Trần Minh Quân (GV Hướng dẫn)",
    "prj-security": "TS. Đặng Quốc Bảo (GV Hướng dẫn)",
}


def _serialize_project(
    proj_row: Any,
    task_rows: list[Any],
    eval_row: Any | None = None,
    git_repo: dict[str, Any] | None = None,
    commits_by_code: dict[tuple[str, str], list[dict[str, Any]]] | None = None,
    prs_by_code: dict[tuple[str, str], list[dict[str, Any]]] | None = None,
) -> dict[str, Any]:
    p = dict(proj_row)
    pid = p["id"]
    tasks_out = []
    for t in task_rows:
        code_key = str(t["code"] or "").strip().lstrip("#").upper()
        c_list = commits_by_code.get((pid, code_key), []) if commits_by_code is not None and code_key else []
        p_list = prs_by_code.get((pid, code_key), []) if prs_by_code is not None and code_key else []
        git_act = _build_task_git_activity(
            t["submission_url"],
            git_repo,
            c_list,
            p_list,
        )
        tasks_out.append(_serialize_task(t, git_act))
    tasks_total = len(tasks_out)
    tasks_done = sum(1 for t in tasks_out if t["column"] in ("done", "verified"))
    progress = round(tasks_done / tasks_total, 4) if tasks_total > 0 else 0.0

    story_budget = int(p.get("story_points_budget") or 600)
    points_burned = int(round(story_budget * progress))

    raw_team = json.loads(p.get("team_json") or "[]")
    cntt_members, team_members = _normalize_team(raw_team)
    for idx, cm in enumerate(cntt_members):
        cm["isLead"] = idx == 0

    slate_status = _normalize_project_status(p.get("status"))
    kanban_status = _to_kanban_project_status(p.get("status"))

    lead_name = team_members[0]["name"] if team_members else "Nguyễn Bá Hòa"
    raw_instructor = str(p.get("instructor_label") or "").strip()
    if not raw_instructor or "(lead)" in raw_instructor.lower():
        raw_instructor = DEFAULT_PROJECT_MENTORS.get(
            p["id"], "TS. Nguyễn Phước (GV Hướng dẫn)"
        )

    ev_dict = row_dict(eval_row) if eval_row else None

    return {
        "id": p["id"],
        "code": p["code"],
        "name": p["name"],
        "client": p["client"],
        "course": p["course"],
        "sprint": p["sprint"],
        "kind": p["kind"],
        "status": slate_status,
        "kanbanStatus": kanban_status,
        "fav": bool(p["fav"]),
        "dueDate": p["due_date"],
        "dueText": p["due_text"],
        "progress": progress,
        "tasksDone": tasks_done,
        "tasksTotal": tasks_total,
        "storyPoints": story_budget,
        "totalXp": story_budget,
        "pointsBurned": points_burned,
        "budgetStr": f"{story_budget:,} SP",
        "lead": lead_name,
        "instructor": raw_instructor,
        "instructorAvatar": (team_members[0]["avatar"] if team_members else "H"),
        "finalScore": float(ev_dict["final_score"]) if ev_dict and ev_dict.get("final_score") is not None else None,
        "evaluationStatus": str(ev_dict.get("status") or "graded") if ev_dict else None,
        "evaluationFeedback": str(ev_dict.get("feedback") or "") if ev_dict else None,
        "members": cntt_members,
        "team": team_members,
        "colorHex": p["color_hex"],
        "tlStart": float(p["tl_start"]),
        "tlWidth": float(p["tl_width"]),
        "tlColor": "done" if slate_status == "delivered" else (p.get("tl_color") or "amber"),
        "gitRepo": git_repo,
        "tasks": tasks_out,
    }


def _check_git_proof_for_done(
    conn: Any,
    user: dict[str, Any],
    task_row: Any,
    target_col: str,
    candidate_submission_url: str | None = None,
) -> None:
    if str(user.get("role") or "").lower() != "student":
        return

    pid = task_row["project_id"]
    repo_row = conn.execute(
        "SELECT * FROM git_repositories WHERE project_id=?",
        (pid,),
    ).fetchone()
    expected_repo = (
        repo_row["repo_slug"] if repo_row and repo_row["repo_slug"] else "GitHub Repo dự án"
    )

    if candidate_submission_url is not None and candidate_submission_url.strip():
        if not _url_matches_project_repo(candidate_submission_url, repo_row):
            hint_url = (
                f"https://github.com/{repo_row['repo_slug']}"
                if repo_row and repo_row["repo_slug"]
                else "https://github.com/..."
            )
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Link minh chứng không thuộc kho lưu trữ của dự án ({expected_repo}). "
                    f"Vui lòng dán link Commit/PR từ {hint_url}."
                ),
            )

    if target_col == "done" and task_row["column_id"] not in ("done", "verified"):
        code_key = str(task_row["code"] or "").strip().lstrip("#").upper()
        commit_cnt = 0
        pr_cnt = 0
        if code_key:
            c_row = conn.execute(
                "SELECT COUNT(*) AS cnt FROM git_commits WHERE project_id=? AND upper(task_code)=upper(?)",
                (pid, code_key),
            ).fetchone()
            p_row = conn.execute(
                "SELECT COUNT(*) AS cnt FROM git_pull_requests WHERE project_id=? AND upper(task_code)=upper(?)",
                (pid, code_key),
            ).fetchone()
            commit_cnt = int(c_row["cnt"] or 0) if c_row else 0
            pr_cnt = int(p_row["cnt"] or 0) if p_row else 0

        effective_url = (
            candidate_submission_url
            if candidate_submission_url is not None
            else task_row["submission_url"]
        ) or ""
        if commit_cnt == 0 and pr_cnt == 0 and not _url_matches_project_repo(effective_url, repo_row):
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Chưa có minh chứng Git cho task #{task_row['code']}: Sinh viên cần có ít nhất "
                    f"1 Commit/PR gắn mã #{task_row['code']} trên Git Hub hoặc dán link Commit/PR hợp lệ "
                    f"thuộc {expected_repo} trước khi chuyển sang Hoàn thành."
                ),
            )


def _check_h2_constraint(conn: Any, task_row: Any, target_col: str) -> None:
    if target_col not in ("done", "verified"):
        return
    dep_id = task_row["depends_on"]
    if not dep_id:
        return
    parent = conn.execute(
        "SELECT id, code, title, column_id FROM engineering_tasks WHERE id=? AND project_id=?",
        (dep_id, task_row["project_id"]),
    ).fetchone()
    if parent and parent["column_id"] not in ("done", "verified"):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Vi phạm Ràng buộc H2: Task #{parent['code']} ({parent['title']}) "
                f"cần được hoàn thành trước khi chuyển task này sang Hoàn thành."
            ),
        )


def _credit_student_xp(conn: Any, xp_amount: int) -> bool:
    if xp_amount <= 0:
        return False
    prof = conn.execute(
        "SELECT user_id, radar_teamwork FROM student_profiles LIMIT 1"
    ).fetchone()
    if not prof:
        return False
    next_radar = min(100.0, float(prof["radar_teamwork"] or 80.0) + 0.5)
    conn.execute(
        """UPDATE student_profiles
           SET exp_points = exp_points + ?,
               radar_teamwork = ?
           WHERE user_id=?""",
        (xp_amount, next_radar, prof["user_id"]),
    )
    return True


def _award_task_done_xp(conn: Any, user: dict[str, Any], task_row: Any, target_col: str) -> int:
    current_awarded = int(dict(task_row).get("xp_awarded") or 0)
    if target_col == "verified" and current_awarded < 50:
        xp_reward = max(50, int(dict(task_row).get("points") or 3) * 10)
        delta = xp_reward - current_awarded
        if _credit_student_xp(conn, delta):
            conn.execute("UPDATE engineering_tasks SET xp_awarded = ? WHERE id=?", (xp_reward, task_row["id"]))
            return delta
    if target_col == "done" and current_awarded == 0:
        if _credit_student_xp(conn, 15):
            conn.execute("UPDATE engineering_tasks SET xp_awarded = 15 WHERE id=?", (task_row["id"],))
            return 15
    return 0


def _append_column_audit_log(
    existing_logs: list[dict[str, Any]],
    actor_name: str,
    from_col: str,
    to_col: str,
) -> list[dict[str, Any]]:
    if from_col == to_col:
        return existing_logs
    ts = datetime.now().strftime("%d/%m/%Y %H:%M")
    entry = {
        "user": actor_name,
        "fromColumn": COLUMN_LABEL.get(from_col, from_col),
        "toColumn": COLUMN_LABEL.get(to_col, to_col),
        "timestamp": ts,
    }
    return [*existing_logs, entry]


def _insert_workspace_task(
    conn: Any,
    project_id: str,
    item: WorkspaceTaskCreateIn,
    position_order: int,
    now: str,
) -> dict[str, Any]:
    task_id = item.id.strip() if item.id else f"task-{uid()[:8]}"
    existing = conn.execute("SELECT id FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()
    if existing:
        task_id = f"task-{uid()[:8]}"

    code = (item.code or f"TSK-{random.randint(100, 999)}").strip()
    assignee = dict(item.assignee or {})
    if not assignee.get("name"):
        assignee = {"name": "Nguyễn Bá Hòa", "avatar": "H", "role": "Leader & Architect"}
    dod = item.definitionOfDone if item.definitionOfDone else _default_dod(item.column == "done")

    conn.execute(
        """INSERT INTO engineering_tasks(
               id, project_id, code, title, description, column_id, priority, moscow,
               points, assignee_json, estimate_hours, due_date, epic, epic_color,
               depends_on, checklist_json, dod_json, user_story_json, acceptance_criteria,
               deliverable_json, submission_requirement, submission_url, is_bonus,
               comments_count, attachments_count, audit_logs_json, position_order,
               xp_awarded, created_at, updated_at
           ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            task_id,
            project_id,
            code,
            item.title.strip(),
            item.description,
            item.column,
            item.priority,
            item.moscow,
            item.points,
            json.dumps(assignee, ensure_ascii=False),
            item.estimateHours,
            item.dueDate,
            item.epic,
            item.epicColor,
            item.dependsOn,
            json.dumps(item.checklist, ensure_ascii=False),
            json.dumps(dod, ensure_ascii=False),
            json.dumps(item.userStory, ensure_ascii=False) if item.userStory else None,
            item.acceptanceCriteria,
            json.dumps(item.deliverable, ensure_ascii=False) if item.deliverable else None,
            item.submissionRequirement,
            item.submissionUrl,
            1 if item.isBonus else 0,
            item.commentsCount,
            item.attachmentsCount,
            json.dumps(item.auditLogs, ensure_ascii=False),
            position_order,
            0,
            now,
            now,
        ),
    )
    row = conn.execute("SELECT * FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()
    return _serialize_task(row)


@router.get("/kanban/workspace")
def get_kanban_workspace(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy toàn bộ 8+ dự án kỹ thuật và 35+ task Kanban đồng bộ CSDL + Git Repository cho Dự án & Kanban Board."""
    with db() as conn:
        proj_rows = conn.execute(
            "SELECT * FROM engineering_projects ORDER BY created_at DESC, rowid ASC"
        ).fetchall()
        task_rows = conn.execute(
            "SELECT * FROM engineering_tasks ORDER BY position_order ASC, rowid ASC"
        ).fetchall()
        eval_rows = conn.execute(
            "SELECT * FROM project_evaluations ORDER BY graded_at ASC"
        ).fetchall()
        repo_by_proj, commits_by_proj_code, prs_by_proj_code = _build_project_git_maps(conn)

    tasks_by_proj: dict[str, list[Any]] = {}
    for tr in task_rows:
        tasks_by_proj.setdefault(tr["project_id"], []).append(tr)

    eval_by_proj: dict[str, Any] = {}
    for er in eval_rows:
        eval_by_proj[er["project_id"]] = er

    projects = [
        _serialize_project(
            p,
            tasks_by_proj.get(p["id"], []),
            eval_by_proj.get(p["id"]),
            git_repo=repo_by_proj.get(p["id"]),
            commits_by_code=commits_by_proj_code,
            prs_by_code=prs_by_proj_code,
        )
        for p in proj_rows
    ]
    total_tasks = sum(p["tasksTotal"] for p in projects)
    total_done = sum(p["tasksDone"] for p in projects)
    return {
        "projects": projects,
        "summary": {
            "total_projects": len(projects),
            "active_projects": sum(1 for p in projects if p["status"] != "delivered"),
            "total_tasks": total_tasks,
            "done_tasks": total_done,
        },
    }


@router.post("/kanban/workspace/projects", status_code=status.HTTP_201_CREATED)
def create_workspace_project(
    payload: WorkspaceProjectCreateIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Tạo mới Dự án Kỹ nghệ, khởi tạo Task đầu tiên và liên kết Git Repository ngay trong CSDL."""
    now = now_utc()
    proj_id = payload.id.strip() if payload.id else f"prj-{uid()[:8]}"
    code = (payload.code or f"PRJ-{random.randint(100, 999)}").strip().upper()
    norm_status = _normalize_project_status(payload.status)

    raw_repo_url = (payload.repo_url or "").strip()
    if raw_repo_url and not (raw_repo_url.startswith("http://") or raw_repo_url.startswith("https://")):
        raise HTTPException(
            status_code=422,
            detail="Đường dẫn GitHub Repository phải bắt đầu bằng https:// hoặc http://",
        )
    repo_slug = _extract_repo_slug_from_url(raw_repo_url) if raw_repo_url else f"codemind-team/{code.lower()}"
    if not repo_slug:
        repo_slug = f"codemind-team/{code.lower()}"
    clean_repo_url = raw_repo_url or f"https://github.com/{repo_slug}"
    target_branch = (payload.target_branch or "main").strip() or "main"

    member_names = payload.team_members or ["Nguyễn Bá Hòa", "Võ Nhật Huy"]
    team_list: list[dict[str, Any]] = []
    for idx, m_name in enumerate(member_names):
        bg, text_col, tw_col = PALETTE_CYCLE[idx % len(PALETTE_CYCLE)]
        clean = m_name.strip() or f"Thành viên {idx + 1}"
        team_list.append(
            {
                "id": f"tm-{idx + 1}-{uid()[:4]}",
                "name": clean,
                "avatar": clean[:1].upper(),
                "initials": "".join(w[:1] for w in clean.split()[-2:]).upper() or "TM",
                "role": "Leader & Architect" if idx == 0 else "Developer",
                "color": tw_col,
                "bg": bg,
                "textColor": text_col,
            }
        )

    sp_budget = payload.story_points if payload.story_points is not None else 600
    due_text = payload.due_text or (f"Hạn {payload.due_date}" if payload.due_date else "Còn 30 ngày")
    default_mentor = "TS. Nguyễn Phước (GV Hướng dẫn)"

    with db() as conn:
        conn.execute(
            """INSERT INTO engineering_projects(
                   id, code, name, client, course, sprint, kind, status, fav,
                   due_date, due_text, story_points_budget, color_hex,
                   tl_start, tl_width, tl_color, instructor_label, team_json,
                   created_by, created_at, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                proj_id,
                code,
                payload.name.strip(),
                payload.client.strip() or "CodeMind Campus",
                payload.course.strip() or payload.client.strip() or "CNTT-2026 · Đồ án Chuyên ngành",
                payload.sprint,
                payload.kind.strip().upper() or "AI / FULLSTACK",
                norm_status,
                1 if payload.fav else 0,
                payload.due_date,
                due_text,
                sp_budget,
                "#f29b23",
                32.0,
                34.0,
                "amber",
                default_mentor,
                json.dumps(team_list, ensure_ascii=False),
                user["id"],
                now,
                now,
            ),
        )
        lead_assignee = {
            "name": team_list[0]["name"],
            "avatar": team_list[0]["avatar"],
            "role": team_list[0]["role"],
        }
        starter = WorkspaceTaskCreateIn(
            id=f"task-{uid()[:8]}",
            code=f"{code}-01",
            title="Khởi tạo kiến trúc dự án & Thiết lập Repo",
            description=f"Thiết lập cấu trúc thư mục, CI/CD pipeline và tài liệu SRS ban đầu cho {payload.name.strip()}.",
            column="ready",
            priority="high",
            moscow="must",
            points=5,
            assignee=lead_assignee,
            estimateHours=4,
            dueDate=payload.due_date,
            epic="Khởi tạo",
            epicColor="bg-blue-50 text-blue-700 border-blue-200",
        )
        _insert_workspace_task(conn, proj_id, starter, 0, now)
        conn.execute(
            """INSERT INTO git_repositories(
                   project_id, repo_url, repo_slug, target_branch, default_merge_strategy,
                   webhook_active, cadence_variance_hours, last_synced_at, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?)""",
            (
                proj_id,
                clean_repo_url,
                repo_slug,
                target_branch,
                "squash",
                1,
                4.8,
                now,
                now,
            ),
        )

        proj_row = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (proj_id,)).fetchone()
        task_rows = conn.execute("SELECT * FROM engineering_tasks WHERE project_id=? ORDER BY position_order ASC", (proj_id,)).fetchall()
        repo_by_proj, commits_by_proj_code, prs_by_proj_code = _build_project_git_maps(conn)

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Thành viên",
        user["id"],
        "Tạo Dự án Kỹ nghệ mới",
        f"{payload.name.strip()} ({repo_slug})",
        log_type="class",
        resource_type="engineering_project",
        resource_id=proj_id,
    )
    return {
        "project": _serialize_project(
            proj_row,
            task_rows,
            git_repo=repo_by_proj.get(proj_id),
            commits_by_code=commits_by_proj_code,
            prs_by_code=prs_by_proj_code,
        )
    }


@router.patch("/kanban/workspace/projects/{project_id}")
def patch_workspace_project(
    project_id: str,
    payload: WorkspaceProjectPatchIn,
    _: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Cập nhật trạng thái ghim (fav), tên/sprint hoặc danh sách thành viên đội ngũ của Dự án."""
    now = now_utc()
    with db() as conn:
        existing = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

        fav = (1 if payload.fav else 0) if payload.fav is not None else existing["fav"]
        norm_status = _normalize_project_status(payload.status) if payload.status is not None else existing["status"]
        name = payload.name.strip() if payload.name is not None else existing["name"]
        sprint = payload.sprint if payload.sprint is not None else existing["sprint"]
        due_date = payload.due_date if payload.due_date is not None else existing["due_date"]
        instructor_label = (
            payload.instructor.strip()
            if payload.instructor is not None and payload.instructor.strip()
            else existing["instructor_label"]
        )
        team_json = (
            json.dumps(payload.team, ensure_ascii=False)
            if payload.team is not None
            else existing["team_json"]
        )

        conn.execute(
            """UPDATE engineering_projects
               SET fav=?, status=?, name=?, sprint=?, due_date=?, instructor_label=?, team_json=?, updated_at=?
               WHERE id=?""",
            (fav, norm_status, name, sprint, due_date, instructor_label, team_json, now, project_id),
        )
        proj_row = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        task_rows = conn.execute(
            "SELECT * FROM engineering_tasks WHERE project_id=? ORDER BY position_order ASC, rowid ASC",
            (project_id,),
        ).fetchall()
        eval_row = conn.execute(
            "SELECT * FROM project_evaluations WHERE project_id=? ORDER BY graded_at DESC LIMIT 1",
            (project_id,),
        ).fetchone()
        repo_by_proj, commits_by_proj_code, prs_by_proj_code = _build_project_git_maps(conn)

    return {
        "project": _serialize_project(
            proj_row,
            task_rows,
            eval_row,
            git_repo=repo_by_proj.get(project_id),
            commits_by_code=commits_by_proj_code,
            prs_by_code=prs_by_proj_code,
        )
    }


@router.post("/kanban/workspace/projects/{project_id}/tasks", status_code=status.HTTP_201_CREATED)
def create_workspace_task(
    project_id: str,
    payload: WorkspaceTaskCreateIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Tạo mới 1 Task Kanban trong dự án và lưu vào SQLite."""
    now = now_utc()
    with db() as conn:
        proj = conn.execute("SELECT id FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

        max_pos = conn.execute(
            "SELECT COALESCE(MAX(position_order), -1) m FROM engineering_tasks WHERE project_id=? AND column_id=?",
            (project_id, payload.column),
        ).fetchone()["m"]
        created_task = _insert_workspace_task(conn, project_id, payload, int(max_pos) + 1, now)

    return {"task": created_task}


@router.post("/kanban/workspace/projects/{project_id}/tasks/batch", status_code=status.HTTP_201_CREATED)
def batch_create_workspace_tasks(
    project_id: str,
    payload: WorkspaceTaskBatchCreateIn,
    _: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lưu hàng loạt Task (dùng cho AI Chia Việc WBS & Nhập CSV)."""
    now = now_utc()
    created_list: list[dict[str, Any]] = []
    with db() as conn:
        proj = conn.execute("SELECT id FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

        if payload.replace:
            conn.execute("DELETE FROM engineering_tasks WHERE project_id=?", (project_id,))
            next_pos = 0
        else:
            max_pos = conn.execute(
                "SELECT COALESCE(MAX(position_order), -1) m FROM engineering_tasks WHERE project_id=?",
                (project_id,),
            ).fetchone()["m"]
            next_pos = int(max_pos) + 1
        id_remap: dict[str, str] = {}

        for idx, item in enumerate(payload.tasks):
            orig_id = item.id
            if item.dependsOn and item.dependsOn in id_remap:
                item = item.model_copy(update={"dependsOn": id_remap[item.dependsOn]})
            inserted = _insert_workspace_task(conn, project_id, item, next_pos + idx, now)
            if orig_id:
                id_remap[orig_id] = inserted["id"]
            created_list.append(inserted)

    return {"tasks": created_list}


@router.post("/kanban/workspace/ai-wbs")
def generate_ai_wbs(
    payload: WorkspaceAiWbsIn,
    _: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """AI Chia Việc tự động (Scrum WBS + ràng buộc H2) phân bổ cho các thành viên đã chọn."""
    feature = payload.feature_name.strip()
    stamp = uid()[:6]
    stack_labels = {
        "ai": "Trí tuệ nhân tạo (AI/ML & Socratic Prompting)",
        "backend": "Backend Core (FastAPI + Layered Architecture)",
        "database": "Cơ sở dữ liệu (ERD, Migrations SQLite/Postgres)",
        "sandbox": "Sandbox & Security (Docker Isolated Runner)",
        "devops": "DevOps & CI/CD (GitHub Actions, Docker Compose)",
        "frontend": "Giao diện Frontend (React 19 + Tailwind CSS)",
        "fullstack": "Toàn trình End-to-End (Fullstack Monorepo)",
    }
    tech_label = payload.custom_tech.strip() if (payload.stack == "custom" and payload.custom_tech.strip()) else stack_labels.get(payload.stack, "Backend Architecture")

    pool = payload.selected_members or [
        {"name": "Nguyễn Bá Hòa", "avatar": "H", "role": "Leader & Architect"},
        {"name": "Võ Nhật Huy", "avatar": "H", "role": "Frontend & AI Dev"},
        {"name": "Phan Đình Nghị", "avatar": "N", "role": "Backend & Database"},
    ]

    def _assignee(idx: int) -> dict[str, str]:
        m = pool[idx % len(pool)]
        return {
            "name": str(m.get("name") or "Nguyễn Bá Hòa"),
            "avatar": str(m.get("avatar") or "H"),
            "role": str(m.get("role") or "Developer"),
        }

    t1_id = f"task-ai-{stamp}-1"
    t2_id = f"task-ai-{stamp}-2"
    t3_id = f"task-ai-{stamp}-3"

    specs = [
        (
            t1_id, f"ARC-{random.randint(10, 99)}",
            f"Thiết kế Kiến trúc & Data Model: {feature}",
            f"Đặc tả kỹ thuật [{tech_label}], phân tích schema CSDL 3NF và sequence diagram. "
            + (f"Yêu cầu: {payload.description.strip()}" if payload.description.strip() else ""),
            "high", "must", 5, _assignee(0), 4.0, "14/11", "bg-blue-50 text-blue-700 border-blue-200", None,
            [{"id": f"ai-c1-{stamp}", "text": "Đặc tả schema database & DTO contracts", "done": False},
             {"id": f"ai-c2-{stamp}", "text": "Vẽ sơ đồ luồng dữ liệu (Sequence diagram)", "done": False}],
        ),
        (
            t2_id, f"CORE-{random.randint(10, 99)}",
            f"Xây dựng Core Logic Service: {feature}",
            "Hiện thực hóa logic nghiệp vụ theo Kiến trúc 3 tầng, kết nối router RESTful và ràng buộc H2/H3.",
            "high", "must", 5, _assignee(1), 4.5, "18/11", "bg-amber-50 text-amber-700 border-amber-200",
            t1_id if payload.include_h2 else None,
            [{"id": f"ai-c3-{stamp}", "text": "Viết logic xử lý cốt lõi trong services/", "done": False},
             {"id": f"ai-c4-{stamp}", "text": "Cấu hình API Endpoint & validate Pydantic", "done": False}],
        ),
        (
            t3_id, f"QA-{random.randint(10, 99)}",
            f"Bộ Kiểm thử Tự động & QA: {feature}",
            "Viết unit tests pytest tự động kiểm tra happy path, edge cases và thời gian phản hồi < 300ms.",
            "medium", "should", 3, _assignee(2), 3.5, "20/11", "bg-teal-50 text-teal-700 border-teal-200",
            t2_id if payload.include_h2 else None,
            [{"id": f"ai-c5-{stamp}", "text": "Viết test cases happy path & edge cases", "done": False},
             {"id": f"ai-c6-{stamp}", "text": "Kiểm tra đồng bộ SQLite & audit log", "done": False}],
        ),
        (
            f"task-ai-{stamp}-4", f"FE-{random.randint(10, 99)}",
            f"Giao diện Tương tác React: {feature}",
            "Thiết kế UI component đồng bộ với hệ thống Marlo theme CodeMind, nối src/api.ts và xử lý loading/error.",
            "medium", "should", 3, _assignee(3), 3.0, "22/11", "bg-indigo-50 text-indigo-700 border-indigo-200",
            t2_id if payload.include_h2 else None,
            [{"id": f"ai-c7-{stamp}", "text": "Nối hook API client trong src/api.ts", "done": False}],
        ),
        (
            f"task-ai-{stamp}-5", f"DOC-{random.randint(10, 99)}",
            f"Tài liệu Kỹ thuật & Slide Báo cáo: {feature}",
            "Cập nhật tài liệu SRS Master Blueprint và xuất báo cáo tiến độ nộp Hội đồng Phản biện.",
            "low", "could", 2, _assignee(4), 2.5, "24/11", "bg-purple-50 text-purple-700 border-purple-200",
            t3_id if payload.include_h2 else None,
            [{"id": f"ai-c8-{stamp}", "text": "Cập nhật slide thuyết trình & hướng dẫn sử dụng", "done": False}],
        ),
        (
            f"task-ai-{stamp}-6", f"OPS-{random.randint(10, 99)}",
            f"Đóng gói Docker & Smoke Test Production: {feature}",
            "Kiểm thử build pipeline, kiểm soát hiệu năng & phát hành bản ổn định lên server demo.",
            "medium", "could", 3, _assignee(5), 3.0, "26/11", "bg-emerald-50 text-emerald-700 border-emerald-200",
            t3_id if payload.include_h2 else None,
            [{"id": f"ai-c9-{stamp}", "text": "Kiểm thử tích hợp end-to-end không lỗi console", "done": False}],
        ),
    ]

    count = max(2, min(payload.granularity, len(specs)))
    generated: list[dict[str, Any]] = []
    for item in specs[:count]:
        tid, code, title, desc, prio, moscow, pts, assignee, est, due, e_col, dep, chk = item
        generated.append(
            {
                "id": tid,
                "code": code,
                "title": title,
                "description": desc,
                "column": "backlog",
                "priority": prio,
                "moscow": moscow,
                "points": pts,
                "assignee": assignee,
                "estimateHours": est,
                "dueDate": due,
                "epic": feature,
                "epicColor": e_col,
                **({"dependsOn": dep} if dep else {}),
                "checklist": chk,
                "definitionOfDone": _default_dod(False),
                "commentsCount": 0,
                "attachmentsCount": 0,
            }
        )

    with db() as conn:
        conn.execute("UPDATE ai_service_units SET requests = requests + 1 WHERE id='svc-aigc'")

    return {"tasks": generated}


@router.patch("/kanban/workspace/tasks/{task_id}")
def patch_workspace_task(
    task_id: str,
    payload: WorkspaceTaskPatchIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Cập nhật chi tiết Task (Checklist, DoD, Assignee, Cột) và kiểm tra H2 khi sang Hoàn thành."""
    now = now_utc()
    actor_name = user.get("full_name") or user.get("display_name") or "Thành viên"
    with db() as conn:
        existing = conn.execute("SELECT * FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy task")

        target_col = payload.column if payload.column is not None else existing["column_id"]
        if target_col == "done" and existing["column_id"] != "done":
            _check_h2_constraint(conn, existing, target_col)
        _check_git_proof_for_done(
            conn,
            user,
            existing,
            target_col,
            payload.submissionUrl,
        )

        existing_logs = json.loads(existing["audit_logs_json"] or "[]")
        if payload.auditLogs is not None:
            logs_out = payload.auditLogs
        else:
            logs_out = _append_column_audit_log(existing_logs, actor_name, existing["column_id"], target_col)

        conn.execute(
            """UPDATE engineering_tasks
               SET title=?, description=?, column_id=?, priority=?, moscow=?, points=?,
                   assignee_json=?, estimate_hours=?, due_date=?, epic=?, epic_color=?,
                   depends_on=?, checklist_json=?, dod_json=?, user_story_json=?,
                   acceptance_criteria=?, deliverable_json=?, submission_requirement=?,
                   submission_url=?, is_bonus=?, comments_count=?, attachments_count=?,
                   audit_logs_json=?, position_order=?, updated_at=?
               WHERE id=?""",
            (
                payload.title if payload.title is not None else existing["title"],
                payload.description if payload.description is not None else existing["description"],
                target_col,
                payload.priority if payload.priority is not None else existing["priority"],
                payload.moscow if payload.moscow is not None else existing["moscow"],
                payload.points if payload.points is not None else existing["points"],
                json.dumps(payload.assignee, ensure_ascii=False) if payload.assignee is not None else existing["assignee_json"],
                payload.estimateHours if payload.estimateHours is not None else existing["estimate_hours"],
                payload.dueDate if payload.dueDate is not None else existing["due_date"],
                payload.epic if payload.epic is not None else existing["epic"],
                payload.epicColor if payload.epicColor is not None else existing["epic_color"],
                payload.dependsOn if payload.dependsOn is not None else existing["depends_on"],
                json.dumps(payload.checklist, ensure_ascii=False) if payload.checklist is not None else existing["checklist_json"],
                json.dumps(payload.definitionOfDone, ensure_ascii=False) if payload.definitionOfDone is not None else existing["dod_json"],
                json.dumps(payload.userStory, ensure_ascii=False) if payload.userStory is not None else existing["user_story_json"],
                payload.acceptanceCriteria if payload.acceptanceCriteria is not None else existing["acceptance_criteria"],
                json.dumps(payload.deliverable, ensure_ascii=False) if payload.deliverable is not None else existing["deliverable_json"],
                payload.submissionRequirement if payload.submissionRequirement is not None else existing["submission_requirement"],
                payload.submissionUrl if payload.submissionUrl is not None else existing["submission_url"],
                (1 if payload.isBonus else 0) if payload.isBonus is not None else existing["is_bonus"],
                payload.commentsCount if payload.commentsCount is not None else existing["comments_count"],
                payload.attachmentsCount if payload.attachmentsCount is not None else existing["attachments_count"],
                json.dumps(logs_out, ensure_ascii=False),
                payload.positionOrder if payload.positionOrder is not None else existing["position_order"],
                now,
                task_id,
            ),
        )
        xp_awarded = _award_task_done_xp(conn, user, existing, target_col)
        updated = conn.execute("SELECT * FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()
        task_git_act = _fetch_single_task_git_activity(conn, updated)

    return {"task": _serialize_task(updated, task_git_act), "xp_awarded": xp_awarded}


@router.post("/kanban/workspace/tasks/{task_id}/move")
def move_workspace_task(
    task_id: str,
    payload: WorkspaceTaskMoveIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Kéo thả / di chuyển Task sang cột mới với vị trí chính xác, kiểm tra H2 và minh chứng Git."""
    now = now_utc()
    actor_name = user.get("full_name") or user.get("display_name") or "Thành viên"
    with db() as conn:
        existing = conn.execute("SELECT * FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy task")

        target_col = payload.target_column.strip()
        if user.get("role") == "student" and target_col == "verified":
            raise HTTPException(
                status_code=403,
                detail="Cột 'Đã nghiệm thu' chỉ dành riêng cho Giảng viên hướng dẫn thẩm định. Sinh viên chỉ có thể chuyển sang 'Hoàn thành' để chờ nghiệm thu."
            )
        _check_h2_constraint(conn, existing, target_col)
        _check_git_proof_for_done(conn, user, existing, target_col)

        existing_logs = json.loads(existing["audit_logs_json"] or "[]")
        logs_out = _append_column_audit_log(existing_logs, actor_name, existing["column_id"], target_col)

        # Re-index target column items with task inserted at target_index
        col_rows = conn.execute(
            """SELECT id FROM engineering_tasks
               WHERE project_id=? AND column_id=? AND id != ?
               ORDER BY position_order ASC, rowid ASC""",
            (existing["project_id"], target_col, task_id),
        ).fetchall()
        ordered_ids = [r["id"] for r in col_rows]
        bounded_idx = max(0, min(payload.target_index, len(ordered_ids)))
        ordered_ids.insert(bounded_idx, task_id)

        conn.execute(
            "UPDATE engineering_tasks SET column_id=?, audit_logs_json=?, updated_at=? WHERE id=?",
            (target_col, json.dumps(logs_out, ensure_ascii=False), now, task_id),
        )
        for idx, tid in enumerate(ordered_ids):
            conn.execute("UPDATE engineering_tasks SET position_order=? WHERE id=?", (idx, tid))

        xp_awarded = _award_task_done_xp(conn, user, existing, target_col)
        updated = conn.execute("SELECT * FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()
        task_git_act = _fetch_single_task_git_activity(conn, updated)

    return {"task": _serialize_task(updated, task_git_act), "xp_awarded": xp_awarded}


@router.delete("/kanban/workspace/tasks/{task_id}")
def delete_workspace_task(
    task_id: str,
    _: dict[str, Any] = Depends(current_user),
) -> dict[str, str]:
    """Xóa Task khỏi bảng Kanban & giải phóng các khóa phụ thuộc H2 trỏ tới Task này."""
    with db() as conn:
        existing = conn.execute("SELECT id FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy task")
        conn.execute("UPDATE engineering_tasks SET depends_on=NULL WHERE depends_on=?", (task_id,))
        conn.execute("DELETE FROM engineering_tasks WHERE id=?", (task_id,))
    return {"status": "deleted", "id": task_id}


# ============================================================================
# NHÁNH 3: THẨM ĐỊNH TASK & CHẤM ĐIỂM ĐỒ ÁN (ANTI-FREERIDER GRADING)
# ============================================================================

class TaskReviewIn(BaseModel):
    decision: str  # "approve" | "request_revision"
    feedback: str = ""
    rating: int | None = None


class ProjectEvaluationIn(BaseModel):
    group_score: float
    architecture_score: float
    process_score: float
    defense_score: float
    feedback: str
    member_scores: list[dict[str, Any]]


@router.post("/kanban/workspace/tasks/{task_id}/review")
def review_workspace_task(
    task_id: str,
    payload: TaskReviewIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Giảng viên thẩm định & nghiệm thu Task (Approve -> verified hoặc Request Revision -> fail)."""
    if user.get("role") not in ("instructor", "admin"):
        raise HTTPException(status_code=403, detail="Chỉ Giảng viên hoặc Admin mới có quyền thẩm định task.")

    now = now_utc()
    ts_display = datetime.now().strftime("%d/%m/%Y %H:%M")
    actor_name = user.get("full_name") or user.get("display_name") or "Giảng viên"
    with db() as conn:
        task = conn.execute("SELECT * FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Không tìm thấy task")

        target_col = "verified" if payload.decision == "approve" else "fail"
        existing_logs = json.loads(task["audit_logs_json"] or "[]")
        clean_fb = (payload.feedback or "").strip()
        if payload.decision == "approve":
            action_note = (
                f"Giảng viên {actor_name} đã nghiệm thu task"
                + (f": {clean_fb}" if clean_fb else ".")
            )
        else:
            action_note = (
                f"Giảng viên {actor_name} yêu cầu sửa lại: "
                + (clean_fb or "Cần bổ sung test cases và hoàn thiện tiêu chí DoD.")
            )
        existing_logs.append({
            "user": actor_name,
            "fromColumn": COLUMN_LABEL.get(task["column_id"], task["column_id"]),
            "toColumn": COLUMN_LABEL.get(target_col, target_col),
            "timestamp": ts_display,
            "note": action_note,
        })

        xp_awarded = 0
        if payload.decision == "approve":
            xp_awarded = _award_task_done_xp(conn, user, task, "verified")

        conn.execute(
            "UPDATE engineering_tasks SET column_id=?, audit_logs_json=?, updated_at=? WHERE id=?",
            (target_col, json.dumps(existing_logs, ensure_ascii=False), now, task_id),
        )

        updated = conn.execute("SELECT * FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()

    return {
        "status": "reviewed",
        "decision": payload.decision,
        "task": _serialize_task(updated),
        "xp_awarded": xp_awarded,
    }


@router.get("/kanban/workspace/projects/{project_id}/evaluation")
def get_project_evaluation(
    project_id: str,
    user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> dict[str, Any]:
    """Lấy kết quả đánh giá đồ án hoặc tính toán đề xuất điểm số Anti-Freerider trực tiếp từ tiến độ thực tế."""
    with db() as conn:
        proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

        eval_row = conn.execute(
            "SELECT * FROM project_evaluations WHERE project_id=? ORDER BY graded_at DESC LIMIT 1",
            (project_id,),
        ).fetchone()

        tasks = conn.execute("SELECT * FROM engineering_tasks WHERE project_id=?", (project_id,)).fetchall()
        team = json.loads(proj["team_json"] or "[]")

        member_stats: dict[str, dict[str, Any]] = {}
        for m in team:
            member_stats[m["id"]] = {
                "member_id": m["id"],
                "name": m["name"],
                "role": m.get("role", "Developer"),
                "avatar": m.get("avatar", ""),
                "total_tasks": 0,
                "done_tasks": 0,
                "verified_tasks": 0,
                "completed_points": 0,
                "total_points": 0,
                "dod_completed": 0,
                "dod_total": 0,
            }

        total_done_points = 0
        for t in tasks:
            td = dict(t)
            assignee = json.loads(td.get("assignee_json") or "{}")
            pts = int(td.get("points") or 0)
            col = td["column_id"]
            dods = json.loads(td.get("dod_json") or "[]")
            m_id = assignee.get("id")

            # Ghép nối linh hoạt theo ID hoặc Họ tên thành viên
            matched_mid = None
            if m_id and m_id in member_stats:
                matched_mid = m_id
            else:
                assignee_name = (assignee.get("name") or "").strip().lower()
                for mem_id, s in member_stats.items():
                    if s["name"].strip().lower() == assignee_name:
                        matched_mid = mem_id
                        break

            if matched_mid:
                member_stats[matched_mid]["total_tasks"] += 1
                member_stats[matched_mid]["total_points"] += pts
                member_stats[matched_mid]["dod_total"] += len(dods)
                member_stats[matched_mid]["dod_completed"] += sum(1 for d in dods if d.get("done"))
                if col in ("done", "verified"):
                    member_stats[matched_mid]["done_tasks"] += 1
                    member_stats[matched_mid]["completed_points"] += pts
                    total_done_points += pts
                if col == "verified":
                    member_stats[matched_mid]["verified_tasks"] += 1

        num_members = max(1, len(team))
        expected_share = 100.0 / num_members
        stats_list = []
        for m_id, s in member_stats.items():
            pct = round((s["completed_points"] / total_done_points * 100.0) if total_done_points > 0 else expected_share, 1)
            s["contribution_pct"] = pct
            ratio = pct / expected_share if expected_share > 0 else 1.0
            factor = max(0.7, min(1.15, ratio))
            s["suggested_factor"] = round(factor, 2)
            stats_list.append(s)

        if eval_row:
            return {
                "is_graded": True,
                "evaluation": row_dict(eval_row),
                "anti_freerider_metrics": stats_list,
                "total_completed_points": total_done_points,
            }

        return {
            "is_graded": False,
            "project": row_dict(proj),
            "anti_freerider_metrics": stats_list,
            "total_completed_points": total_done_points,
        }


@router.post("/kanban/workspace/projects/{project_id}/evaluate")
def evaluate_project(
    project_id: str,
    payload: ProjectEvaluationIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Giảng viên nộp điểm nghiệm thu đồ án, áp dụng trọng số Anti-Freerider & cấp XP."""
    if user.get("role") not in ("instructor", "admin"):
        raise HTTPException(status_code=403, detail="Chỉ Giảng viên hoặc Admin mới có quyền chấm điểm đồ án.")

    eval_id = f"eval-{uid()[:8]}"
    now = now_utc()
    instructor_name = user.get("full_name") or user.get("display_name") or "Giảng viên"

    final_score = round(
        0.30 * payload.architecture_score + 0.40 * payload.process_score + 0.30 * payload.defense_score,
        2,
    )

    with db() as conn:
        proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

        conn.execute(
            """INSERT OR REPLACE INTO project_evaluations(
                   id, project_id, instructor_id, group_score, architecture_score,
                   process_score, defense_score, final_score, feedback,
                   member_scores_json, anti_freerider_metrics_json, status, graded_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                eval_id,
                project_id,
                user["id"],
                payload.group_score,
                payload.architecture_score,
                payload.process_score,
                payload.defense_score,
                final_score,
                payload.feedback,
                json.dumps(payload.member_scores, ensure_ascii=False),
                json.dumps(payload.member_scores, ensure_ascii=False),
                "graded",
                now,
            ),
        )

        conn.execute(
            "UPDATE engineering_projects SET status='delivered', tl_color='done', updated_at=? WHERE id=?",
            (now, project_id),
        )
        _credit_student_xp(conn, 150)

        team = json.loads(proj["team_json"] or "[]")
        for m in team:
            notif_id = f"notif-ev-{uid()[:8]}"
            conn.execute(
                """INSERT INTO notifications(
                       id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
                   ) VALUES(?,?,?,?,?,?,?,?,?)""",
                (
                    notif_id,
                    None,
                    "student",
                    f"Đồ án {proj['code']} đã được nghiệm thu!",
                    f"Giảng viên {instructor_name} đã hoàn tất chấm điểm với Điểm chung: {final_score}/10.",
                    "project",
                    0,
                    "/kanban",
                    now,
                ),
            )

    return {
        "status": "graded",
        "eval_id": eval_id,
        "final_score": final_score,
    }
