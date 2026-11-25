from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from app.api.deps import current_user, get_optional_current_user, record_audit_log
from app.api.v1.kanban import is_project_advisor, is_user_in_project, is_user_project_leader
from app.core.database import db
from app.core.timezone import now_utc
from app.schemas.git_hub import (
    GitCommitCreateIn,
    GitPrMergeIn,
    GitPrPeerApproveIn,
    GitPrRequestChangesIn,
    GitPullRequestCreateIn,
    GitRepoUpdateIn,
)
from app.services.architecture_templates import get_default_architecture_for_project
from app.services.github_evidence import (
    GitHubEvidenceError, fetch_snapshot, load_snapshot, parse_github_repo, save_snapshot,
)

router = APIRouter(prefix="/git-hub", tags=["Git Project Hub & AI PR Review"])


def _require_roles(user: dict[str, Any], allowed: tuple[str, ...], action_label: str) -> str:
    role = str(user.get("role") or "student").strip().lower()
    if role not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Vai trò '{role}' không có quyền {action_label}.",
        )
    return role


def _ensure_git_project_access(
    conn: Any,
    user: dict[str, Any] | None,
    project_id: str,
    *,
    require_leader: bool = False,
    check_frozen: bool = False,
) -> Any:
    proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
    if not proj:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án kỹ thuật.")
    u_role = str((user or {}).get("role") or "").strip().lower()
    if user and u_role == "instructor":
        if (require_leader or check_frozen) and not is_project_advisor(user, proj):
            raise HTTPException(
                status_code=403,
                detail="Chỉ Giảng viên Hướng dẫn của đồ án này hoặc Quản trị viên mới có quyền cập nhật/thẩm định trên Git Project Hub.",
            )
    if user and u_role == "student":
        if not is_user_in_project(user, proj):
            raise HTTPException(
                status_code=403,
                detail="Chỉ thành viên trong nhóm đồ án này mới có quyền truy cập Git Project Hub của dự án.",
            )
        if require_leader and not is_user_project_leader(user, proj):
            raise HTTPException(
                status_code=403,
                detail="Chỉ Nhóm trưởng hoặc Giảng viên/Admin mới có quyền thay đổi cấu hình đồ án.",
            )
    if check_frozen:
        if bool(dict(proj).get("is_frozen")):
            raise HTTPException(
                status_code=403,
                detail="Đồ án đã bị đóng băng nộp bài, không thể thao tác Git Commit / Pull Request / Merge. Vui lòng mở khóa đóng băng trước.",
            )
        if str(proj["status"] or "").strip().lower() in ("delivered", "done", "completed"):
            raise HTTPException(
                status_code=403,
                detail="Đồ án đã hoàn tất bảo vệ nghiệm thu, kho mã nguồn hiện ở chế độ lưu trữ chỉ đọc.",
            )
    return proj

_MEMBER_THEME_PALETTE = [
    ("#2563eb", "bg-blue-600", "pill--info"),
    ("#16a34a", "bg-emerald-600", "pill--good"),
    ("#9333ea", "bg-purple-600", "pill--plain"),
    ("#d97706", "bg-amber-600", "pill--warn"),
]


def _extract_repo_slug(repo_url: str) -> str:
    try:
        return parse_github_repo(repo_url)[1]
    except GitHubEvidenceError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


def _serialize_repo(row: Any) -> dict[str, Any]:
    return {
        "projectId": row["project_id"],
        "repoUrl": row["repo_url"],
        "repoSlug": row["repo_slug"],
        "targetBranch": row["target_branch"],
        "defaultMergeStrategy": row["default_merge_strategy"],
        "webhookActive": False,
        "cadenceVarianceHours": 0,
        "lastSyncedAt": "",
        "mode": "read_only",
        "remoteWritesEnabled": False,
        "updatedAt": row["updated_at"],
    }


def _ensure_project_and_repo(conn: Any, project_id: str) -> tuple[Any, Any]:
    proj = conn.execute("SELECT * FROM engineering_projects WHERE id=?", (project_id,)).fetchone()
    if not proj:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy dự án kỹ thuật '{project_id}'.")
    pid = proj["id"]
    repo = conn.execute("SELECT * FROM git_repositories WHERE project_id=?", (pid,)).fetchone()
    if not repo:
        ts = now_utc()
        slug = ""
        conn.execute(
            """INSERT INTO git_repositories(
                   project_id, repo_url, repo_slug, target_branch, default_merge_strategy,
                   webhook_active, cadence_variance_hours, last_synced_at, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?)""",
            (pid, "", slug, "main", "squash", 0, 0, "", ts),
        )
        repo = conn.execute("SELECT * FROM git_repositories WHERE project_id=?", (pid,)).fetchone()
    return proj, repo


def _compute_analytics_and_metrics(
    project: Any,
    repo: Any,
    commits: list[dict[str, Any]],
    pull_requests: list[dict[str, Any]],
    tasks_rows: list[Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    team = json.loads(project["team_json"] or "[]")
    member_names: list[tuple[str, str, str]] = []
    seen: set[str] = set()
    for m in team:
        name = str(m.get("name") or "").strip()
        if name and name not in seen:
            seen.add(name)
            member_names.append((name, str(m.get("role") or "Developer"), str(m.get("avatar") or name[:1].upper())))
    for c in commits:
        name = c["author"]["name"]
        if name not in seen:
            seen.add(name)
            member_names.append((name, c["author"]["role"], c["author"]["avatar"]))

    total_commits = len(commits)
    total_sp_done = sum(
        int(t["points"] or 0)
        for t in tasks_rows
        if t["column_id"] in ("done", "verified")
    )
    total_prs = len(pull_requests)

    raw_members: list[dict[str, Any]] = []
    for idx, (m_name, m_role, m_avatar) in enumerate(member_names):
        m_commits = [c for c in commits if c["author"]["name"] == m_name]
        c_count = len(m_commits)
        additions = sum(c["stats"]["additions"] for c in m_commits)
        deletions = sum(c["stats"]["deletions"] for c in m_commits)

        m_tasks = []
        m_sp_done = 0
        for t in tasks_rows:
            assignee = json.loads(t["assignee_json"] or "{}")
            if str(assignee.get("name") or "") == m_name:
                m_tasks.append(str(t["epic"] or t["title"]))
                if t["column_id"] in ("done", "verified"):
                    m_sp_done += int(t["points"] or 0)

        m_prs = [pr for pr in pull_requests if pr["author"]["name"] == m_name or pr["peerReviewer"] == m_name]
        sp_ratio = (m_sp_done / total_sp_done) if total_sp_done > 0 else 0.0
        commit_ratio = (c_count / total_commits) if total_commits > 0 else 0.0
        dod_ratio = (len(m_prs) / total_prs) if total_prs > 0 else 0.0

        # Công thức Anti-Freerider: 50% Story Points + 30% Commits/PR + 20% DoD Review
        raw_score = 0.50 * sp_ratio + 0.30 * commit_ratio + 0.20 * dod_ratio
        color_hex, bar_class, pill_class = _MEMBER_THEME_PALETTE[idx % len(_MEMBER_THEME_PALETTE)]

        unique_epics = list(dict.fromkeys(m_tasks))[:3]
        raw_members.append({
            "name": m_name,
            "role": m_role,
            "avatar": m_avatar,
            "color": color_hex,
            "barClass": bar_class,
            "pillClass": pill_class,
            "commitsCount": c_count,
            "additions": additions,
            "deletions": deletions,
            "storyPointsDone": m_sp_done,
            "tasksSummary": ", ".join(unique_epics) if unique_epics else "Chưa có task đối sánh",
            "rawScore": raw_score,
        })

    sum_raw = sum(m["rawScore"] for m in raw_members)
    shares = [round((m["rawScore"] / sum_raw) * 100) if sum_raw else 0 for m in raw_members]
    if shares and sum_raw:
        diff = 100 - sum(shares)
        shares[0] += diff

    member_analytics: list[dict[str, Any]] = []
    for m, share in zip(raw_members, shares):
        member_analytics.append({
            "name": m["name"],
            "role": m["role"],
            "avatar": m["avatar"],
            "color": m["color"],
            "barClass": m["barClass"],
            "pillClass": m["pillClass"],
            "sharePct": share,
            "commitsCount": m["commitsCount"],
            "additions": m["additions"],
            "deletions": m["deletions"],
            "storyPointsDone": m["storyPointsDone"],
            "tasksSummary": m["tasksSummary"],
            "grade": "Chưa đánh giá",
        })

    task_linked_count = sum(1 for c in commits if c["taskCode"])
    task_linked_pct = round(100 * task_linked_count / total_commits) if total_commits else 0
    metrics = {
        "gitCultureScore": 0,
        "taskLinkedPct": task_linked_pct,
        "aiIntegrityPct": 0,
        "cadenceVarianceHours": 0,
        "scoresAvailable": False,
        "totalCommits": total_commits,
        "openPrsCount": sum(1 for pr in pull_requests if pr["status"] == "open"),
        "mergedPrsCount": sum(1 for pr in pull_requests if pr["status"] == "merged"),
        "memberShares": shares,
        "balanceStatus": "Quan sát dữ liệu Git; chưa đánh giá tự động",
    }
    return member_analytics, metrics


@router.get("/workspace")
def get_git_hub_workspace(
    project_id: str = Query(default="prj-codemind"),
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lấy trọn gói dữ liệu Git Project Hub đồng bộ CSDL: Repo, Commits Graph, Pull Requests, Tasks & Team Analytics."""
    with db() as conn:
        all_projects_rows = conn.execute(
            "SELECT * FROM engineering_projects ORDER BY created_at DESC, rowid ASC"
        ).fetchall()
        if project_id and all_projects_rows and all(p["id"] != project_id for p in all_projects_rows):
            raise HTTPException(status_code=404, detail=f"Không tìm thấy dự án kỹ thuật '{project_id}'.")
        projects_rows = all_projects_rows
        if user and str(user.get("role") or "").strip().lower() == "student":
            projects_rows = [p for p in projects_rows if is_user_in_project(user, p)]

        if not projects_rows:
            return {
                "activeProjectId": "",
                "projects": [],
                "repository": None,
                "metrics": {
                    "gitCultureScore": 0,
                    "taskLinkedPct": 0,
                    "aiIntegrityPct": 0,
                    "cadenceVarianceHours": 0.0,
                    "totalCommits": 0,
                    "openPrsCount": 0,
                    "mergedPrsCount": 0,
                    "memberShares": [],
                    "balanceStatus": "Chưa có đồ án",
                },
                "commits": [],
                "pullRequests": [],
                "memberAnalytics": [],
                "projectTasks": [],
            }

        accessible_ids = {p["id"] for p in projects_rows}
        resolved_project_id = project_id if project_id in accessible_ids else projects_rows[0]["id"]
        proj, repo = _ensure_project_and_repo(conn, resolved_project_id)
        pid = proj["id"]
        snapshot, sync_error = load_snapshot(conn, pid, repo["repo_slug"])
        if snapshot and snapshot.get("branch") != repo["target_branch"]:
            snapshot = None
        task_rows = conn.execute(
            "SELECT id, code, title, column_id, points, assignee_json, epic, depends_on FROM engineering_tasks WHERE project_id=? ORDER BY position_order ASC",
            (pid,),
        ).fetchall()

    commits = snapshot["commits"] if snapshot else []
    pull_requests = snapshot["pullRequests"] if snapshot else []
    member_analytics, metrics = _compute_analytics_and_metrics(proj, repo, commits, pull_requests, task_rows)
    repository = _serialize_repo(repo)
    repository.update({"lastSyncedAt": snapshot["fetchedAt"] if snapshot else "",
                       "evidenceVerified": bool(snapshot), "lastSyncError": sync_error,
                       "truncated": bool(snapshot and snapshot.get("truncated")),
                       "sampleLimits": snapshot.get("sampleLimits") if snapshot else None})

    return {
        "activeProjectId": pid,
        "projects": [
            {
                "id": p["id"],
                "code": p["code"],
                "name": p["name"],
                "kind": p["kind"],
                "status": p["status"],
                "sprint": p["sprint"],
                "isFrozen": bool(dict(p).get("is_frozen")),
                "isLead": is_user_project_leader(user, p) if user else False,
                "isAdvisor": is_project_advisor(user, p) if user else False,
                "canEditRepo": bool(
                    str(user.get("role") or "").lower() in ("admin", "org_admin")
                    or is_project_advisor(user, p)
                    or (str(user.get("role") or "").lower() == "student" and is_user_project_leader(user, p))
                ) if user else False,
            }
            for p in projects_rows
        ],
        "repository": repository,
        "metrics": metrics,
        "commits": commits,
        "pullRequests": pull_requests,
        "memberAnalytics": member_analytics,
        "projectTasks": [
            {
                "id": t["id"],
                "code": t["code"],
                "title": t["title"],
                "column": t["column_id"],
                "points": int(t["points"] or 0),
                "epic": t["epic"],
                "dependsOn": t["depends_on"],
            }
            for t in task_rows
        ],
    }


@router.put("/projects/{project_id}/repo")
def update_project_repo(
    project_id: str,
    payload: GitRepoUpdateIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lưu URL GitHub Repository, nhánh nộp bài chính và chiến lược Merge vào CSDL."""
    _require_roles(user, ("student", "instructor", "admin"), "cập nhật cấu hình Git Repository")
    slug = _extract_repo_slug(payload.repo_url)
    clean_url = f"https://github.com/{slug}"
    now = now_utc()
    with db() as conn:
        _ensure_git_project_access(conn, user, project_id, require_leader=True, check_frozen=True)
        proj, _ = _ensure_project_and_repo(conn, project_id)
        pid = proj["id"]
        conn.execute(
            """UPDATE git_repositories
               SET repo_url=?, repo_slug=?, target_branch=?, default_merge_strategy=?,
                   updated_at=?
               WHERE project_id=?""",
            (
                clean_url,
                slug,
                payload.target_branch.strip() or "main",
                payload.default_merge_strategy.strip() or "squash",
                now,
                pid,
            ),
        )
        updated = conn.execute("SELECT * FROM git_repositories WHERE project_id=?", (pid,)).fetchone()
    record_audit_log(
        user.get("full_name") or user.get("display_name") or "User",
        user["id"],
        f"Đồng bộ Repo GitHub ({slug})",
        f"PUT /v1/git-hub/projects/{pid}/repo",
        log_type="user",
        resource_type="git_repository",
        resource_id=pid,
    )
    return {"repository": _serialize_repo(updated)}


def _read_only_git() -> None:
    raise HTTPException(
        status_code=409,
        detail="Git Hub is in read-only evidence mode. Push, open/review/merge the PR on GitHub, then sync. No remote action was performed.",
    )


@router.post("/projects/{project_id}/commits")
def push_git_commit(project_id: str, payload: GitCommitCreateIn, user: dict[str, Any] = Depends(current_user)):
    _read_only_git()


@router.post("/projects/{project_id}/pull-requests")
def create_pull_request(project_id: str, payload: GitPullRequestCreateIn, user: dict[str, Any] = Depends(current_user)):
    _read_only_git()


@router.post("/pull-requests/{pr_id}/ai-fix")
def apply_pr_ai_fix(pr_id: str, user: dict[str, Any] = Depends(current_user)):
    _read_only_git()


@router.post("/pull-requests/{pr_id}/peer-approve")
def peer_approve_pr(pr_id: str, payload: GitPrPeerApproveIn, user: dict[str, Any] = Depends(current_user)):
    _read_only_git()


@router.post("/pull-requests/{pr_id}/request-changes")
def request_changes_pr(pr_id: str, payload: GitPrRequestChangesIn, user: dict[str, Any] = Depends(current_user)):
    _read_only_git()


@router.post("/pull-requests/{pr_id}/merge")
def merge_pull_request(pr_id: str, payload: GitPrMergeIn, user: dict[str, Any] = Depends(current_user)):
    _read_only_git()


@router.post("/projects/{project_id}/sync-github")
def sync_github_live(
    project_id: str,
    payload: dict[str, Any] = Body(default={}),
    user: dict[str, Any] = Depends(current_user),
):
    """Fetch a complete bounded GitHub sample before replacing verified evidence."""
    _require_roles(user, ("student", "instructor", "admin"), "sync GitHub evidence")
    with db() as conn:
        _ensure_git_project_access(conn, user, project_id, check_frozen=True)
        _, repo = _ensure_project_and_repo(conn, project_id)
        repo_url = payload.get("repoUrl") or repo["repo_url"]
        slug = _extract_repo_slug(str(repo_url))
        if slug != repo["repo_slug"].lower():
            raise HTTPException(status_code=409, detail="Save the repository configuration before syncing another repository.")
        tasks = conn.execute("SELECT code FROM engineering_tasks WHERE project_id=?", (project_id,)).fetchall()
        branch = repo["target_branch"]
    try:
        snapshot = _fetch_remote_github_data(str(repo_url), project_id, [t["code"] for t in tasks], branch=branch)
    except GitHubEvidenceError as exc:
        # Commit only the error annotation, never erase/replace the previous snapshot.
        with db() as conn:
            conn.execute("UPDATE git_evidence_snapshots SET last_error=? WHERE project_id=? AND repo_slug=?",
                         (str(exc), project_id, slug))
        raise HTTPException(status_code=exc.status, detail=f"GitHub sync failed ({exc.code}): {exc} Previous verified evidence was preserved.") from exc
    with db() as conn:
        # Reject a stale in-flight sync if configuration/access changed during network I/O.
        _ensure_git_project_access(conn, user, project_id, check_frozen=True)
        current_repo = conn.execute("SELECT * FROM git_repositories WHERE project_id=?", (project_id,)).fetchone()
        if not current_repo or current_repo["repo_slug"].lower() != slug or current_repo["target_branch"] != branch:
            raise HTTPException(status_code=409, detail="Repository configuration changed during sync. Retry with the current repository.")
        save_snapshot(conn, project_id, snapshot)
        conn.execute("UPDATE git_repositories SET last_synced_at=?, updated_at=?, webhook_active=0 WHERE project_id=?",
                     (snapshot["fetchedAt"], snapshot["fetchedAt"], project_id))
    return {"synced": True, "repoSlug": slug, "repoUrl": snapshot["repoUrl"],
            "commitsSynced": len(snapshot["commits"]), "prsSynced": len(snapshot["pullRequests"]),
            "lastSyncedAt": snapshot["fetchedAt"], "isRemoteLive": True,
            "evidenceSource": "github-rest", "truncated": snapshot["truncated"],
            "readOnly": True}


def _fetch_remote_github_data(repo_url: str, project_id: str = "", task_codes: list[str] | None = None,
                              *, branch: str | None = None) -> dict[str, Any]:
    return fetch_snapshot(repo_url, project_id, task_codes or [], branch=branch)


@router.get("/projects/{project_id}/architecture")
def get_project_architecture(
    project_id: str,
    user: dict[str, Any] = Depends(current_user),
):
    """
    Lấy sơ đồ kiến trúc phân tầng động từ CSDL MySQL/SQLite `project_architectures`.
    Tự động đồng bộ và tái sinh kiến trúc phù hợp với Repo URL hiện tại nếu đã thay đổi.
    """
    with db() as conn:
        project = conn.execute("SELECT * FROM engineering_projects WHERE id = ?", (project_id,)).fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án.")
        if user and str(user.get("role") or "").strip().lower() == "student" and not is_user_in_project(user, project):
            raise HTTPException(status_code=403, detail="Chỉ thành viên trong nhóm đồ án này mới có quyền xem sơ đồ kiến trúc.")
        project_name = project["name"] if project else "Hệ thống Phần mềm Đồ án"
        repo = conn.execute("SELECT * FROM git_repositories WHERE project_id = ?", (project_id,)).fetchone()
        repo_url = repo["repo_url"] if repo else "https://github.com/Hoaba-clouch/E-learningProject"

        row = conn.execute("SELECT * FROM project_architectures WHERE project_id = ?", (project_id,)).fetchone()
        if row and row["architecture_json"]:
            try:
                saved_repo = row["generated_from_repo"] or ""
                # Nếu kiến trúc đã lưu khớp với repo hiện tại thì trả về ngay
                if not saved_repo or saved_repo == repo_url:
                    data = json.loads(row["architecture_json"])
                    data["projectId"] = project_id
                    data["updatedAt"] = row["updated_at"]
                    data["generatedFromRepo"] = row["generated_from_repo"]
                    return data
            except Exception as e:
                print(f"[Architecture] JSON parse error for {project_id}: {e}")

        # Nếu chưa có hoặc repo_url đã thay đổi -> Tạo mới kiến trúc theo đúng repo hiện tại
        arch_data = get_default_architecture_for_project(project_id, project_name, repo_url)
        now = now_utc()
        conn.execute(
            """INSERT INTO project_architectures (project_id, architecture_json, generated_from_repo, updated_at)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE architecture_json = VALUES(architecture_json), generated_from_repo = VALUES(generated_from_repo), updated_at = VALUES(updated_at)""",
            (project_id, json.dumps(arch_data, ensure_ascii=False), repo_url, now),
        )
        arch_data["projectId"] = project_id
        arch_data["updatedAt"] = now
        arch_data["generatedFromRepo"] = repo_url
        return arch_data


@router.put("/projects/{project_id}/architecture")
def save_project_architecture(
    project_id: str,
    payload: dict[str, Any] = Body(...),
    user: dict[str, Any] = Depends(current_user),
):
    """
    Lưu cập nhật sơ đồ kiến trúc phân tầng (Nodes, Edges, Subsystems, Flows) vào MySQL `project_architectures`.
    """
    _require_roles(user, ("student", "instructor", "admin"), "lưu sơ đồ kiến trúc")
    with db() as conn:
        project = conn.execute("SELECT * FROM engineering_projects WHERE id = ?", (project_id,)).fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án.")
        _ensure_git_project_access(conn, user, project_id, require_leader=True, check_frozen=True)

        now = now_utc()
        arch_json_str = json.dumps(payload, ensure_ascii=False)
        repo_url = payload.get("repoUrl", "")

        conn.execute(
            """INSERT INTO project_architectures (project_id, architecture_json, generated_from_repo, updated_at)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE architecture_json = VALUES(architecture_json), generated_from_repo = VALUES(generated_from_repo), updated_at = VALUES(updated_at)""",
            (project_id, arch_json_str, repo_url, now),
        )

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "User",
        user["id"],
        f"Lưu sơ đồ kiến trúc động dự án {project_id} vào MySQL",
        f"PUT /v1/git-hub/projects/{project_id}/architecture",
        log_type="user",
        resource_type="project_architecture",
        resource_id=project_id,
    )
    return {"success": True, "projectId": project_id, "updatedAt": now}


@router.post("/projects/{project_id}/generate-architecture")
def generate_project_architecture(
    project_id: str,
    payload: dict[str, Any] = Body(default={}),
    user: dict[str, Any] = Depends(current_user),
):
    """
    AI Scanner: Trích xuất và tự động tái cấu trúc sơ đồ kiến trúc phân tầng từ Repo GitHub và lưu vào MySQL.
    """
    _require_roles(user, ("student", "instructor", "admin"), "tái cấu trúc sơ đồ kiến trúc bằng AI")
    from app.api.deps import assert_ai_service_active
    with db() as conn:
        assert_ai_service_active(conn, "svc-aigc", "AI Architecture Scanner")
        project = conn.execute("SELECT * FROM engineering_projects WHERE id = ?", (project_id,)).fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án.")
        _ensure_git_project_access(conn, user, project_id, check_frozen=True)

        repo = conn.execute("SELECT * FROM git_repositories WHERE project_id = ?", (project_id,)).fetchone()
        repo_url = payload.get("repoUrl") or (repo["repo_url"] if repo else "https://github.com/Hoaba-clouch/E-learningProject")

        arch_data = get_default_architecture_for_project(project_id, project["name"], repo_url)
        now = now_utc()
        conn.execute(
            """INSERT INTO project_architectures (project_id, architecture_json, generated_from_repo, updated_at)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE architecture_json = VALUES(architecture_json), generated_from_repo = VALUES(generated_from_repo), updated_at = VALUES(updated_at)""",
            (project_id, json.dumps(arch_data, ensure_ascii=False), repo_url, now),
        )

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "User",
        user["id"],
        f"AI quét và sinh kiến trúc tự động cho dự án {project_id}",
        f"POST /v1/git-hub/projects/{project_id}/generate-architecture",
        log_type="user",
        resource_type="project_architecture",
        resource_id=project_id,
    )
    arch_data["updatedAt"] = now
    return arch_data

