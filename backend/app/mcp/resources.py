"""Các MCP Resources cho CodeMind Learning OS.

Cho phép các AI Agent (Antigravity, Claude, Cursor) đọc trực tiếp các snapshot ngữ cảnh
và tài liệu hệ thống thông qua giao thức chuẩn MCP URI 'codemind://...'.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.database import db, row_dict
from app.mcp.protocol import McpDispatcher


def register_all_resources(dispatcher: McpDispatcher) -> None:
    """Đăng ký toàn bộ các MCP Resources chuẩn."""

    # 1. codemind://system/stats
    def handle_system_stats(uri: str) -> dict[str, Any]:
        with db() as conn:
            proj_cnt = conn.execute("SELECT COUNT(*) as c FROM engineering_projects").fetchone()["c"]
            task_cnt = conn.execute("SELECT COUNT(*) as c FROM engineering_tasks").fetchone()["c"]
            done_cnt = conn.execute(
                "SELECT COUNT(*) as c FROM engineering_tasks WHERE column_id IN ('done', 'verified')"
            ).fetchone()["c"]
            commit_cnt = conn.execute("SELECT COUNT(*) as c FROM git_commits").fetchone()["c"]
            pr_cnt = conn.execute("SELECT COUNT(*) as c FROM git_pull_requests").fetchone()["c"]
            student_cnt = conn.execute("SELECT COUNT(*) as c FROM users WHERE role = 'student'").fetchone()["c"]
            defense_cnt = conn.execute("SELECT COUNT(*) as c FROM defense_sessions").fetchone()["c"]

        stats = {
            "platform": "CodeMind Campus AI Learning OS",
            "version": "2.0.0",
            "metrics": {
                "total_students": student_cnt,
                "total_projects": proj_cnt,
                "total_tasks": task_cnt,
                "completed_tasks": done_cnt,
                "task_completion_rate_pct": round((done_cnt / task_cnt * 100), 1) if task_cnt > 0 else 0.0,
                "total_git_commits": commit_cnt,
                "total_pull_requests": pr_cnt,
                "total_defense_sessions": defense_cnt,
            },
        }
        return {
            "mimeType": "application/json",
            "text": json.dumps(stats, ensure_ascii=False, indent=2),
        }

    dispatcher.register_resource(
        uri="codemind://system/stats",
        name="Thống kê tổng quan hệ thống CodeMind",
        description="Số liệu tổng hợp thời gian thực về đồ án, tasks, commits, sinh viên và các phiên phản biện AI.",
        mime_type="application/json",
        handler=handle_system_stats,
    )

    # 2. codemind://projects
    def handle_projects_summary(uri: str) -> dict[str, Any]:
        with db() as conn:
            projects = conn.execute("SELECT id, code, name, client, course, sprint, status FROM engineering_projects").fetchall()
        return {
            "mimeType": "application/json",
            "text": json.dumps([row_dict(p) for p in projects], ensure_ascii=False, indent=2),
        }

    dispatcher.register_resource(
        uri="codemind://projects",
        name="Danh mục đồ án kỹ thuật",
        description="Snapshot danh sách toàn bộ các đồ án kỹ thuật đang được giảng dạy và bảo vệ.",
        mime_type="application/json",
        handler=handle_projects_summary,
    )

    # 3. codemind://projects/{project_id}
    def handle_project_context(uri: str) -> dict[str, Any]:
        # Format: codemind://projects/<project_id>
        parts = uri.replace("codemind://projects/", "").split("/")
        project_id = parts[0] if parts else ""

        with db() as conn:
            proj = conn.execute("SELECT * FROM engineering_projects WHERE id = ? OR code = ?", (project_id, project_id)).fetchone()
            if not proj:
                return {
                    "mimeType": "application/json",
                    "text": json.dumps({"error": f"Không tìm thấy đồ án '{project_id}'"}, ensure_ascii=False),
                }

            pid = proj["id"]
            tasks = conn.execute("SELECT code, title, column_id, points, assignee_user_id FROM engineering_tasks WHERE project_id = ?", (pid,)).fetchall()
            commits = conn.execute("SELECT sha, message, author_name, branch, committed_at_label FROM git_commits WHERE project_id = ? LIMIT 10", (pid,)).fetchall()

        context = {
            "project": row_dict(proj),
            "tasks": [row_dict(t) for t in tasks],
            "recent_commits": [row_dict(c) for c in commits],
        }
        return {
            "mimeType": "application/json",
            "text": json.dumps(context, ensure_ascii=False, indent=2),
        }

    dispatcher.register_resource(
        uri="codemind://projects/{project_id}",
        name="Ngữ cảnh chi tiết đồ án",
        description="Toàn bộ ngữ cảnh một đồ án kỹ thuật cụ thể (thông tin, nhiệm vụ Kanban và lịch sử commits mới nhất).",
        mime_type="application/json",
        handler=handle_project_context,
    )
