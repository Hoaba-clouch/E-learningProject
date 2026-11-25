"""FastAPI Router cho CodeMind MCP Server.

Expose endpoint JSON-RPC 2.0 qua HTTP kèm RBAC Guard & Nhật ký thực thi MySQL:
- GET /v1/mcp/info: Thông tin server, capabilities, RBAC policy, live DB snapshot
- POST /v1/mcp/rpc: Thực thi JSON-RPC 2.0 (kiểm tra RBAC với Write tools & ghi log)
- GET /v1/mcp/logs: Truy vấn lịch sử thực thi MCP & RBAC Guard từ audit_events
"""

from __future__ import annotations

import logging
import time
from typing import Any
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.api.deps import get_current_user, get_optional_current_user
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc
from app.mcp.protocol import McpDispatcher
from app.mcp.server import create_dispatcher

logger = logging.getLogger("codemind.mcp.router")

router = APIRouter(prefix="/mcp", tags=["Model Context Protocol (MCP)"])

# Singleton dispatcher cho HTTP endpoint
_http_dispatcher: McpDispatcher | None = None

MCP_TOOL_POLICIES: dict[str, dict[str, Any]] = {
    "list_projects": {
        "access_mode": "read",
        "category": "projects",
        "allowed_roles": ["student", "instructor", "admin"],
        "enforces_h2": False,
    },
    "get_project_detail": {
        "access_mode": "read",
        "category": "projects",
        "allowed_roles": ["student", "instructor", "admin"],
        "enforces_h2": False,
    },
    "list_kanban_tasks": {
        "access_mode": "read",
        "category": "kanban",
        "allowed_roles": ["student", "instructor", "admin"],
        "enforces_h2": False,
    },
    "create_kanban_task": {
        "access_mode": "write",
        "category": "kanban",
        "allowed_roles": ["student", "instructor", "admin"],
        "enforces_h2": False,
    },
    "move_kanban_task": {
        "access_mode": "write",
        "category": "kanban",
        "allowed_roles": ["student", "instructor", "admin"],
        "enforces_h2": True,
    },
    "list_git_commits": {
        "access_mode": "read",
        "category": "git",
        "allowed_roles": ["student", "instructor", "admin"],
        "enforces_h2": False,
    },
    "list_pull_requests": {
        "access_mode": "read",
        "category": "git",
        "allowed_roles": ["student", "instructor", "admin"],
        "enforces_h2": False,
    },
    "list_academic_schedules": {
        "access_mode": "read",
        "category": "schedule",
        "allowed_roles": ["student", "instructor", "admin"],
        "enforces_h2": False,
    },
    "list_defense_sessions": {
        "access_mode": "read",
        "category": "defense",
        "allowed_roles": ["student", "instructor", "admin"],
        "enforces_h2": False,
    },
    "get_student_analytics": {
        "access_mode": "read",
        "category": "analytics",
        "allowed_roles": ["student", "instructor", "admin"],
        "enforces_h2": False,
    },
    "submit_ai_defense_audit": {
        "access_mode": "write",
        "category": "defense",
        "allowed_roles": ["instructor", "admin"],
        "enforces_h2": False,
    },
}


def get_dispatcher() -> McpDispatcher:
    global _http_dispatcher
    if _http_dispatcher is None:
        _http_dispatcher = create_dispatcher()
    return _http_dispatcher


def _normalize_role(user: dict[str, Any] | None) -> str:
    if not user:
        return "anonymous"
    raw = str(user.get("role") or "student").strip().lower()
    if raw == "org_admin":
        return "admin"
    return raw


def _actor_label_for_user(user: dict[str, Any] | None) -> str:
    if not user:
        return "Anonymous Client"
    return str(user.get("display_name") or user.get("full_name") or user.get("email") or user.get("id") or "User")


def _log_mcp_event(
    *,
    actor_user_id: str | None,
    actor_label: str,
    action: str,
    resource_type: str,
    resource_id: str | None,
    target_label: str,
    decision: str,
    reason_code: str,
) -> None:
    """Ghi nhật ký thực thi MCP vào bảng audit_events với reason_code chuẩn hóa."""
    try:
        with db() as conn:
            conn.execute(
                """INSERT INTO audit_events(
                       id, actor_user_id, actor_label, action, resource_type, resource_id,
                       target_label, category, decision, reason_code, created_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    uid(),
                    actor_user_id,
                    actor_label[:190],
                    action[:64],
                    resource_type[:64],
                    (resource_id or "")[:64] or None,
                    target_label[:190],
                    "mcp",
                    decision[:32],
                    reason_code[:64],
                    now_utc(),
                ),
            )
    except Exception as exc:
        logger.warning("Không thể ghi MCP audit log: %s", exc)


class JsonRpcRequest(BaseModel):
    jsonrpc: str = Field(default="2.0")
    id: Any = None
    method: str
    params: dict[str, Any] = Field(default_factory=dict)


@router.get("/info")
def get_mcp_info(
    dispatcher: McpDispatcher = Depends(get_dispatcher),
    user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> dict[str, Any]:
    """Lấy thông tin tổng quan, capabilities, phân quyền RBAC và DB snapshot của CodeMind MCP."""
    current_role = _normalize_role(user)
    actor_name = _actor_label_for_user(user) if user else "Anonymous"

    enriched_tools: list[dict[str, Any]] = []
    for name, tool in dispatcher.tools.items():
        policy = MCP_TOOL_POLICIES.get(
            name,
            {
                "access_mode": "read",
                "category": "general",
                "allowed_roles": ["student", "instructor", "admin"],
                "enforces_h2": False,
            },
        )
        permitted = (user is not None) and (current_role in policy["allowed_roles"])
        enriched_tools.append(
            {
                **tool,
                "access_mode": policy["access_mode"],
                "category": policy["category"],
                "allowed_roles": policy["allowed_roles"],
                "enforces_h2": policy["enforces_h2"],
                "permitted": permitted,
            }
        )

    database_snapshot: dict[str, Any] = {
        "engine": "MySQL 8.0 Live",
        "projects_count": 0,
        "tasks_count": 0,
        "commits_count": 0,
        "defense_sessions_count": 0,
        "sample_project_id": "prj-codemind",
        "sample_h2_task_id": "task-5",
        "sample_h2_task_code": None,
        "sample_h2_parent_code": None,
        "sample_student_id": "usr-sv-02",
        "sample_defense_session_id": None,
    }
    try:
        with db() as conn:
            database_snapshot["projects_count"] = conn.execute(
                "SELECT COUNT(*) AS c FROM engineering_projects"
            ).fetchone()["c"]
            database_snapshot["tasks_count"] = conn.execute(
                "SELECT COUNT(*) AS c FROM engineering_tasks"
            ).fetchone()["c"]
            database_snapshot["commits_count"] = conn.execute(
                "SELECT COUNT(*) AS c FROM git_commits"
            ).fetchone()["c"]
            database_snapshot["defense_sessions_count"] = conn.execute(
                "SELECT COUNT(*) AS c FROM defense_sessions"
            ).fetchone()["c"]

            from app.mcp.tools import _mcp_can_read_project

            all_proj_rows = conn.execute(
                "SELECT * FROM engineering_projects ORDER BY (id = 'prj-codemind') DESC, created_at DESC"
            ).fetchall()
            visible_proj_ids = (
                [p["id"] for p in all_proj_rows if _mcp_can_read_project(user, p)]
                if user
                else [p["id"] for p in all_proj_rows]
            )
            if visible_proj_ids:
                database_snapshot["sample_project_id"] = visible_proj_ids[0]
                ph = ",".join("?" for _ in visible_proj_ids)
                h2_row = conn.execute(
                    f"""SELECT t.id, t.code, p.code AS parent_code
                        FROM engineering_tasks t
                        JOIN engineering_tasks p ON p.id = t.depends_on AND p.project_id = t.project_id
                        JOIN engineering_projects ep ON ep.id = t.project_id
                        WHERE t.project_id IN ({ph})
                          AND LOWER(COALESCE(ep.status, 'active')) NOT IN ('delivered', 'done', 'completed')
                          AND COALESCE(ep.is_frozen, 0) = 0
                          AND t.column_id NOT IN ('done', 'verified')
                          AND p.column_id NOT IN ('done', 'verified')
                        ORDER BY (t.id = 'task-5') DESC, t.position_order ASC
                        LIMIT 1""",
                    tuple(visible_proj_ids),
                ).fetchone()
                if not h2_row:
                    h2_row = conn.execute(
                        f"""SELECT t.id, t.code, p.code AS parent_code
                            FROM engineering_tasks t
                            LEFT JOIN engineering_tasks p ON p.id = t.depends_on AND p.project_id = t.project_id
                            WHERE t.project_id IN ({ph})
                              AND t.depends_on IS NOT NULL AND t.depends_on != ''
                            ORDER BY (t.id = 'task-5') DESC, t.position_order ASC
                            LIMIT 1""",
                        tuple(visible_proj_ids),
                    ).fetchone()
            else:
                h2_row = None
            if h2_row:
                database_snapshot["sample_h2_task_id"] = h2_row["id"]
                database_snapshot["sample_h2_task_code"] = h2_row["code"]
                database_snapshot["sample_h2_parent_code"] = h2_row["parent_code"]

            if user and current_role == "student":
                database_snapshot["sample_student_id"] = user["id"]
            else:
                stu_row = conn.execute(
                    "SELECT id FROM users WHERE role = 'student' ORDER BY (id = 'usr-sv-02') DESC, id ASC LIMIT 1"
                ).fetchone()
                if stu_row:
                    database_snapshot["sample_student_id"] = stu_row["id"]

            def_row = conn.execute(
                "SELECT id FROM defense_sessions ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
            if def_row:
                database_snapshot["sample_defense_session_id"] = def_row["id"]
    except Exception as exc:
        logger.warning("Không thể đọc live DB snapshot cho /v1/mcp/info: %s", exc)

    return {
        "server": {
            "name": "codemind-mcp-server",
            "version": "1.0.0",
            "transport": ["stdio", "http-rpc"],
            "protocol_version": "2024-11-05",
        },
        "database": database_snapshot,
        "rbac": {
            "authenticated": user is not None,
            "current_role": current_role,
            "actor_name": actor_name,
            "write_requires_auth": True,
            "council_only_tools": [
                name for name, pol in MCP_TOOL_POLICIES.items() if pol["allowed_roles"] == ["instructor", "admin"]
            ],
        },
        "tools_count": len(enriched_tools),
        "tools": enriched_tools,
        "resources_count": len(dispatcher.resources),
        "resources": list(dispatcher.resources.values()),
        "prompts_count": len(dispatcher.prompts),
        "prompts": list(dispatcher.prompts.values()),
    }


@router.get("/logs")
def get_mcp_logs(
    limit: int = Query(default=40, ge=1, le=100),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Truy vấn lịch sử các lượt thực thi MCP & quyết định RBAC / H2 Guard."""
    clamped = max(1, min(int(limit), 100))
    with db() as conn:
        rows = conn.execute(
            """SELECT id, actor_user_id, actor_label, action, resource_type, resource_id,
                      target_label, category, decision, reason_code, created_at
               FROM audit_events
               WHERE category = 'mcp'
               ORDER BY created_at DESC
               LIMIT ?""",
            (clamped,),
        ).fetchall()
    logs = [row_dict(r) for r in rows]
    return {"count": len(logs), "logs": logs}


@router.post("/rpc")
def handle_json_rpc(
    payload: JsonRpcRequest,
    dispatcher: McpDispatcher = Depends(get_dispatcher),
    user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> dict[str, Any]:
    """Thực thi một payload JSON-RPC 2.0 của giao thức Model Context Protocol với RBAC Guard."""
    t0 = time.perf_counter()
    msg = payload.model_dump()
    method = str(msg.get("method") or "")
    params = dict(msg.get("params") or {})
    user_role = _normalize_role(user)
    actor_name = _actor_label_for_user(user)
    actor_user_id = user.get("id") if user else None

    if method in ("tools/call", "resources/read", "prompts/get") and user is None:
        res_id = str(params.get("name") or params.get("uri") or method).strip()
        _log_mcp_event(
            actor_user_id=None,
            actor_label="Anonymous Client",
            action=f"mcp:{res_id}",
            resource_type="mcp_tool" if method == "tools/call" else "mcp_resource",
            resource_id=res_id,
            target_label=f"Chặn chưa xác thực · {res_id}",
            decision="deny",
            reason_code="auth_required",
        )
        return {
            "jsonrpc": "2.0",
            "id": payload.id,
            "error": {
                "code": -32001,
                "message": f"Yêu cầu đăng nhập Bearer Token hợp lệ để gọi MCP '{res_id}'.",
                "data": {"auth_required": True, "method": method, "target": res_id},
            },
        }

    if method == "tools/call":
        tool_name = str(params.get("name") or "").strip()
        policy = MCP_TOOL_POLICIES.get(tool_name)

        if policy and user_role not in policy["allowed_roles"]:
            _log_mcp_event(
                actor_user_id=actor_user_id,
                actor_label=actor_name,
                action=f"mcp:{tool_name}",
                resource_type="mcp_tool",
                resource_id=tool_name,
                target_label=f"RBAC chặn ({user_role}) · {tool_name}",
                decision="deny",
                reason_code="rbac_denied",
            )
            return {
                "jsonrpc": "2.0",
                "id": payload.id,
                "error": {
                    "code": -32003,
                    "message": (
                        f"RBAC Guard từ chối: Vai trò '{user_role}' không có quyền gọi tool "
                        f"'{tool_name}' (yêu cầu: {', '.join(policy['allowed_roles'])})."
                    ),
                    "data": {
                        "rbac_denied": True,
                        "tool": tool_name,
                        "current_role": user_role,
                        "allowed_roles": policy["allowed_roles"],
                    },
                },
            }

        args = dict(params.get("arguments") or {})
        args["_caller"] = user
        if tool_name in ("create_kanban_task", "move_kanban_task"):
            if not str(args.get("actor_name") or "").strip() or args.get("actor_name") == "MCP Agent":
                args["actor_name"] = actor_name
        elif tool_name == "submit_ai_defense_audit":
            if not str(args.get("auditor_name") or "").strip() or args.get("auditor_name") == "AI Defense Council":
                args["auditor_name"] = actor_name
        params["arguments"] = args
        msg["params"] = params

    resp = dispatcher.handle_request(msg)
    duration_ms = round((time.perf_counter() - t0) * 1000, 1)

    if resp is None:
        return {"jsonrpc": "2.0", "result": None}

    if method == "tools/call":
        tool_name = str(params.get("name") or "")
        if "error" in resp:
            _log_mcp_event(
                actor_user_id=actor_user_id,
                actor_label=actor_name,
                action=f"mcp:{tool_name}",
                resource_type="mcp_tool",
                resource_id=tool_name,
                target_label=f"Lỗi RPC · {tool_name} ({duration_ms}ms)",
                decision="deny",
                reason_code="tool_error",
            )
        else:
            result_obj = resp.get("result") or {}
            is_err = bool(result_obj.get("isError"))
            content_list = result_obj.get("content") or []
            first_text = str(content_list[0].get("text") or "") if content_list else ""
            if is_err and "Ràng buộc H2" in first_text:
                _log_mcp_event(
                    actor_user_id=actor_user_id,
                    actor_label=actor_name,
                    action=f"mcp:{tool_name}",
                    resource_type="mcp_tool",
                    resource_id=tool_name,
                    target_label=f"Chặn H2 · {tool_name} ({duration_ms}ms)",
                    decision="deny",
                    reason_code="h2_blocked",
                )
            elif is_err:
                _log_mcp_event(
                    actor_user_id=actor_user_id,
                    actor_label=actor_name,
                    action=f"mcp:{tool_name}",
                    resource_type="mcp_tool",
                    resource_id=tool_name,
                    target_label=f"Lỗi thực thi · {tool_name} ({duration_ms}ms)",
                    decision="deny",
                    reason_code="tool_error",
                )
            else:
                _log_mcp_event(
                    actor_user_id=actor_user_id,
                    actor_label=actor_name,
                    action=f"mcp:{tool_name}",
                    resource_type="mcp_tool",
                    resource_id=tool_name,
                    target_label=f"{tool_name} ({duration_ms}ms)",
                    decision="allow",
                    reason_code="mcp_ok",
                )
    elif method == "resources/read":
        uri = str(params.get("uri") or "")
        has_err = "error" in resp
        _log_mcp_event(
            actor_user_id=actor_user_id,
            actor_label=actor_name,
            action="mcp:resources/read",
            resource_type="mcp_resource",
            resource_id=uri,
            target_label=f"{'Lỗi ' if has_err else ''}{uri} ({duration_ms}ms)",
            decision="deny" if has_err else "allow",
            reason_code="tool_error" if has_err else "mcp_ok",
        )
    elif method == "prompts/get":
        prompt_name = str(params.get("name") or "")
        has_err = "error" in resp
        _log_mcp_event(
            actor_user_id=actor_user_id,
            actor_label=actor_name,
            action="mcp:prompts/get",
            resource_type="mcp_prompt",
            resource_id=prompt_name,
            target_label=f"{'Lỗi ' if has_err else ''}{prompt_name} ({duration_ms}ms)",
            decision="deny" if has_err else "allow",
            reason_code="tool_error" if has_err else "mcp_ok",
        )

    return resp
