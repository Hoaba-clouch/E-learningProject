from __future__ import annotations

import json
import random
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import current_user, get_optional_current_user, record_audit_log
from app.api.v1.auth import serialize_shared_profile_fields
from app.core.database import db, row_dict
from app.services.github_evidence import GitHubEvidenceError, has_completed_task_proof, load_snapshot, parse_github_repo
from app.core.security import uid
from app.core.timezone import now_utc
from app.schemas.kanban import (
    TaskCreate,
    TaskMove,
    ProjectInviteIn,
    WorkspaceAiWbsIn,
    WorkspaceProjectCreateIn,
    WorkspaceProjectPatchIn,
    WorkspaceTaskBatchCreateIn,
    WorkspaceTaskCreateIn,
    WorkspaceTaskMoveIn,
    WorkspaceTaskPatchIn,
)
from app.services.gemini_client import generate_json, record_ai_usage

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
    try:
        return parse_github_repo(repo_url or "")[1]
    except GitHubEvidenceError:
        return ""


def _url_matches_project_repo(url: str | None, repo_obj: Any | None) -> bool:
    if not repo_obj:
        return False
    parsed = urlparse((url or "").strip())
    if (parsed.scheme != "https" or parsed.netloc.lower() != "github.com"
            or parsed.username or parsed.password or parsed.query or parsed.fragment):
        return False
    parts = parsed.path.strip("/").split("/")
    if len(parts) != 4:
        return False
    rd = dict(repo_obj)
    expected = str(rd.get("repo_slug") or rd.get("repoSlug") or "").lower()
    return bool(expected and "/".join(parts[:2]).lower() == expected and (
        (parts[2] == "commit" and re.fullmatch(r"[0-9a-fA-F]{40}", parts[3]))
        or (parts[2] == "pull" and re.fullmatch(r"[1-9][0-9]*", parts[3]))))


def _build_project_git_maps(conn: Any) -> tuple[dict, dict, dict]:
    """Expose only records fetched from GitHub, never legacy seeded Git rows."""
    repo_rows = conn.execute("SELECT * FROM git_repositories").fetchall()
    repo_by_proj, commits_by_proj_code, prs_by_proj_code = {}, {}, {}
    for rr in repo_rows:
        pid = rr["project_id"]
        snapshot, last_error = load_snapshot(conn, pid, rr["repo_slug"])
        if snapshot and snapshot.get("branch") != rr["target_branch"]:
            snapshot = None
        commits = snapshot.get("commits", []) if snapshot else []
        prs = snapshot.get("pullRequests", []) if snapshot else []
        repo_by_proj[pid] = {
            "repoUrl": rr["repo_url"], "repoSlug": rr["repo_slug"],
            "targetBranch": rr["target_branch"], "webhookActive": False,
            "lastSyncedAt": snapshot["fetchedAt"] if snapshot else "",
            "evidenceVerified": bool(snapshot), "lastSyncError": last_error,
            "commitsCount": len(commits), "openPrsCount": sum(p["status"] == "open" for p in prs),
            "mergedPrsCount": sum(p["status"] == "merged" for p in prs), "totalPrsCount": len(prs),
        }
        for commit in commits:
            code = str(commit.get("taskCode") or "").upper()
            if code:
                commits_by_proj_code.setdefault((pid, code), []).append({
                    "id": commit["id"], "sha": commit["sha"], "branch": commit["branch"],
                    "message": commit["message"], "authorName": commit["author"]["name"],
                    "timeAgo": commit["date"], "url": commit["url"], "evidenceSource": "github-rest"})
        for pr in prs:
            code = str(pr.get("taskCode") or "").upper()
            if code:
                prs_by_proj_code.setdefault((pid, code), []).append({**pr, "prUrl": pr["url"]})
    return repo_by_proj, commits_by_proj_code, prs_by_proj_code


def _build_task_git_activity(submission_url: str | None, repo_summary: dict[str, Any] | None,
                             commits_list: list[dict[str, Any]], prs_list: list[dict[str, Any]]) -> dict[str, Any]:
    latest_pr = prs_list[0] if prs_list else None
    latest_commit = commits_list[0] if commits_list else None
    return {
        "commits": commits_list[:6], "pullRequests": prs_list[:4], "commitsCount": len(commits_list),
        "latestCommitSha": latest_commit["sha"] if latest_commit else None,
        "latestPrNumber": latest_pr["prNumber"] if latest_pr else None,
        "latestPrStatus": latest_pr["status"] if latest_pr else None,
        "latestPrUrl": latest_pr["prUrl"] if latest_pr else None,
        "hasValidGitProof": bool(repo_summary and repo_summary.get("evidenceVerified")
                                 and any(has_completed_task_proof(pr) for pr in prs_list)),
    }


def _fetch_single_task_git_activity(conn: Any, task_row: Any) -> dict[str, Any]:
    repos, commits, prs = _build_project_git_maps(conn)
    pid = task_row["project_id"]
    code = str(task_row["code"] or "").strip().lstrip("#").upper()
    return _build_task_git_activity(task_row["submission_url"], repos.get(pid),
                                    commits.get((pid, code), []), prs.get((pid, code), []))


def _normalize_audit_logs(raw_logs: Any, fallback_col: str = "") -> list[dict[str, Any]]:
    if not isinstance(raw_logs, list):
        return []
    alias_labels = {
        **COLUMN_LABEL,
        "todo": "Cần làm",
        "in_progress": "Đang làm",
        "in_review": "Đang review",
    }
    normalized: list[dict[str, Any]] = []
    for item in raw_logs:
        if not isinstance(item, dict):
            continue
        entry = dict(item)
        entry["user"] = str(entry.get("user") or entry.get("actor") or "Hệ thống")
        entry["timestamp"] = str(entry.get("timestamp") or "")
        from_col = str(entry.get("fromColumn") or entry.get("from_column") or "").strip()
        to_col = str(entry.get("toColumn") or entry.get("to_column") or "").strip()
        action = str(entry.get("action") or "").strip()
        if (not from_col or not to_col) and "->" in action and ":" in action:
            parts = action.split(":", 1)[1].split("->", 1)
            if len(parts) == 2:
                raw_from = parts[0].strip()
                raw_to = parts[1].strip()
                if not from_col:
                    from_col = alias_labels.get(raw_from, raw_from)
                if not to_col:
                    to_col = alias_labels.get(raw_to, raw_to)
        entry["fromColumn"] = from_col or "Khởi tạo"
        entry["toColumn"] = (
            to_col
            or alias_labels.get(fallback_col, fallback_col)
            or action
            or "Cập nhật"
        )
        normalized.append(entry)
    return normalized


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
    audit_logs = _normalize_audit_logs(
        json.loads(d.get("audit_logs_json") or "[]"),
        str(d.get("column_id") or ""),
    )

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



_EARLY_MENTOR_PREFIX_RE = re.compile(
    r"^(?:p?gs\.?\s*|ts\.?\s*|ths\.?\s*|ks\.?\s*|cô\s+|thầy\s+|giảng\s+viên\s+|gvhd\s*[:\-]?\s*|gvpb\s*[:\-]?\s*)+",
    re.IGNORECASE,
)


def _clean_person_name_for_match(raw: str | None) -> str:
    cleaned = re.sub(r"\([^)]*\)", " ", raw or "")
    cleaned = " ".join(cleaned.split()).strip()
    stripped = _EARLY_MENTOR_PREFIX_RE.sub("", cleaned)
    return " ".join(stripped.split()).strip().lower()


def is_project_advisor(user: dict[str, Any] | None, proj_row: Any) -> bool:
    """Kiểm tra người dùng có phải GV Hướng dẫn của đồ án (hoặc Admin) không."""
    if not user:
        return False
    u_role = str(user.get("role") or "").strip().lower()
    if u_role in ("admin", "org_admin"):
        return True
    if u_role != "instructor":
        return False
    p_dict = dict(proj_row)
    uid_val = str(user.get("id") or "").strip()
    inst_id = str(p_dict.get("instructor_id") or "").strip()
    if inst_id and inst_id != "instructor-demo":
        return inst_id == uid_val or inst_id == f"usr-{uid_val}"
    u_stripped = _clean_person_name_for_match(user.get("full_name") or user.get("display_name") or "")
    if not u_stripped:
        return False
    for field in (p_dict.get("instructor_name"), p_dict.get("instructor_label")):
        f_stripped = _clean_person_name_for_match(field)
        if f_stripped and (f_stripped == u_stripped or u_stripped in f_stripped or f_stripped in u_stripped):
            return True
    return False


def is_project_reviewer(user: dict[str, Any] | None, proj_row: Any) -> bool:
    """Kiểm tra người dùng có phải GV Phản biện được phân công trên đồ án không."""
    if not user:
        return False
    u_role = str(user.get("role") or "").strip().lower()
    if u_role != "instructor":
        return False
    p_dict = dict(proj_row)
    uid_val = str(user.get("id") or "").strip()
    rev_id = str(p_dict.get("reviewer_id") or "").strip()
    if rev_id:
        return rev_id == uid_val or rev_id == f"usr-{uid_val}"
    u_stripped = _clean_person_name_for_match(user.get("full_name") or user.get("display_name") or "")
    rev_stripped = _clean_person_name_for_match(p_dict.get("reviewer_name"))
    return bool(
        u_stripped
        and rev_stripped
        and (rev_stripped == u_stripped or u_stripped in rev_stripped or rev_stripped in u_stripped)
    )


def can_grade_project_council(user: dict[str, Any] | None, proj_row: Any) -> bool:
    """Hướng 2: Chỉ Admin, GV Hướng dẫn hoặc GV Phản biện được chỉ định mới có quyền chấm đồ án."""
    if not user:
        return False
    u_role = str(user.get("role") or "").strip().lower()
    if u_role in ("admin", "org_admin"):
        return True
    if u_role == "instructor":
        return is_project_advisor(user, proj_row) or is_project_reviewer(user, proj_row)
    return False


def is_user_in_project(user: dict[str, Any] | None, proj_row: Any) -> bool:
    if not user:
        return True
    u_role = str(user.get("role") or "").lower()
    if u_role in ("admin", "org_admin"):
        return True
    if u_role == "instructor":
        return can_grade_project_council(user, proj_row)

    uid_val = str(user.get("id") or "").strip()
    u_email = str(user.get("email") or "").strip().lower()
    u_name = str(user.get("full_name") or user.get("display_name") or "").strip().lower()

    p_dict = dict(proj_row)
    leader_id = str(p_dict.get("leader_user_id") or "").strip()
    if leader_id and (leader_id == uid_val or leader_id == f"usr-{uid_val}"):
        return True

    created_by = str(p_dict.get("created_by") or "").strip()
    if created_by and (created_by == uid_val or created_by == f"usr-{uid_val}"):
        return True

    try:
        raw_team = p_dict.get("team_json") or "[]"
        team_list = json.loads(raw_team) if isinstance(raw_team, str) else (raw_team or [])
    except Exception:
        team_list = []

    for tm in team_list:
        if not isinstance(tm, dict):
            continue
        tm_id = str(tm.get("id") or "").strip()
        tm_email = str(tm.get("email") or "").strip().lower()
        tm_name = str(tm.get("name") or "").strip().lower()
        if tm_id and (tm_id == uid_val or tm_id == f"usr-{uid_val}"):
            return True
        if tm_email and tm_email == u_email:
            return True
        if tm_name and u_name and tm_name == u_name:
            return True

    return False


def is_user_project_leader(user: dict[str, Any] | None, proj_row: Any) -> bool:
    """Xác định người dùng có phải Nhóm trưởng đồ án, GVHD của đồ án hoặc Admin hay không."""
    if not user:
        return False
    u_role = str(user.get("role") or "").strip().lower()
    if u_role in ("admin", "org_admin"):
        return True
    if u_role == "instructor":
        return is_project_advisor(user, proj_row)

    uid_val = str(user.get("id") or "").strip()
    u_email = str(user.get("email") or "").strip().lower()
    u_name = str(user.get("full_name") or user.get("display_name") or "").strip().lower()

    p_dict = dict(proj_row)
    leader_id = str(p_dict.get("leader_user_id") or "").strip()
    if leader_id:
        if leader_id == uid_val or leader_id == f"usr-{uid_val}":
            return True
    else:
        created_by = str(p_dict.get("created_by") or "").strip()
        if created_by and (created_by == uid_val or created_by == f"usr-{uid_val}"):
            return True

    try:
        raw_team = p_dict.get("team_json") or "[]"
        team_list = json.loads(raw_team) if isinstance(raw_team, str) else (raw_team or [])
    except Exception:
        team_list = []

    for idx, tm in enumerate(team_list):
        if not isinstance(tm, dict):
            continue
        tm_id = str(tm.get("id") or "").strip()
        tm_email = str(tm.get("email") or "").strip().lower()
        tm_name = str(tm.get("name") or "").strip().lower()
        matches_user = (
            (tm_id and (tm_id == uid_val or tm_id == f"usr-{uid_val}"))
            or (tm_email and u_email and tm_email == u_email)
            or (tm_name and u_name and tm_name == u_name)
        )
        if not matches_user:
            continue
        if tm.get("isLead") is True or idx == 0:
            return True

    return False


def _is_task_assignee(user: dict[str, Any], task_row: Any) -> bool:
    uid_val = str(user.get("id") or "").strip()
    u_email = str(user.get("email") or "").strip().lower()
    u_name = str(user.get("full_name") or user.get("display_name") or "").strip().lower()
    t_dict = dict(task_row)
    if str(t_dict.get("assignee_user_id") or "").strip() == uid_val and uid_val:
        return True
    try:
        raw = t_dict.get("assignee_json") or "{}"
        assignee = json.loads(raw) if isinstance(raw, str) else (raw or {})
    except Exception:
        return False
    if not isinstance(assignee, dict):
        return False
    a_id = str(assignee.get("id") or "").strip()
    a_email = str(assignee.get("email") or "").strip().lower()
    a_name = str(assignee.get("name") or "").strip().lower()
    return bool(
        (a_id and (a_id == uid_val or a_id == f"usr-{uid_val}"))
        or (a_email and u_email and a_email == u_email)
        or (a_name and u_name and a_name == u_name)
    )


def _ensure_project_writable_for_user(user: dict[str, Any], proj_row: Any, action_label: str = "chỉnh sửa công việc") -> None:
    u_role = str(user.get("role") or "").strip().lower()
    if u_role == "instructor":
        if not is_project_advisor(user, proj_row):
            raise HTTPException(
                status_code=403,
                detail=f"Chỉ Giảng viên hướng dẫn được phân công cho đồ án này hoặc Admin mới có quyền {action_label}.",
            )
    elif u_role == "student":
        p_dict = dict(proj_row)
        if not is_user_in_project(user, proj_row):
            raise HTTPException(status_code=403, detail=f"Chỉ thành viên trong nhóm đồ án này mới có quyền {action_label}.")
        if bool(p_dict.get("is_frozen")):
            raise HTTPException(status_code=403, detail=f"Đồ án đã bị đóng băng nộp bài, không thể {action_label}.")
        if _normalize_project_status(p_dict.get("status")) == "delivered":
            raise HTTPException(status_code=403, detail=f"Đồ án đã bảo vệ xong (Do GVHD chốt), không thể {action_label}.")


DEFAULT_PROJECT_MENTORS: dict[str, str] = {
    "prj-codemind": "Cô Trần Thị B (GV Hướng dẫn)",
    "prj-compiler": "Cô Trần Thị B (GV Hướng dẫn)",
    "prj-devnet": "Cô Trần Thị B (GV Hướng dẫn)",
    "prj-ecommerce": "Thầy Nguyễn Phước (GV Hướng dẫn)",
    "prj-faceattend": "TS. Lê Hoàng Mai (GV Hướng dẫn)",
    "prj-medai": "TS. Lê Hoàng Mai (GV Hướng dẫn)",
    "prj-pintos": "Thầy Trần Minh Quân (GV Hướng dẫn)",
    "prj-security": "Thầy Đặng Quốc Bảo (GV Hướng dẫn)",
}


def _serialize_project(
    proj_row: Any,
    task_rows: list[Any],
    eval_row: Any | None = None,
    git_repo: dict[str, Any] | None = None,
    commits_by_code: dict[tuple[str, str], list[dict[str, Any]]] | None = None,
    prs_by_code: dict[tuple[str, str], list[dict[str, Any]]] | None = None,
    user: dict[str, Any] | None = None,
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
            p["id"], "Thầy Nguyễn Phước (GV Hướng dẫn)"
        )

    ev_dict = row_dict(eval_row) if eval_row else None
    u_role = str(user.get("role") or "").strip().lower() if user else ""
    advisor_flag = is_project_advisor(user, proj_row) if user else False
    reviewer_flag = is_project_reviewer(user, proj_row) if user else False
    can_grade_flag = can_grade_project_council(user, proj_row) if user else False
    can_manage_flag = (
        u_role in ("admin", "org_admin")
        or (u_role == "instructor" and advisor_flag)
        or (u_role == "student" and is_user_project_leader(user, proj_row))
    ) if user else False

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
        "isFrozen": bool(p.get("is_frozen")),
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
        "instructorId": str(p.get("instructor_id") or ""),
        "instructorName": str(p.get("instructor_name") or ""),
        "reviewerId": str(p.get("reviewer_id") or ""),
        "reviewerName": str(p.get("reviewer_name") or ""),
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
        "isMyProject": is_user_in_project(user, proj_row),
        "isLead": is_user_project_leader(user, proj_row) if user else False,
        "isAdvisor": advisor_flag,
        "isReviewer": reviewer_flag,
        "canManageProject": can_manage_flag,
        "canGradeProject": can_grade_flag,
        "leaderUserId": p.get("leader_user_id"),
    }


def _check_git_proof_for_done(conn: Any, user: dict[str, Any], task_row: Any, target_col: str,
                              candidate_submission_url: str | None = None) -> None:
    if str(user.get("role") or "").lower() != "student":
        return
    pid = task_row["project_id"]
    repo = conn.execute("SELECT * FROM git_repositories WHERE project_id=?", (pid,)).fetchone()
    if candidate_submission_url and not _url_matches_project_repo(candidate_submission_url, repo):
        raise HTTPException(status_code=422, detail="Evidence must be an exact HTTPS GitHub commit/PR URL in the configured repository.")
    if target_col != "done" or task_row["column_id"] in ("done", "verified"):
        return
    snapshot, _ = load_snapshot(conn, pid, repo["repo_slug"]) if repo else (None, None)
    code = str(task_row["code"] or "").strip().lstrip("#").upper()
    prs = snapshot.get("pullRequests", []) if snapshot and snapshot.get("branch") == repo["target_branch"] else []
    valid = [pr for pr in prs if pr.get("taskCode") == code and has_completed_task_proof(pr)]
    effective_url = candidate_submission_url if candidate_submission_url is not None else task_row["submission_url"]
    if effective_url:
        url = effective_url.strip().rstrip("/").lower()
        valid = [pr for pr in valid if url in (pr["url"].lower(), f"https://github.com/{repo['repo_slug']}/commit/{pr['headSha']}".lower())]
    if not valid:
        raise HTTPException(status_code=422, detail=(
            f"Task #{code} needs a synced, explicitly linked merged GitHub PR, a passing test check and an independent approval for that PR head SHA. "
            "A repository URL, local demo row, or unverified commit/PR cannot complete the task. Sync GitHub after tests and review finish."))


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


def _check_reverse_h2_constraint(conn: Any, task_row: Any, target_col: str) -> None:
    row_map = dict(task_row)
    cur_col = str(row_map.get("column_id") or "")
    if cur_col not in ("done", "verified") or target_col in ("done", "verified"):
        return
    child = conn.execute(
        """SELECT code, title FROM engineering_tasks
           WHERE project_id=? AND depends_on=? AND column_id IN ('done', 'verified')
           LIMIT 1""",
        (row_map.get("project_id"), row_map.get("id")),
    ).fetchone()
    if child:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Vi phạm Ràng buộc H2 ngược: Không thể kéo lùi Task #{row_map.get('code')} khi Task phụ thuộc "
                f"#{child['code']} ({child['title']}) đang ở trạng thái Hoàn thành / Đã nghiệm thu."
            ),
        )


def _validate_h2_dependency(
    conn: Any,
    project_id: str,
    task_id: str | None,
    raw_depends_on: str | None,
) -> str | None:
    """Chuẩn hóa và kiểm tra hợp lệ Task tiền đề H2 (chặn tự trỏ, sai dự án, hoặc vòng lặp A -> B -> A)."""
    cleaned = (raw_depends_on or "").strip()
    if not cleaned:
        return None
    if task_id and cleaned == task_id:
        raise HTTPException(
            status_code=422,
            detail="Không thể đặt Task tự phụ thuộc chính nó (vòng lặp H2).",
        )
    parent = conn.execute(
        "SELECT id, code, title, depends_on FROM engineering_tasks WHERE id=? AND project_id=?",
        (cleaned, project_id),
    ).fetchone()
    if not parent:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy Task tiền đề (H2) trong dự án hiện tại.",
        )
    if task_id:
        visited: set[str] = {task_id}
        cursor_id: str | None = cleaned
        hops = 0
        while cursor_id and hops < 100:
            if cursor_id in visited:
                raise HTTPException(
                    status_code=422,
                    detail="Phát hiện vòng lặp phụ thuộc H2 (A → B → A). Vui lòng chọn Task tiền đề khác.",
                )
            visited.add(cursor_id)
            row = conn.execute(
                "SELECT depends_on FROM engineering_tasks WHERE id=? AND project_id=?",
                (cursor_id, project_id),
            ).fetchone()
            cursor_id = ((row["depends_on"] or "").strip() or None) if row else None
            hops += 1
    return cleaned


def _resolve_student_uid_from_assignee(
    conn: Any, assignee: dict[str, Any] | None, fallback_uid: str = ""
) -> str:
    if isinstance(assignee, dict):
        aid = str(assignee.get("id") or "").strip()
        aemail = str(assignee.get("email") or "").strip().lower()
        aname = str(assignee.get("name") or "").strip().lower()
        legacy_map = {
            "m1": "usr-sv-01",
            "m2": "usr-sv-03",
            "m3": "usr-sv-04",
            "e1": "usr-sv-08",
            "e2": "usr-sv-07",
            "a1": "usr-sv-07",
            "a2": "usr-sv-08",
        }
        if aid in legacy_map:
            return legacy_map[aid]
        if aid:
            r = conn.execute(
                "SELECT id FROM users WHERE id = ? AND role = 'student' LIMIT 1",
                (aid,),
            ).fetchone()
            if r:
                return str(r["id"])
        if aemail:
            r = conn.execute(
                "SELECT id FROM users WHERE LOWER(email) = ? AND role = 'student' LIMIT 1",
                (aemail,),
            ).fetchone()
            if r:
                return str(r["id"])
        if aname:
            r = conn.execute(
                "SELECT id FROM users WHERE (LOWER(full_name) = ? OR LOWER(display_name) = ?) AND role = 'student' LIMIT 1",
                (aname, aname),
            ).fetchone()
            if r:
                return str(r["id"])
    return fallback_uid


def resolve_project_student_ids(conn: Any, proj_row: Any) -> list[str]:
    p_dict = dict(proj_row)
    found: list[str] = []
    seen: set[str] = set()
    try:
        raw_team = p_dict.get("team_json") or "[]"
        team_list = json.loads(raw_team) if isinstance(raw_team, str) else (raw_team or [])
    except Exception:
        team_list = []

    for tm in team_list:
        if not isinstance(tm, dict):
            continue
        uid_resolved = _resolve_student_uid_from_assignee(conn, tm)
        if uid_resolved and uid_resolved not in seen:
            seen.add(uid_resolved)
            found.append(uid_resolved)

    leader_id = str(p_dict.get("leader_user_id") or "").strip()
    if leader_id:
        uid_leader = _resolve_student_uid_from_assignee(conn, {"id": leader_id})
        if uid_leader and uid_leader not in seen:
            seen.add(uid_leader)
            found.append(uid_leader)
    return found


def _credit_student_xp(
    conn: Any, xp_amount: int, target_user_id: str | None = None
) -> bool:
    if xp_amount <= 0 or not target_user_id:
        return False
    prof = conn.execute(
        "SELECT user_id, radar_teamwork FROM student_profiles WHERE user_id = ? LIMIT 1",
        (target_user_id,),
    ).fetchone()
    if not prof:
        return False
    next_radar = min(100.0, float(prof["radar_teamwork"] or 80.0) + 0.5)
    conn.execute(
        """UPDATE student_profiles
           SET exp_points = exp_points + ?,
               radar_teamwork = ?
           WHERE user_id = ?""",
        (xp_amount, next_radar, prof["user_id"]),
    )
    return True


def credit_project_team_xp(conn: Any, proj_row: Any, xp_amount: int) -> list[str]:
    student_ids = resolve_project_student_ids(conn, proj_row)
    credited: list[str] = []
    for suid in student_ids:
        if _credit_student_xp(conn, xp_amount, target_user_id=suid):
            credited.append(suid)
    return credited


def _award_task_done_xp(conn: Any, user: dict[str, Any], task_row: Any, target_col: str) -> int:
    td = dict(task_row)
    current_awarded = int(td.get("xp_awarded") or 0)
    try:
        ass_obj = json.loads(td.get("assignee_json") or "{}")
    except Exception:
        ass_obj = {}
    fallback_student = str(user.get("id") or "") if str(user.get("role") or "").lower() == "student" else ""
    target_uid = (
        str(td.get("assignee_user_id") or "").strip()
        or _resolve_student_uid_from_assignee(conn, ass_obj, fallback_uid=fallback_student)
    )
    if target_col == "verified" and current_awarded < 50:
        xp_reward = max(50, int(td.get("points") or 3) * 10)
        delta = xp_reward - current_awarded
        if _credit_student_xp(conn, delta, target_user_id=target_uid):
            conn.execute("UPDATE engineering_tasks SET xp_awarded = ? WHERE id=?", (xp_reward, task_row["id"]))
            return delta
    if target_col == "done" and current_awarded == 0:
        if _credit_student_xp(conn, 15, target_user_id=target_uid):
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
    ts = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
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
        assignee = {"id": "usr-sv-01", "name": "Nguyễn Bá Hòa", "avatar": "H", "role": "Leader & Architect"}
    assignee_uid = _resolve_student_uid_from_assignee(conn, assignee)
    if assignee_uid and not assignee.get("id"):
        assignee["id"] = assignee_uid
    dod = item.definitionOfDone if item.definitionOfDone else _default_dod(item.column == "done")

    conn.execute(
        """INSERT INTO engineering_tasks(
               id, project_id, code, title, description, column_id, priority, moscow,
               points, assignee_user_id, assignee_json, estimate_hours, due_date, epic, epic_color,
               depends_on, checklist_json, dod_json, user_story_json, acceptance_criteria,
               deliverable_json, submission_requirement, submission_url, is_bonus,
               comments_count, attachments_count, audit_logs_json, position_order,
               xp_awarded, created_at, updated_at
           ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
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
            assignee_uid or None,
            json.dumps(assignee, ensure_ascii=False),
            item.estimateHours,
            item.dueDate,
            item.epic,
            item.epicColor,
            (item.dependsOn or "").strip() or None,
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
def get_kanban_workspace(
    scope: str = Query(default="auto", description="'auto', 'my', or 'all'"),
    user: dict[str, Any] = Depends(current_user)
) -> dict[str, Any]:
    """Lấy danh sách dự án kỹ thuật theo phân quyền người dùng (Học viên chỉ thấy dự án mình tham gia; GV/Admin thấy toàn bộ)."""
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

    all_projects = [
        _serialize_project(
            p,
            tasks_by_proj.get(p["id"], []),
            eval_by_proj.get(p["id"]),
            git_repo=repo_by_proj.get(p["id"]),
            commits_by_code=commits_by_proj_code,
            prs_by_code=prs_by_proj_code,
            user=user,
        )
        for p in proj_rows
    ]

    u_role = str(user.get("role") or "").lower()
    my_projects = [p for p in all_projects if p.get("isMyProject")]

    # Phân quyền chặt chẽ: Học viên CHỈ thấy và thao tác trên dự án mình tham gia
    if u_role == "student":
        projects = my_projects
    elif scope == "my":
        projects = my_projects
    else:
        projects = all_projects

    total_tasks = sum(p["tasksTotal"] for p in projects)
    total_done = sum(p["tasksDone"] for p in projects)
    return {
        "projects": projects,
        "all_projects_count": len(all_projects),
        "my_projects_count": len(my_projects),
        "current_user": {
            "id": user.get("id"),
            "name": user.get("full_name") or user.get("display_name"),
            "email": user.get("email"),
            "role": u_role,
        },
        "summary": {
            "total_projects": len(projects),
            "active_projects": sum(1 for p in projects if p["status"] != "delivered"),
            "total_tasks": total_tasks,
            "done_tasks": total_done,
        },
    }


_MENTOR_TITLE_PREFIX_RE = re.compile(
    r"^(?:p?gs\.?\s*|ts\.?\s*|ths\.?\s*|ks\.?\s*|cô\s+|thầy\s+|giảng\s+viên\s+|gvhd\s*[:\-]?\s*)+",
    re.IGNORECASE,
)


def _strip_mentor_title(raw: str | None) -> str:
    cleaned = re.sub(r"\([^)]*\)", " ", raw or "")
    cleaned = " ".join(cleaned.split()).strip()
    stripped = _MENTOR_TITLE_PREFIX_RE.sub("", cleaned)
    return " ".join(stripped.split()).strip().lower()


def _resolve_instructor_for_label(conn: Any, label: str | None) -> tuple[str, str]:
    raw_label = (label or "").strip()
    if not raw_label:
        return ("", "")
    instructors = conn.execute(
        """SELECT id, full_name, display_name
           FROM users
           WHERE role = 'instructor'
             AND status NOT IN ('suspended', 'pending')
             AND id NOT IN ('student-demo', 'instructor-demo', 'admin-demo')"""
    ).fetchall()
    raw_low = raw_label.lower()
    target_stripped = _strip_mentor_title(raw_label)

    for inst in instructors:
        i_id = str(inst["id"] or "").strip()
        i_full = str(inst["full_name"] or inst["display_name"] or "").strip()
        i_disp = str(inst["display_name"] or "").strip()
        if i_id and raw_low == i_id.lower():
            return (i_id, i_full or i_disp)
        if i_full and raw_low == i_full.lower():
            return (i_id, i_full)
        if i_disp and raw_low == i_disp.lower():
            return (i_id, i_full or i_disp)

    if target_stripped:
        for inst in instructors:
            i_id = str(inst["id"] or "").strip()
            i_full = str(inst["full_name"] or inst["display_name"] or "").strip()
            i_stripped = _strip_mentor_title(i_full)
            if i_stripped and (i_stripped == target_stripped or i_stripped in target_stripped or target_stripped in i_stripped):
                return (i_id, i_full)
    return ("", "")


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
    if str(user.get("role") or "").strip().lower() == "student" and norm_status == "delivered":
        norm_status = "planning"

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

    creator_name = user.get("full_name") or user.get("display_name") or "Sinh viên"
    creator_initials = "".join(w[:1] for w in creator_name.split()[-2:]).upper() if len(creator_name.split()) >= 2 else creator_name[:2].upper()
    bg0, text_col0, tw_col0 = PALETTE_CYCLE[0]
    team_list: list[dict[str, Any]] = [
        {
            "id": user["id"],
            "name": creator_name,
            "email": user.get("email") or "",
            "avatar": creator_initials[:1],
            "initials": creator_initials,
            "role": "Leader & Architect",
            "color": tw_col0,
            "bg": bg0,
            "textColor": text_col0,
        }
    ]

    sp_budget = payload.story_points if payload.story_points is not None else 600
    due_text = payload.due_text or (f"Hạn {payload.due_date}" if payload.due_date else "Còn 30 ngày")
    default_mentor = "TS. Nguyễn Phước (GV Hướng dẫn)"

    with db() as conn:
        member_names = payload.team_members or []
        seen_names = {creator_name.lower()}
        for idx, m_name in enumerate(member_names, start=1):
            clean = m_name.strip()
            if not clean or clean.lower() in seen_names:
                continue
            seen_names.add(clean.lower())
            bg, text_col, tw_col = PALETTE_CYCLE[idx % len(PALETTE_CYCLE)]
            u_row = conn.execute(
                "SELECT id, full_name, display_name, email, role FROM users WHERE full_name=? OR display_name=? OR email=? OR id=? LIMIT 1",
                (clean, clean, clean, clean),
            ).fetchone()
            u_id = u_row["id"] if u_row else f"tm-{idx}-{uid()[:4]}"
            u_email = (u_row["email"] if u_row else "") or ""
            actual_name = (u_row["full_name"] if u_row else clean) or clean
            initials = "".join(w[:1] for w in actual_name.split()[-2:]).upper() if len(actual_name.split()) >= 2 else actual_name[:2].upper()
            role_title = payload.member_roles.get(clean) or payload.member_roles.get(u_id) or "Developer"

            # Tạo lời mời cộng tác (pending) theo chuẩn GitHub, chờ người được mời xác nhận
            if u_row and u_row["id"] != user["id"]:
                try:
                    inv_id = f"inv-{uid()[:8]}"
                    conn.execute(
                        """INSERT INTO project_invitations(
                               id, project_id, project_name, inviter_user_id, inviter_name,
                               invitee_user_id, invitee_name, invitee_email, role_title,
                               status, created_at, updated_at
                           ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)""",
                        (
                            inv_id,
                            proj_id,
                            payload.name.strip(),
                            user["id"],
                            creator_name,
                            u_row["id"],
                            actual_name,
                            u_email,
                            role_title,
                            now,
                            now,
                        ),
                    )
                    notif_id = f"notif-{uid()[:8]}"
                    conn.execute(
                        """INSERT INTO notifications(
                               id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
                           ) VALUES(?, ?, 'student', ?, ?, 'project', 0, '/projects', ?)""",
                        (
                            notif_id,
                            u_row["id"],
                            f"Lời mời tham gia đồ án: {payload.name.strip()}",
                            f"{creator_name} đã mời bạn tham gia đồ án '{payload.name.strip()}' với vai trò {role_title}.",
                            now,
                        ),
                    )
                except Exception:
                    pass
            elif not u_row:
                # Nếu là thành viên nhập tự do không có tài khoản hệ thống thì thêm luôn vào danh sách hiển thị
                team_list.append(
                    {
                        "id": u_id,
                        "name": actual_name,
                        "email": u_email,
                        "avatar": initials[:1],
                        "initials": initials,
                        "role": role_title,
                        "color": tw_col,
                        "bg": bg,
                        "textColor": text_col,
                    }
                )

        creator_role = str(user.get("role") or "").strip().lower()
        if creator_role == "instructor":
            inst_id = user["id"]
            inst_name = creator_name
            default_mentor = f"{creator_name} (GV Hướng dẫn)"
        else:
            resolved_id, resolved_name = _resolve_instructor_for_label(conn, default_mentor)
            inst_id = resolved_id or "usr-gv-02"
            inst_name = resolved_name or "Thầy Nguyễn Phước"
        rev_id, rev_name = (
            ("usr-gv-02", "Thầy Nguyễn Phước")
            if inst_id != "usr-gv-02"
            else ("usr-gv-03", "Thầy Trần Minh Quân")
        )

        conn.execute(
            """INSERT INTO engineering_projects(
                   id, code, name, client, course, sprint, kind, status, fav,
                   due_date, due_text, story_points_budget, color_hex,
                   tl_start, tl_width, tl_color, instructor_id, instructor_name,
                   reviewer_id, reviewer_name, instructor_label, team_json,
                   leader_user_id, created_by, created_at, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
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
                inst_id,
                inst_name,
                rev_id,
                rev_name,
                default_mentor,
                json.dumps(team_list, ensure_ascii=False),
                user["id"],
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
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Cập nhật trạng thái ghim (fav), đóng băng (is_frozen), tên/sprint hoặc thành viên (Leader/GV/Admin)."""
    now = now_utc()
    u_role = str(user.get("role") or "").strip().lower()
    with db() as conn:
        existing = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

        if u_role == "instructor":
            modifies_restricted = any(
                val is not None
                for val in (
                    payload.is_frozen,
                    payload.status,
                    payload.name,
                    payload.sprint,
                    payload.due_date,
                    payload.instructor,
                    payload.instructor_id,
                    payload.reviewer,
                    payload.reviewer_id,
                    payload.team,
                )
            )
            if modifies_restricted and not is_project_advisor(user, existing):
                raise HTTPException(
                    status_code=403,
                    detail="Chỉ Giảng viên hướng dẫn được phân công cho đồ án này hoặc Quản trị viên mới có quyền quản trị cấu hình/đóng băng đồ án.",
                )
            if payload.instructor_id is not None or payload.instructor is not None:
                req_inst = (payload.instructor_id or payload.instructor or "").strip()
                resolved_req_id, _ = _resolve_instructor_for_label(conn, req_inst)
                if resolved_req_id and resolved_req_id != str(dict(existing).get("instructor_id") or ""):
                    raise HTTPException(
                        status_code=403,
                        detail="Chỉ Quản trị viên mới có quyền điều chuyển Giảng viên Hướng dẫn chính của đồ án.",
                    )

        if u_role == "student":
            if payload.is_frozen is not None:
                raise HTTPException(
                    status_code=403,
                    detail="Chỉ Giảng viên hướng dẫn hoặc Admin mới có quyền Đóng băng / Mở khóa nộp bài đồ án.",
                )
            if any(v is not None for v in (payload.instructor_id, payload.instructor, payload.reviewer_id, payload.reviewer)):
                raise HTTPException(
                    status_code=403,
                    detail="Sinh viên không có quyền tự thay đổi Giảng viên Hướng dẫn hoặc Giảng viên Phản biện.",
                )
            modifies_config = any(
                val is not None
                for val in (
                    payload.status,
                    payload.name,
                    payload.sprint,
                    payload.due_date,
                    payload.instructor,
                    payload.team,
                )
            )
            if modifies_config:
                if not is_user_project_leader(user, existing):
                    raise HTTPException(
                        status_code=403,
                        detail="Chỉ Nhóm trưởng thực tế của đồ án hoặc Giảng viên/Admin mới có quyền chỉnh sửa cấu hình đồ án",
                    )
                if bool(dict(existing).get("is_frozen")):
                    raise HTTPException(
                        status_code=403,
                        detail="Đồ án đã bị đóng băng nộp bài, không thể chỉnh sửa trạng thái hoặc cấu hình.",
                    )
                if _normalize_project_status(existing["status"]) == "delivered":
                    raise HTTPException(
                        status_code=403,
                        detail="Đồ án đã bảo vệ xong (Do GVHD chốt), Nhóm trưởng không thể chỉnh sửa trạng thái hoặc cấu hình.",
                    )
                if payload.status is not None and _normalize_project_status(payload.status) == "delivered":
                    raise HTTPException(
                        status_code=403,
                        detail="Trạng thái 'Đã bảo vệ xong' chỉ do Giảng viên hướng dẫn hoặc Admin chốt.",
                    )
            elif payload.fav is not None and not is_user_in_project(user, existing):
                raise HTTPException(status_code=403, detail="Chỉ thành viên đồ án mới có quyền ghim dự án này")

        fav = (1 if payload.fav else 0) if payload.fav is not None else existing["fav"]
        is_frozen = (1 if payload.is_frozen else 0) if payload.is_frozen is not None else int(dict(existing).get("is_frozen") or 0)
        norm_status = _normalize_project_status(payload.status) if payload.status is not None else existing["status"]
        name = payload.name.strip() if payload.name is not None else existing["name"]
        sprint = payload.sprint if payload.sprint is not None else existing["sprint"]
        due_date = payload.due_date if payload.due_date is not None else existing["due_date"]
        existing_dict = dict(existing)
        instructor_id = str(existing_dict.get("instructor_id") or "")
        instructor_name = str(existing_dict.get("instructor_name") or "")
        reviewer_id = str(existing_dict.get("reviewer_id") or "")
        reviewer_name = str(existing_dict.get("reviewer_name") or "")
        instructor_label = (
            payload.instructor.strip()
            if payload.instructor is not None and payload.instructor.strip()
            else existing["instructor_label"]
        )
        if payload.instructor_id is not None and payload.instructor_id.strip():
            resolved_id, resolved_name = _resolve_instructor_for_label(conn, payload.instructor_id.strip())
            if not resolved_id:
                raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Giảng viên Hướng dẫn được chọn.")
            instructor_id = resolved_id
            instructor_name = resolved_name
            instructor_label = f"{resolved_name} (GV Hướng dẫn)"
        elif payload.instructor is not None and payload.instructor.strip():
            resolved_id, resolved_name = _resolve_instructor_for_label(conn, instructor_label)
            if resolved_id:
                instructor_id = resolved_id
                instructor_name = resolved_name

        raw_rev = (payload.reviewer_id if payload.reviewer_id is not None else payload.reviewer)
        if raw_rev is not None:
            clean_rev = raw_rev.strip()
            if not clean_rev:
                reviewer_id = ""
                reviewer_name = ""
            else:
                res_rev_id, res_rev_name = _resolve_instructor_for_label(conn, clean_rev)
                if not res_rev_id:
                    raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Giảng viên Phản biện được chọn.")
                reviewer_id = res_rev_id
                reviewer_name = res_rev_name

        if instructor_id and reviewer_id and instructor_id == reviewer_id:
            raise HTTPException(
                status_code=422,
                detail="Giảng viên Phản biện không được trùng với Giảng viên Hướng dẫn trên cùng một đồ án.",
            )

        if payload.team is not None:
            if len(payload.team) == 0:
                raise HTTPException(status_code=400, detail="Đồ án phải có ít nhất 1 thành viên.")
            leader_uid = str(existing_dict.get("leader_user_id") or "").strip()
            old_team = json.loads(existing["team_json"] or "[]")
            if leader_uid and any(str(m.get("id") or "") == leader_uid for m in old_team):
                if not any(str(m.get("id") or "") == leader_uid for m in payload.team):
                    raise HTTPException(
                        status_code=400,
                        detail="Không thể gỡ Nhóm trưởng khỏi danh sách thành viên đồ án.",
                    )
            team_json = json.dumps(payload.team, ensure_ascii=False)
        else:
            team_json = existing["team_json"]

        conn.execute(
            """UPDATE engineering_projects
               SET fav=?, is_frozen=?, status=?, name=?, sprint=?, due_date=?,
                   instructor_id=?, instructor_name=?, reviewer_id=?, reviewer_name=?,
                   instructor_label=?, team_json=?, updated_at=?
               WHERE id=?""",
            (
                fav,
                is_frozen,
                norm_status,
                name,
                sprint,
                due_date,
                instructor_id,
                instructor_name,
                reviewer_id,
                reviewer_name,
                instructor_label,
                team_json,
                now,
                project_id,
            ),
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
            user=user,
        )
    }


@router.get("/kanban/users/search")
def search_users_for_team(
    q: str = Query(default="", description="Tìm kiếm theo tên hoặc email"),
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Tìm kiếm tài khoản sinh viên trong CSDL để thêm vào đồ án (như GitHub Collaborators)."""
    clean_q = q.strip().lower()
    with db() as conn:
        if clean_q:
            like_pat = f"%{clean_q}%"
            rows = conn.execute(
                """SELECT id, full_name, display_name, email, role
                   FROM users
                   WHERE (role='student' OR role='instructor') AND (
                       LOWER(full_name) LIKE ? OR
                       LOWER(display_name) LIKE ? OR
                       LOWER(email) LIKE ? OR
                       LOWER(id) LIKE ?
                   )
                   ORDER BY full_name ASC LIMIT 25""",
                (like_pat, like_pat, like_pat, like_pat),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT id, full_name, display_name, email, role
                   FROM users
                   WHERE role='student'
                   ORDER BY full_name ASC LIMIT 25"""
            ).fetchall()

    results = []
    for idx, r in enumerate(rows):
        name = r["full_name"] or r["display_name"] or "Thành viên"
        initials = "".join(w[:1] for w in name.split()[-2:]).upper() if len(name.split()) >= 2 else name[:2].upper()
        bg, text_col, tw_col = PALETTE_CYCLE[idx % len(PALETTE_CYCLE)]
        results.append({
            "id": r["id"],
            "name": name,
            "email": r["email"] or "",
            "role": r["role"],
            "initials": initials,
            "avatar": initials[:1],
            "color": tw_col,
            "bg": bg,
            "textColor": text_col,
        })
    return {"users": results, "total": len(results)}


@router.post("/kanban/projects/{project_id}/invitations")
def invite_user_to_project(
    project_id: str,
    payload: ProjectInviteIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Mời thành viên mới tham gia vào đồ án (GitHub-style Collaborator Invitation)."""
    now = now_utc()
    with db() as conn:
        proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy đồ án")

        u_role = str(user.get("role") or "").lower()
        if u_role == "instructor" and not is_project_advisor(user, proj):
            raise HTTPException(
                status_code=403,
                detail="Chỉ Giảng viên hướng dẫn của đồ án này hoặc Admin mới có quyền mời thành viên vào đồ án.",
            )
        if u_role == "student":
            if not is_user_project_leader(user, proj):
                raise HTTPException(status_code=403, detail="Chỉ Nhóm trưởng thực tế của đồ án mới có quyền mời thành viên vào đồ án")
            if bool(dict(proj).get("is_frozen")):
                raise HTTPException(status_code=403, detail="Đồ án đã bị đóng băng nộp bài, không thể mời thêm thành viên.")
            if _normalize_project_status(proj["status"]) == "delivered":
                raise HTTPException(status_code=403, detail="Đồ án đã bảo vệ xong, không thể mời thêm thành viên.")

        target_user = conn.execute(
            "SELECT id, full_name, display_name, email FROM users WHERE id=? OR email=? LIMIT 1",
            (payload.user_id, payload.user_id),
        ).fetchone()
        if not target_user:
            raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên được mời")

        team = json.loads(proj["team_json"] or "[]")
        for m in team:
            if m.get("id") == target_user["id"] or m.get("name") == target_user["full_name"]:
                raise HTTPException(status_code=400, detail=f"{target_user['full_name']} đã là thành viên của đồ án này")

        existing_inv = conn.execute(
            "SELECT id FROM project_invitations WHERE project_id=? AND invitee_user_id=? AND status='pending'",
            (project_id, target_user["id"]),
        ).fetchone()
        if existing_inv:
            raise HTTPException(status_code=400, detail=f"Đã gửi lời mời đến {target_user['full_name']} rồi, đang chờ bạn ấy phản hồi")

        inv_id = f"inv-{uid()[:8]}"
        inviter_name = user.get("full_name") or user.get("display_name") or "Trưởng nhóm"
        invitee_name = target_user.get("full_name") or target_user.get("display_name") or "Sinh viên"

        conn.execute(
            """INSERT INTO project_invitations(
                   id, project_id, project_name, inviter_user_id, inviter_name,
                   invitee_user_id, invitee_name, invitee_email, role_title,
                   status, created_at, updated_at
               ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)""",
            (
                inv_id,
                project_id,
                proj["name"],
                user["id"],
                inviter_name,
                target_user["id"],
                invitee_name,
                target_user["email"] or "",
                payload.role_title,
                now,
                now,
            ),
        )

        try:
            notif_id = f"notif-{uid()[:8]}"
            conn.execute(
                """INSERT INTO notifications(
                       id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
                   ) VALUES(?, ?, 'student', ?, ?, 'project', 0, '/projects', ?)""",
                (
                    notif_id,
                    target_user["id"],
                    f"Lời mời tham gia đồ án: {proj['name']}",
                    f"{inviter_name} đã gửi lời mời bạn tham gia đồ án '{proj['name']}' với vai trò {payload.role_title}.",
                    now,
                ),
            )
        except Exception:
            pass

        record_audit_log(
            inviter_name,
            user["id"],
            "INVITE_MEMBER",
            f"Mời {invitee_name} ({payload.role_title})",
            "project",
            "engineering_project",
            project_id,
        )

    return {
        "success": True,
        "invitation": {
            "id": inv_id,
            "project_id": project_id,
            "project_name": proj["name"],
            "invitee_name": invitee_name,
            "role_title": payload.role_title,
            "status": "pending",
        },
        "message": f"Đã gửi lời mời tham gia đồ án đến {invitee_name}!",
    }


@router.get("/kanban/projects/{project_id}/invitations")
def get_project_pending_invitations(
    project_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lấy danh sách lời mời của một đồ án (dành cho màn hình chi tiết đồ án)."""
    with db() as conn:
        rows = conn.execute(
            """SELECT * FROM project_invitations
               WHERE project_id=?
               ORDER BY created_at DESC""",
            (project_id,),
        ).fetchall()
    return {"invitations": [row_dict(r) for r in rows]}


@router.get("/kanban/invitations")
def get_user_project_invitations(
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lấy danh sách lời mời tham gia đồ án của người dùng hiện tại (bao gồm các lời mời đang chờ)."""
    uid_val = str(user.get("id") or "").strip()
    u_email = str(user.get("email") or "").strip().lower()
    with db() as conn:
        rows = conn.execute(
            """SELECT i.*, p.client, p.course, p.status as project_status, p.color_hex
               FROM project_invitations i
               LEFT JOIN engineering_projects p ON i.project_id = p.id
               WHERE (i.invitee_user_id = ? OR LOWER(i.invitee_email) = ?)
               ORDER BY i.created_at DESC""",
            (uid_val, u_email),
        ).fetchall()

    invitations = [row_dict(r) for r in rows]
    pending = [inv for inv in invitations if inv.get("status") == "pending"]
    return {
        "invitations": invitations,
        "pending": pending,
        "total_pending": len(pending),
    }


@router.post("/kanban/invitations/{invitation_id}/accept")
def accept_project_invitation(
    invitation_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Đồng ý tham gia đồ án: cập nhật trạng thái lời mời và thêm người dùng vào team_json để vào làm việc ngay."""
    now = now_utc()
    uid_val = str(user.get("id") or "").strip()
    u_email = str(user.get("email") or "").strip().lower()

    with db() as conn:
        inv = conn.execute("SELECT * FROM project_invitations WHERE id=?", (invitation_id,)).fetchone()
        if not inv:
            raise HTTPException(status_code=404, detail="Không tìm thấy lời mời")

        if inv["invitee_user_id"] != uid_val and (inv["invitee_email"] or "").lower() != u_email:
            raise HTTPException(status_code=403, detail="Lời mời này không dành cho bạn")

        proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (inv["project_id"],)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Đồ án không còn tồn tại")
        if bool(dict(proj).get("is_frozen")) or _normalize_project_status(proj["status"]) == "delivered":
            raise HTTPException(status_code=403, detail="Đồ án đã bị đóng băng hoặc đã bảo vệ xong, không thể tham gia thêm thành viên.")

        team = json.loads(proj["team_json"] or "[]")
        already_in = any(m.get("id") == uid_val or m.get("name") == user.get("full_name") for m in team)
        if not already_in:
            u_name = user.get("full_name") or user.get("display_name") or "Sinh viên"
            initials = "".join(w[:1] for w in u_name.split()[-2:]).upper() if len(u_name.split()) >= 2 else u_name[:2].upper()
            idx = len(team)
            bg, text_col, tw_col = PALETTE_CYCLE[idx % len(PALETTE_CYCLE)]
            team.append({
                "id": uid_val,
                "name": u_name,
                "email": user.get("email") or "",
                "avatar": initials[:1],
                "initials": initials,
                "role": inv["role_title"] or "Developer",
                "color": tw_col,
                "bg": bg,
                "textColor": text_col,
            })
            conn.execute(
                "UPDATE engineering_projects SET team_json=?, updated_at=? WHERE id=?",
                (json.dumps(team, ensure_ascii=False), now, proj["id"]),
            )

        conn.execute(
            "UPDATE project_invitations SET status='accepted', updated_at=? WHERE id=?",
            (now, invitation_id),
        )

        record_audit_log(
            user.get("full_name") or "Sinh viên",
            user["id"],
            "ACCEPT_INVITATION",
            f"Chấp nhận lời mời tham gia {proj['name']} ({inv['role_title']})",
            "project",
            "engineering_project",
            proj["id"],
        )

    return {
        "success": True,
        "message": f"Chúc mừng! Bạn đã chính thức gia nhập đồ án {proj['name']}.",
        "project_id": proj["id"],
        "project_name": proj["name"],
    }


@router.post("/kanban/invitations/{invitation_id}/decline")
def decline_project_invitation(
    invitation_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Từ chối lời mời tham gia đồ án."""
    now = now_utc()
    uid_val = str(user.get("id") or "").strip()
    u_email = str(user.get("email") or "").strip().lower()

    with db() as conn:
        inv = conn.execute("SELECT * FROM project_invitations WHERE id=?", (invitation_id,)).fetchone()
        if not inv:
            raise HTTPException(status_code=404, detail="Không tìm thấy lời mời")
        if inv["invitee_user_id"] != uid_val and (inv["invitee_email"] or "").lower() != u_email:
            raise HTTPException(status_code=403, detail="Lời mời này không dành cho bạn")

        conn.execute("UPDATE project_invitations SET status='declined', updated_at=? WHERE id=?", (now, invitation_id))

    return {"success": True, "message": "Đã từ chối lời mời tham gia đồ án."}


@router.delete("/kanban/projects/{project_id}/members/{member_id}")
def remove_member_from_project(
    project_id: str,
    member_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Gỡ thành viên khỏi đồ án (chỉ Trưởng nhóm đồ án hoặc Giảng viên/Admin)."""
    now = now_utc()
    with db() as conn:
        proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy đồ án")

        u_role = str(user.get("role") or "").lower()
        team = json.loads(proj["team_json"] or "[]")
        if u_role == "instructor" and not is_project_advisor(user, proj):
            raise HTTPException(
                status_code=403,
                detail="Chỉ Giảng viên hướng dẫn của đồ án này hoặc Admin mới có quyền gỡ thành viên.",
            )
        if u_role == "student":
            if bool(dict(proj).get("is_frozen")):
                raise HTTPException(status_code=403, detail="Đồ án đã bị đóng băng nộp bài, không thể gỡ thành viên.")
            if _normalize_project_status(proj["status"]) == "delivered":
                raise HTTPException(status_code=403, detail="Đồ án đã bảo vệ xong, không thể gỡ thành viên.")
            if not is_user_project_leader(user, proj):
                raise HTTPException(status_code=403, detail="Chỉ Nhóm trưởng thực tế của đồ án hoặc Giảng viên/Admin mới có quyền gỡ thành viên.")

        leader_uid = str(dict(proj).get("leader_user_id") or "").strip()
        for idx, m in enumerate(team):
            if m.get("id") == member_id or m.get("name") == member_id:
                is_lead_member = (leader_uid and str(m.get("id") or "") == leader_uid) or (not leader_uid and idx == 0)
                if is_lead_member:
                    raise HTTPException(
                        status_code=400,
                        detail="Không thể gỡ Nhóm trưởng khỏi đồ án. Vui lòng chuyển quyền Nhóm trưởng trước.",
                    )

        new_team = [m for m in team if m.get("id") != member_id and m.get("name") != member_id]
        if len(new_team) == len(team):
            raise HTTPException(status_code=404, detail="Không tìm thấy thành viên trong đồ án")
        if len(new_team) == 0:
            raise HTTPException(status_code=400, detail="Đồ án phải có ít nhất 1 thành viên.")

        conn.execute(
            "UPDATE engineering_projects SET team_json=?, updated_at=? WHERE id=?",
            (json.dumps(new_team, ensure_ascii=False), now, project_id),
        )
        conn.execute(
            "DELETE FROM project_members WHERE project_id=? AND user_id=?",
            (project_id, member_id),
        )

    return {"success": True, "message": "Đã gỡ thành viên khỏi đồ án thành công."}


@router.post("/kanban/workspace/projects/{project_id}/tasks", status_code=status.HTTP_201_CREATED)
def create_workspace_task(
    project_id: str,
    payload: WorkspaceTaskCreateIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Tạo mới 1 Task Kanban trong dự án và lưu vào SQLite."""
    now = now_utc()
    u_role = str(user.get("role") or "").lower()
    with db() as conn:
        proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")
        _ensure_project_writable_for_user(user, proj, "tạo công việc")
        if u_role == "student" and payload.column.strip() == "verified":
            raise HTTPException(
                status_code=403,
                detail="Cột 'Đã nghiệm thu' chỉ dành riêng cho Giảng viên hướng dẫn thẩm định.",
            )

        payload.dependsOn = _validate_h2_dependency(conn, project_id, payload.id, payload.dependsOn)
        if payload.dependsOn and payload.column in ("done", "verified"):
            _check_h2_constraint(
                conn,
                {"project_id": project_id, "depends_on": payload.dependsOn},
                payload.column,
            )
        if u_role == "student" and payload.column.strip() == "done":
            _check_git_proof_for_done(
                conn,
                user,
                {
                    "project_id": project_id,
                    "column_id": "ready",
                    "code": payload.code or "NEW",
                    "submission_url": payload.submissionUrl,
                },
                "done",
                payload.submissionUrl,
            )

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
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lưu hàng loạt Task (dùng cho AI Chia Việc WBS & Nhập CSV)."""
    now = now_utc()
    u_role = str(user.get("role") or "").lower()
    created_list: list[dict[str, Any]] = []
    with db() as conn:
        proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")
        _ensure_project_writable_for_user(user, proj, "nhập danh sách công việc")

        if payload.replace:
            if u_role == "student":
                ver_cnt = conn.execute(
                    "SELECT COUNT(*) AS c FROM engineering_tasks WHERE project_id=? AND column_id='verified'",
                    (project_id,),
                ).fetchone()["c"]
                if int(ver_cnt or 0) > 0:
                    raise HTTPException(
                        status_code=403,
                        detail="Không thể ghi đè danh sách khi dự án đã có công việc được Giảng viên nghiệm thu.",
                    )
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
            if u_role == "student" and item.column.strip() == "verified":
                raise HTTPException(
                    status_code=403,
                    detail="Sinh viên không thể nhập trực tiếp công việc vào cột 'Đã nghiệm thu'.",
                )
            orig_id = item.id
            if item.dependsOn and item.dependsOn in id_remap:
                item = item.model_copy(update={"dependsOn": id_remap[item.dependsOn]})
            if item.dependsOn and item.column in ("done", "verified"):
                _check_h2_constraint(
                    conn,
                    {"project_id": project_id, "depends_on": item.dependsOn},
                    item.column,
                )
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
    from app.api.deps import assert_ai_service_active
    with db() as conn:
        assert_ai_service_active(conn, "svc-aigc", "AI Chia Việc WBS (AIGC)")
        conn.execute("UPDATE ai_service_units SET requests = requests + 1 WHERE id = 'svc-aigc'")
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
    ai_in_tok = 0
    ai_out_tok = 0

    # Thử sinh danh sách công việc WBS sát đặc tả bằng Google Gemini LLM trước
    members_desc = ", ".join(f"{m.get('name', 'Thành viên')} ({m.get('role', 'Dev')})" for m in pool)
    llm_res = generate_json(
        prompt=(
            f"Tính năng cần chia việc: {feature}\n"
            f"Công nghệ sử dụng: {tech_label}\n"
            f"Mô tả chi tiết: {(payload.description or '').strip() or 'Xây dựng hoàn chỉnh từ kiến trúc tới kiểm thử.'}\n"
            f"Số lượng task cần sinh: {count}\n"
            f"Thành viên tham gia: {members_desc}\n\n"
            f"Hãy trả về đúng JSON array gồm {count} phần tử có cấu trúc:\n"
            '[{"code": "ARC-01", "title": "...", "description": "...", "priority": "high"|"medium"|"low", "moscow": "must"|"should"|"could", "points": 5, "estimateHours": 4, "checklist": ["Bước 1...", "Bước 2..."]}]'
        ),
        system_instruction="Bạn là AI Scrum Master trên CodeMind. Chia tính năng thành các task thực tế theo thứ tự kiến trúc -> backend -> frontend/integration -> kiểm thử bằng tiếng Việt chuẩn Kỹ nghệ Phần mềm.",
        temperature=0.35,
        max_output_tokens=900,
    )
    epic_colors = [
        "bg-blue-50 text-blue-700 border-blue-200",
        "bg-amber-50 text-amber-700 border-amber-200",
        "bg-teal-50 text-teal-700 border-teal-200",
        "bg-indigo-50 text-indigo-700 border-indigo-200",
        "bg-purple-50 text-purple-700 border-purple-200",
        "bg-emerald-50 text-emerald-700 border-emerald-200",
    ]
    if llm_res:
        parsed_wbs, meta = llm_res
        ai_in_tok = int(meta.get("input_tokens") or 0)
        ai_out_tok = int(meta.get("output_tokens") or 0)
        if isinstance(parsed_wbs, list):
            valid_items = [x for x in parsed_wbs if isinstance(x, dict) and str(x.get("title") or "").strip()]
            if len(valid_items) >= 2:
                for idx, w in enumerate(valid_items[:count]):
                    tid = f"task-ai-{stamp}-{idx + 1}"
                    raw_prio = str(w.get("priority") or "medium").lower()
                    prio = raw_prio if raw_prio in ("high", "medium", "low") else "medium"
                    raw_moscow = str(w.get("moscow") or "should").lower()
                    moscow = raw_moscow if raw_moscow in ("must", "should", "could") else "should"
                    pts = max(1, min(13, int(w.get("points") or 3)))
                    est = max(1.0, min(24.0, float(w.get("estimateHours") or pts)))
                    raw_chk = w.get("checklist")
                    chk_list = (
                        [
                            {"id": f"ai-c-{stamp}-{idx}-{c_idx}", "text": str(txt).strip(), "done": False}
                            for c_idx, txt in enumerate(raw_chk[:4])
                            if str(txt).strip()
                        ]
                        if isinstance(raw_chk, list)
                        else []
                    )
                    if not chk_list:
                        chk_list = [{"id": f"ai-c-{stamp}-{idx}-0", "text": "Hoàn thành implementation & unit test", "done": False}]
                    due_val = specs[min(idx, len(specs) - 1)][9]
                    prev_id = f"task-ai-{stamp}-{idx}" if (payload.include_h2 and idx > 0) else None
                    generated.append(
                        {
                            "id": tid,
                            "code": str(w.get("code") or f"AI-{random.randint(10, 99)}")[:12],
                            "title": str(w["title"]).strip()[:140],
                            "description": str(w.get("description") or feature).strip(),
                            "column": "backlog",
                            "priority": prio,
                            "moscow": moscow,
                            "points": pts,
                            "assignee": _assignee(idx),
                            "estimateHours": est,
                            "dueDate": due_val,
                            "epic": feature,
                            "epicColor": epic_colors[idx % len(epic_colors)],
                            **({"dependsOn": prev_id} if prev_id else {}),
                            "checklist": chk_list,
                            "definitionOfDone": _default_dod(False),
                            "commentsCount": 0,
                            "attachmentsCount": 0,
                        }
                    )

    if not generated:
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
        record_ai_usage(conn, "svc-aigc", ai_in_tok or 450, ai_out_tok or 320)
        conn.commit()

    return {"tasks": generated, "aiModel": "google-gemini" if ai_in_tok > 0 else "local-wbs-fallback"}


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

        u_role = str(user.get("role") or "").lower()
        if u_role in ("student", "instructor"):
            proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (existing["project_id"],)).fetchone()
            if not proj:
                raise HTTPException(status_code=404, detail="Không tìm thấy dự án")
            _ensure_project_writable_for_user(user, proj, "chỉnh sửa công việc")

        if payload.dependsOn is not None:
            next_depends_on = _validate_h2_dependency(conn, existing["project_id"], task_id, payload.dependsOn)
        else:
            next_depends_on = existing["depends_on"]

        target_col = payload.column if payload.column is not None else existing["column_id"]
        if u_role == "student" and target_col == "verified":
            raise HTTPException(
                status_code=403,
                detail="Cột 'Đã nghiệm thu' chỉ dành riêng cho Giảng viên hướng dẫn thẩm định.",
            )
        if user.get("role") == "student" and existing["column_id"] == "verified" and target_col != "verified":
            raise HTTPException(
                status_code=403,
                detail="Công việc đã được Giảng viên nghiệm thu, sinh viên không thể tự ý chuyển cột.",
            )
        if target_col in ("done", "verified") and (
            target_col != existing["column_id"] or next_depends_on != existing["depends_on"]
        ):
            _check_h2_constraint(
                conn,
                {**dict(existing), "depends_on": next_depends_on},
                target_col,
            )
        _check_reverse_h2_constraint(conn, existing, target_col)
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

        next_assignee_uid = existing["assignee_user_id"]
        next_assignee_json = existing["assignee_json"]
        if payload.assignee is not None:
            ass_copy = dict(payload.assignee)
            resolved_auid = _resolve_student_uid_from_assignee(conn, ass_copy)
            if resolved_auid and not ass_copy.get("id"):
                ass_copy["id"] = resolved_auid
            next_assignee_uid = resolved_auid or None
            next_assignee_json = json.dumps(ass_copy, ensure_ascii=False)

        conn.execute(
            """UPDATE engineering_tasks
               SET title=?, description=?, column_id=?, priority=?, moscow=?, points=?,
                   assignee_user_id=?, assignee_json=?, estimate_hours=?, due_date=?, epic=?, epic_color=?,
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
                next_assignee_uid,
                next_assignee_json,
                payload.estimateHours if payload.estimateHours is not None else existing["estimate_hours"],
                payload.dueDate if payload.dueDate is not None else existing["due_date"],
                payload.epic if payload.epic is not None else existing["epic"],
                payload.epicColor if payload.epicColor is not None else existing["epic_color"],
                next_depends_on,
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

        if str(user.get("role") or "").lower() in ("student", "instructor"):
            proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (existing["project_id"],)).fetchone()
            if not proj:
                raise HTTPException(status_code=404, detail="Không tìm thấy dự án")
            _ensure_project_writable_for_user(user, proj, "di chuyển công việc")

        target_col = payload.target_column.strip()
        if user.get("role") == "student" and target_col == "verified":
            raise HTTPException(
                status_code=403,
                detail="Cột 'Đã nghiệm thu' chỉ dành riêng cho Giảng viên hướng dẫn thẩm định. Sinh viên chỉ có thể chuyển sang 'Hoàn thành' để chờ nghiệm thu."
            )
        if user.get("role") == "student" and existing["column_id"] == "verified" and target_col != "verified":
            raise HTTPException(
                status_code=403,
                detail="Công việc đã được Giảng viên nghiệm thu, sinh viên không thể tự ý kéo lùi.",
            )
        _check_h2_constraint(conn, existing, target_col)
        _check_reverse_h2_constraint(conn, existing, target_col)
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
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, str]:
    """Xóa Task khỏi bảng Kanban & giải phóng các khóa phụ thuộc H2 trỏ tới Task này."""
    with db() as conn:
        existing = conn.execute("SELECT * FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy task")
        u_role = str(user.get("role") or "").lower()
        if u_role in ("student", "instructor"):
            proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (existing["project_id"],)).fetchone()
            if not proj:
                raise HTTPException(status_code=404, detail="Không tìm thấy dự án")
            _ensure_project_writable_for_user(user, proj, "xóa công việc")
            if u_role == "student":
                if existing["column_id"] == "verified":
                    raise HTTPException(
                        status_code=403,
                        detail="Không thể xóa công việc đã được Giảng viên nghiệm thu.",
                    )
                if not is_user_project_leader(user, proj) and not _is_task_assignee(user, existing):
                    raise HTTPException(status_code=403, detail="Chỉ Nhóm trưởng hoặc người phụ trách mới có quyền xóa công việc")
        _check_reverse_h2_constraint(conn, existing, "backlog")
        conn.execute("UPDATE engineering_tasks SET depends_on=NULL WHERE depends_on=?", (task_id,))
        conn.execute("DELETE FROM engineering_tasks WHERE id=?", (task_id,))
    return {"status": "deleted", "id": task_id}


# ============================================================================
# NHÁNH 3: THẨM ĐỊNH TASK & CHẤM ĐIỂM ĐỒ ÁN (ANTI-FREERIDER GRADING)
# ============================================================================

class TaskReviewIn(BaseModel):
    decision: str  # "approve" | "request_revision"
    feedback: str = ""
    rating: int | None = Field(default=None, ge=1, le=5)


class ProjectEvaluationIn(BaseModel):
    group_score: float = Field(ge=0.0, le=10.0)
    demo_score: float | None = Field(default=None, ge=0.0, le=10.0)
    architecture_score: float = Field(ge=0.0, le=10.0)
    process_score: float = Field(ge=0.0, le=10.0)
    defense_score: float = Field(ge=0.0, le=10.0)
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
    if payload.decision not in ("approve", "request_revision"):
        raise HTTPException(status_code=422, detail="decision phải là 'approve' hoặc 'request_revision'.")

    now = now_utc()
    ts_display = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    actor_name = user.get("full_name") or user.get("display_name") or "Giảng viên"
    with db() as conn:
        task = conn.execute("SELECT * FROM engineering_tasks WHERE id=?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Không tìm thấy task")
        proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (task["project_id"],)).fetchone()
        if proj and str(user.get("role") or "").lower() == "instructor" and not is_project_advisor(user, proj):
            raise HTTPException(
                status_code=403,
                detail="Chỉ Giảng viên hướng dẫn được phân công cho đồ án này hoặc Admin mới có quyền nghiệm thu công việc.",
            )

        target_col = "verified" if payload.decision == "approve" else "fail"
        if target_col == "verified":
            _check_h2_constraint(conn, task, "verified")
        else:
            _check_reverse_h2_constraint(conn, task, "fail")
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
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lấy kết quả đánh giá đồ án hoặc tính toán đề xuất điểm số Anti-Freerider trực tiếp từ tiến độ thực tế."""
    with db() as conn:
        proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")
        if str(user.get("role") or "").lower() == "student" and not is_user_in_project(user, proj):
            raise HTTPException(status_code=403, detail="Chỉ thành viên thuộc đồ án này mới có quyền xem bảng đánh giá chi tiết.")

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
    for ms in payload.member_scores:
        raw_ind = ms.get("individual_score")
        if raw_ind is not None:
            ind_val = float(raw_ind)
            if ind_val < 0.0 or ind_val > 10.0:
                raise HTTPException(
                    status_code=422,
                    detail="Điểm cá nhân của từng thành viên phải nằm trong thang [0.0, 10.0].",
                )

    eval_id = f"eval-{uid()[:8]}"
    now = now_utc()
    instructor_name = user.get("full_name") or user.get("display_name") or "Giảng viên"

    final_score = (
        round(
            0.35 * payload.demo_score
            + 0.25 * payload.architecture_score
            + 0.15 * payload.process_score
            + 0.25 * payload.defense_score,
            2,
        )
        if payload.demo_score is not None
        else round(
            0.30 * payload.architecture_score
            + 0.40 * payload.process_score
            + 0.30 * payload.defense_score,
            2,
        )
    )
    demo_val = payload.demo_score if payload.demo_score is not None else payload.group_score

    with db() as conn:
        proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")
        if not can_grade_project_council(user, proj):
            raise HTTPException(
                status_code=403,
                detail="Theo quy chế Hướng 2, chỉ Giảng viên Hướng dẫn, Giảng viên Phản biện được phân công hoặc Quản trị viên mới có quyền chấm điểm đồ án này.",
            )
        existing_eval = conn.execute(
            "SELECT id FROM project_evaluations WHERE project_id=? ORDER BY graded_at DESC LIMIT 1",
            (project_id,),
        ).fetchone()
        if existing_eval:
            eval_id = existing_eval["id"]

        council_role_label = (
            "Quản trị viên"
            if str(user.get("role") or "").lower() in ("admin", "org_admin")
            else ("GV Hướng dẫn" if is_project_advisor(user, proj) else "GV Phản biện")
        )
        grader_display = f"{instructor_name} ({council_role_label})"

        conn.execute(
            """INSERT OR REPLACE INTO project_evaluations(
                   id, project_id, instructor_id, group_score, demo_score, architecture_score,
                   process_score, defense_score, final_score, feedback,
                   member_scores_json, anti_freerider_metrics_json, grader_name, defense_date, status, graded_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                eval_id,
                project_id,
                user["id"],
                payload.group_score,
                demo_val,
                payload.architecture_score,
                payload.process_score,
                payload.defense_score,
                final_score,
                payload.feedback,
                json.dumps(payload.member_scores, ensure_ascii=False),
                json.dumps(payload.member_scores, ensure_ascii=False),
                grader_display,
                now,
                "graded",
                now,
            ),
        )

        conn.execute(
            "UPDATE engineering_projects SET status='delivered', tl_color='done', updated_at=? WHERE id=?",
            (now, project_id),
        )
        if not existing_eval:
            credit_project_team_xp(conn, proj, 150)

        student_ids = resolve_project_student_ids(conn, proj)
        for suid in student_ids:
            notif_id = f"notif-ev-{uid()[:8]}"
            conn.execute(
                """INSERT INTO notifications(
                       id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
                   ) VALUES(?,?,?,?,?,?,?,?,?)""",
                (
                    notif_id,
                    suid,
                    "student",
                    f"Đồ án {proj['code']} đã được nghiệm thu!",
                    f"{grader_display} đã chốt biên bản chấm đồ án với Điểm chung: {final_score}/10.",
                    "project",
                    0,
                    "/defense-room",
                    now,
                ),
            )

    return {
        "status": "graded",
        "eval_id": eval_id,
        "final_score": final_score,
    }


class TeamStatusPatchIn(BaseModel):
    status: str = Field(pattern="^(in|remote|off)$")


def _user_matches_project_advisor(u: dict[str, Any], proj_row: Any) -> bool:
    if (u.get("role") or "").strip().lower() != "instructor":
        return False
    p_dict = dict(proj_row)
    uid_val = str(u.get("id") or "").strip()
    inst_id = str(p_dict.get("instructor_id") or "").strip()
    if inst_id and inst_id != "instructor-demo":
        return inst_id == uid_val or inst_id == f"usr-{uid_val}"

    u_name_stripped = _strip_mentor_title(u.get("full_name") or u.get("display_name") or "")
    if not u_name_stripped:
        return False
    for field in (p_dict.get("instructor_label"), p_dict.get("instructor_name")):
        f_stripped = _strip_mentor_title(field)
        if f_stripped and (f_stripped == u_name_stripped or u_name_stripped in f_stripped or f_stripped in u_name_stripped):
            return True
    return False


def _user_matches_project_student(u: dict[str, Any], proj_row: Any) -> bool:
    if (u.get("role") or "").strip().lower() != "student":
        return False
    p_dict = dict(proj_row)
    uid_val = str(u.get("id") or "").strip()
    u_email = str(u.get("email") or "").strip().lower()
    u_names = {
        str(u.get(k) or "").strip().lower()
        for k in ("full_name", "display_name")
        if str(u.get(k) or "").strip()
    }

    leader_id = str(p_dict.get("leader_user_id") or "").strip()
    if leader_id and (leader_id == uid_val or leader_id == f"usr-{uid_val}"):
        return True
    created_by = str(p_dict.get("created_by") or "").strip()
    if created_by and (created_by == uid_val or created_by == f"usr-{uid_val}"):
        return True

    try:
        raw_team = p_dict.get("team_json") or "[]"
        team_list = json.loads(raw_team) if isinstance(raw_team, str) else (raw_team or [])
    except Exception:
        team_list = []

    for tm in team_list:
        if not isinstance(tm, dict):
            continue
        tm_id = str(tm.get("id") or "").strip()
        tm_email = str(tm.get("email") or "").strip().lower()
        tm_name = str(tm.get("name") or "").strip().lower()
        if tm_id and (tm_id == uid_val or tm_id == f"usr-{uid_val}"):
            return True
        if tm_email and u_email and tm_email == u_email:
            return True
        if tm_name and tm_name in u_names:
            return True
    return False


def _user_is_student_project_leader(u: dict[str, Any], proj_row: Any) -> bool:
    if (u.get("role") or "").strip().lower() != "student":
        return False
    p_dict = dict(proj_row)
    uid_val = str(u.get("id") or "").strip()
    u_email = str(u.get("email") or "").strip().lower()
    u_names = {
        str(u.get(k) or "").strip().lower()
        for k in ("full_name", "display_name")
        if str(u.get(k) or "").strip()
    }

    try:
        raw_team = p_dict.get("team_json") or "[]"
        team_list = json.loads(raw_team) if isinstance(raw_team, str) else (raw_team or [])
    except Exception:
        team_list = []

    leader_id = str(p_dict.get("leader_user_id") or "").strip()
    if leader_id:
        if leader_id == uid_val or leader_id == f"usr-{uid_val}":
            return True
    else:
        created_by = str(p_dict.get("created_by") or "").strip()
        if created_by and (created_by == uid_val or created_by == f"usr-{uid_val}"):
            return True

    for idx, tm in enumerate(team_list):
        if not isinstance(tm, dict):
            continue
        tm_id = str(tm.get("id") or "").strip()
        tm_email = str(tm.get("email") or "").strip().lower()
        tm_name = str(tm.get("name") or "").strip().lower()
        matches = (
            (tm_id and (tm_id == uid_val or tm_id == f"usr-{uid_val}"))
            or (tm_email and u_email and tm_email == u_email)
            or (tm_name and tm_name in u_names)
        )
        if not matches:
            continue
        if tm.get("isLead") is True or (not leader_id and idx == 0):
            return True
    return False


def _user_matches_taught_course(u: dict[str, Any], course_row: dict[str, Any]) -> bool:
    if (u.get("role") or "").strip().lower() != "instructor":
        return False
    uid_val = str(u.get("id") or "").strip()
    c_inst = str(course_row.get("instructor_id") or "").strip()
    if c_inst and c_inst != "instructor-demo":
        return c_inst == uid_val or c_inst == f"usr-{uid_val}"
    u_name_stripped = _strip_mentor_title(u.get("full_name") or u.get("display_name") or "")
    t_stripped = _strip_mentor_title(course_row.get("teacher_name") or "")
    return bool(
        u_name_stripped
        and t_stripped
        and (
            t_stripped == u_name_stripped
            or u_name_stripped in t_stripped
            or t_stripped in u_name_stripped
        )
    )


def _select_scoped_team_users(
    conn: Any, caller_user: dict[str, Any]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], str]:
    all_users = [
        dict(r)
        for r in conn.execute(
            """SELECT id, user_code, email, full_name, display_name, role, status, last_active_label, avatar_url,
                      headline, bio, department, office_location, skills_json, github_url, website_url, phone
               FROM users
               WHERE role IN ('student', 'instructor')
                 AND status NOT IN ('suspended', 'pending')
                 AND id NOT IN ('student-demo', 'instructor-demo', 'admin-demo')
               ORDER BY CASE WHEN role='instructor' THEN 0 ELSE 1 END, full_name ASC"""
        ).fetchall()
    ]
    all_projects = [
        dict(r) for r in conn.execute("SELECT * FROM engineering_projects ORDER BY id ASC").fetchall()
    ]

    caller_role = (caller_user.get("role") or "student").strip().lower()
    if caller_role in ("admin", "org_admin"):
        return (all_users, all_projects, all_projects, "admin")

    if caller_role == "instructor":
        scoped_projects = [p for p in all_projects if can_grade_project_council(caller_user, p)]
        selected_users = [
            u
            for u in all_users
            if (u.get("role") or "").strip().lower() == "instructor"
            or any(_user_matches_project_student(u, p) for p in scoped_projects)
        ]
        return (selected_users, scoped_projects, all_projects, "instructor")

    scoped_projects = [p for p in all_projects if _user_matches_project_student(caller_user, p)]
    if not scoped_projects:
        return ([], [], all_projects, "student")
    selected_users = [
        u
        for u in all_users
        if (
            (u.get("role") or "").strip().lower() == "instructor"
            and any(can_grade_project_council(u, p) for p in scoped_projects)
        )
        or (
            (u.get("role") or "").strip().lower() == "student"
            and any(_user_matches_project_student(u, p) for p in scoped_projects)
        )
    ]
    return (selected_users, scoped_projects, all_projects, "student")


def count_scoped_team_members(conn: Any, caller_user: dict[str, Any]) -> int:
    selected_users, _, _, _ = _select_scoped_team_users(conn, caller_user)
    return len(selected_users)


@router.get("/team/members")
def list_team_members(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy danh sách thành viên đội ngũ & cố vấn thực tế theo phân quyền vai trò từ MySQL."""
    with db() as conn:
        user_rows, scoped_projects, all_projects, scope_role = _select_scoped_team_users(conn, user)
        task_rows = conn.execute("SELECT * FROM engineering_tasks ORDER BY position_order ASC").fetchall()
        commit_rows = conn.execute("SELECT project_id, author_name FROM git_commits").fetchall()
        student_profile_rows = conn.execute(
            """SELECT user_id, current_streak, longest_streak, exp_points, selected_title,
                      radar_algorithm, radar_debugging, radar_cleancode, radar_teamwork, radar_defense
               FROM student_profiles"""
        ).fetchall()
        course_rows = conn.execute(
            """SELECT id, subject_id, code, name, semester, credits, instructor_id,
                      teacher_name, student_count, avg_progress_pct, room, health
               FROM courses ORDER BY code ASC"""
        ).fetchall()
        status_row = conn.execute(
            "SELECT value_json FROM system_settings WHERE key='team_member_statuses'"
        ).fetchone()

    profiles_by_uid: dict[str, dict[str, Any]] = {
        str(r["user_id"]): dict(r) for r in student_profile_rows if r.get("user_id")
    }
    courses_dicts: list[dict[str, Any]] = [dict(c) for c in course_rows]

    try:
        saved_statuses: dict[str, str] = json.loads(status_row["value_json"]) if status_row else {}
    except Exception:
        saved_statuses = {}

    projects_by_id = {p["id"]: p for p in all_projects}
    commit_counts_by_proj_author: dict[tuple[str, str], int] = {}
    for c in commit_rows:
        pid = str(c["project_id"] or "").strip()
        nm = (c["author_name"] or "").strip().lower()
        if pid and nm:
            key = (pid, nm)
            commit_counts_by_proj_author[key] = commit_counts_by_proj_author.get(key, 0) + 1

    members_out: list[dict[str, Any]] = []
    for idx, u in enumerate(user_rows):
        uid_val = u["id"]
        full_name = (u["full_name"] or u["display_name"] or "Thành viên").strip()
        name_low = full_name.lower()
        u_email_low = (u.get("email") or "").strip().lower()
        u_role = (u["role"] or "student").lower()
        is_advisor = u_role in ("instructor", "admin", "org_admin")

        if scope_role == "student":
            candidate_projects = scoped_projects
        elif scope_role == "instructor":
            candidate_projects = all_projects if is_advisor else scoped_projects
        else:
            candidate_projects = all_projects

        member_projects: list[dict[str, Any]] = []
        matched_projects: list[dict[str, Any]] = []
        is_lead = False
        derived_role = "Giảng viên hướng dẫn / Hội đồng" if is_advisor else "Thành viên Đồ án"

        for p in candidate_projects:
            if is_advisor:
                in_proj = _user_matches_project_advisor(u, p)
            else:
                in_proj = _user_matches_project_student(u, p)
                if in_proj:
                    try:
                        team_list = json.loads(p.get("team_json") or "[]")
                    except Exception:
                        team_list = []
                    for tm in team_list:
                        if not isinstance(tm, dict):
                            continue
                        tm_id = str(tm.get("id") or "").strip()
                        tm_email = str(tm.get("email") or "").strip().lower()
                        tm_name = str(tm.get("name") or "").strip().lower()
                        if (
                            (tm_id and (tm_id == uid_val or tm_id == f"usr-{uid_val}"))
                            or (tm_email and u_email_low and tm_email == u_email_low)
                            or (tm_name and tm_name == name_low)
                        ):
                            if tm.get("role"):
                                derived_role = str(tm["role"])
                            break
            if in_proj:
                matched_projects.append(p)
                member_projects.append(
                    {
                        "id": p["id"],
                        "code": p["code"],
                        "name": p["name"],
                        "status": p["status"] or "active",
                        "course": p["course"] or "",
                        "dueText": p["due_text"] or p["due_date"] or "",
                    }
                )

        if not is_advisor:
            is_lead = any(_user_is_student_project_leader(u, p) for p in matched_projects)

        allowed_project_ids = {p["id"] for p in member_projects}
        open_tasks: list[dict[str, Any]] = []
        done_tasks_count = 0
        total_est_hours = 0.0
        if not is_advisor and allowed_project_ids:
            for tk in task_rows:
                if tk["project_id"] not in allowed_project_ids:
                    continue
                try:
                    assignee_obj = json.loads(tk["assignee_json"] or "{}")
                except Exception:
                    assignee_obj = {}
                assignee_name = str(assignee_obj.get("name") or "").strip().lower()
                matches_user = tk["assignee_user_id"] == uid_val or (assignee_name and assignee_name == name_low)
                if not matches_user:
                    continue

                col_id = (tk["column_id"] or "backlog").lower()
                if col_id in ("done", "verified"):
                    done_tasks_count += 1
                else:
                    est = float(tk["estimate_hours"] or 0.0)
                    total_est_hours += est
                    p_ref = projects_by_id.get(tk["project_id"])
                    open_tasks.append(
                        {
                            "id": tk["id"],
                            "code": tk["code"] or "",
                            "title": tk["title"],
                            "projectId": tk["project_id"],
                            "projectName": p_ref["name"] if p_ref else tk["project_id"],
                            "column": tk["column_id"],
                            "priority": tk["priority"] or "medium",
                            "points": int(tk["points"] or 0),
                            "estimateHours": est,
                            "dueDate": tk["due_date"] or "",
                        }
                    )

        commits_count = (
            0
            if is_advisor
            else sum(commit_counts_by_proj_author.get((pid, name_low), 0) for pid in allowed_project_ids)
        )

        cur_status = saved_statuses.get(uid_val, "in")
        if cur_status not in ("in", "remote", "off"):
            cur_status = "in"

        parts = [w for w in full_name.split() if w]
        initials = (
            f"{parts[0][0]}{parts[-1][0]}".upper()
            if len(parts) >= 2
            else (full_name[:2].upper() or "CM")
        )
        shared_prof = serialize_shared_profile_fields(u)
        taught_courses: list[dict[str, Any]] = []
        if is_advisor:
            for c_dict in courses_dicts:
                if _user_matches_taught_course(u, c_dict):
                    taught_courses.append(
                        {
                            "id": c_dict["id"],
                            "subjectId": c_dict.get("subject_id") or "",
                            "code": c_dict["code"],
                            "name": c_dict["name"],
                            "semester": c_dict.get("semester") or "",
                            "credits": int(c_dict.get("credits") or 3),
                            "studentCount": int(c_dict.get("student_count") or 0),
                            "avgProgressPct": int(c_dict.get("avg_progress_pct") or 0),
                            "room": c_dict.get("room") or "",
                            "health": c_dict.get("health") or "Ổn định",
                        }
                    )

        learning_summary: dict[str, Any] | None = None
        if not is_advisor:
            sp = profiles_by_uid.get(uid_val)
            if sp:
                xp_val = int(sp.get("exp_points") or 0)
                league_name = (
                    "Vàng"
                    if xp_val >= 3000
                    else "Bạc"
                    if xp_val >= 1500
                    else "Đồng"
                    if xp_val >= 500
                    else "Tân binh"
                )
                learning_summary = {
                    "expPoints": xp_val,
                    "streakDays": int(sp.get("current_streak") or 0),
                    "longestStreak": int(sp.get("longest_streak") or 0),
                    "selectedTitle": sp.get("selected_title") or "CodeMind Campus Builder",
                    "leagueName": league_name,
                    "radar": {
                        "algorithm": round(float(sp.get("radar_algorithm") or 0)),
                        "cleancode": round(float(sp.get("radar_cleancode") or 0)),
                        "teamwork": round(float(sp.get("radar_teamwork") or 0)),
                        "defense": round(float(sp.get("radar_defense") or 0)),
                        "debugging": round(float(sp.get("radar_debugging") or 0)),
                    },
                }

        members_out.append(
            {
                "id": uid_val,
                "name": full_name,
                "email": u["email"],
                "code": u["user_code"] or "—",
                "userRole": u_role,
                "role": derived_role,
                "initials": initials,
                "avatarUrl": shared_prof["avatar_url"],
                "headline": shared_prof["headline"],
                "bio": shared_prof["bio"],
                "department": shared_prof["department"],
                "officeLocation": shared_prof["office_location"],
                "skills": shared_prof["skills"],
                "githubUrl": shared_prof["github_url"],
                "websiteUrl": shared_prof["website_url"],
                "phone": shared_prof["phone"],
                "hue": (idx % 6) + 1,
                "status": cur_status,
                "isAdvisor": is_advisor,
                "isLead": is_lead,
                "projects": member_projects,
                "taughtCourses": taught_courses,
                "learningSummary": learning_summary,
                "openTasks": open_tasks,
                "doneTasksCount": done_tasks_count,
                "commitsCount": commits_count,
                "totalEstimateHours": round(total_est_hours, 1),
                "lastActive": u["last_active_label"] or "Vừa xong",
            }
        )

    return {
        "members": members_out,
        "total": len(members_out),
        "inLabCount": sum(1 for m in members_out if m["status"] == "in"),
        "scopeRole": scope_role,
        "scopedProjectsCount": len(scoped_projects),
    }


@router.patch("/team/members/{member_id}/status")
def update_team_member_status(
    member_id: str,
    payload: TeamStatusPatchIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lưu trạng thái hiện diện (Tại Lab / Từ xa / Nghỉ phép) vào MySQL."""
    with db() as conn:
        target = conn.execute("SELECT id, role FROM users WHERE id=?", (member_id,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy thành viên.")
        caller_role = (user.get("role") or "student").lower()
        target_role = (target["role"] or "student").lower()
        if caller_role == "student" and target_role in ("instructor", "admin", "org_admin"):
            raise HTTPException(
                status_code=403,
                detail="Học viên không thể thay đổi trạng thái công tác của Giảng viên / Quản trị viên.",
            )
        if caller_role not in ("admin", "org_admin") and member_id != user["id"]:
            raise HTTPException(
                status_code=403,
                detail="Bạn chỉ có thể thay đổi trạng thái hiện diện của chính mình (hoặc cần quyền Quản trị viên).",
            )

        status_row = conn.execute(
            "SELECT value_json FROM system_settings WHERE key='team_member_statuses'"
        ).fetchone()
        try:
            saved = json.loads(status_row["value_json"]) if status_row else {}
        except Exception:
            saved = {}
        saved[member_id] = payload.status
        conn.execute(
            "INSERT OR REPLACE INTO system_settings(key, value_json, updated_at) VALUES('team_member_statuses', ?, ?)",
            (json.dumps(saved, ensure_ascii=False), now_utc()),
        )
        conn.commit()
    return {"member_id": member_id, "status": payload.status}
