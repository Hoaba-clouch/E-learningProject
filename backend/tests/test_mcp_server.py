"""Script kiểm thử toàn diện CodeMind MCP Server.

Kiểm tra:
1. Giao thức JSON-RPC 2.0 (initialize, ping, notifications)
2. Danh mục tools/list, resources/list, prompts/list
3. Thực thi 11 tools nghiệp vụ với MySQL thực tế
4. Kiểm tra nghiêm ngặt Ràng buộc H2 (Definition of Done & Dependencies)
5. Dọn dẹp dữ liệu kiểm thử
"""

from __future__ import annotations

import json
import sys
from typing import Any

from app.core.database import db
from app.mcp.server import create_dispatcher


def main() -> None:
    print("=" * 70)
    print("BẮT ĐẦU KIỂM THỬ CODEMIND MCP SERVER (MODEL CONTEXT PROTOCOL)")
    print("=" * 70)

    dispatcher = create_dispatcher()
    assert dispatcher is not None, "Dispatcher phải khởi tạo thành công"

    # 1. Initialize
    init_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test-client", "version": "1.0"},
        },
    }
    resp = dispatcher.handle_request(init_req)
    assert resp["result"]["protocolVersion"] == "2024-11-05"
    assert resp["result"]["serverInfo"]["name"] == "codemind-mcp-server"
    print("✓ [Pass] 1. Handshake 'initialize' thành công.")

    # 2. Ping
    ping_resp = dispatcher.handle_request({"jsonrpc": "2.0", "id": 2, "method": "ping", "params": {}})
    assert ping_resp["result"] == {}
    print("✓ [Pass] 2. Ping pong thành công.")

    # 3. Tools List
    tools_resp = dispatcher.handle_request({"jsonrpc": "2.0", "id": 3, "method": "tools/list", "params": {}})
    tools = tools_resp["result"]["tools"]
    tool_names = [t["name"] for t in tools]
    print(f"✓ [Pass] 3. tools/list trả về {len(tools)} tools: {tool_names}")
    assert len(tools) >= 11, "Phải có ít nhất 11 tools"

    # 4. Resources List & Read
    res_list = dispatcher.handle_request({"jsonrpc": "2.0", "id": 4, "method": "resources/list", "params": {}})
    assert len(res_list["result"]["resources"]) >= 3
    print(f"✓ [Pass] 4a. resources/list trả về {len(res_list['result']['resources'])} resources.")

    res_read = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 5,
        "method": "resources/read",
        "params": {"uri": "codemind://system/stats"},
    })
    stats_text = res_read["result"]["contents"][0]["text"]
    stats_data = json.loads(stats_text)
    print(f"✓ [Pass] 4b. resources/read 'codemind://system/stats': {stats_data['metrics']}")
    assert stats_data["metrics"]["total_projects"] > 0

    # 5. Tool Call: list_projects
    p_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 6,
        "method": "tools/call",
        "params": {"name": "list_projects", "arguments": {"limit": 5}},
    })
    p_data = json.loads(p_resp["result"]["content"][0]["text"])
    assert p_data["count"] > 0
    first_proj_id = p_data["projects"][0]["id"]
    print(f"✓ [Pass] 5. Tool 'list_projects': tìm thấy {p_data['count']} projects (First: {first_proj_id})")

    # 6. Tool Call: get_project_detail
    detail_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 7,
        "method": "tools/call",
        "params": {"name": "get_project_detail", "arguments": {"project_id": first_proj_id}},
    })
    detail_data = json.loads(detail_resp["result"]["content"][0]["text"])
    assert detail_data["project"]["id"] == first_proj_id
    print(f"✓ [Pass] 6. Tool 'get_project_detail': Code={detail_data['project']['code']}, Total tasks={detail_data['tasks_summary']['total']}")

    # 7. Tool Call: list_kanban_tasks
    tasks_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 8,
        "method": "tools/call",
        "params": {"name": "list_kanban_tasks", "arguments": {"project_id": first_proj_id, "limit": 10}},
    })
    tasks_data = json.loads(tasks_resp["result"]["content"][0]["text"])
    print(f"✓ [Pass] 7. Tool 'list_kanban_tasks': trả về {tasks_data['count']} tasks")

    # 8. Tool Call: create_kanban_task
    test_task_title = "[MCP-TEST] Triển khai Module Kiểm thử Tự động"
    create_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 9,
        "method": "tools/call",
        "params": {
            "name": "create_kanban_task",
            "arguments": {
                "project_id": first_proj_id,
                "title": test_task_title,
                "points": 5,
                "priority": "high",
                "estimate_hours": 6.0,
                "actor_name": "Antigravity MCP Agent",
            },
        },
    })
    create_data = json.loads(create_resp["result"]["content"][0]["text"])
    assert create_data["success"] is True
    created_task = create_data["task"]
    test_task_id = created_task["id"]
    test_task_code = created_task["code"]
    print(f"✓ [Pass] 8. Tool 'create_kanban_task': Đã tạo task {test_task_code} (ID: {test_task_id})")

    # 9. Tool Call: move_kanban_task (Hợp lệ: từ backlog -> in-progress)
    move_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 10,
        "method": "tools/call",
        "params": {
            "name": "move_kanban_task",
            "arguments": {
                "task_id": test_task_id,
                "target_column": "in-progress",
                "actor_name": "Antigravity MCP Agent",
            },
        },
    })
    move_data = json.loads(move_resp["result"]["content"][0]["text"])
    assert move_data["success"] is True
    assert move_data["current_column"] == "in-progress"
    print(f"✓ [Pass] 9. Tool 'move_kanban_task': Di chuyển thành công {test_task_code} sang 'in-progress'.")

    # 10. Kiểm tra Ràng buộc H2 (Hard Constraint):
    # Tạo task con phụ thuộc vào test_task_id (chưa done). Thử chuyển task con sang 'done' -> phải bị chặn!
    child_task_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 11,
        "method": "tools/call",
        "params": {
            "name": "create_kanban_task",
            "arguments": {
                "project_id": first_proj_id,
                "title": "[MCP-TEST] Task con có phụ thuộc H2",
                "points": 3,
                "depends_on": test_task_id,
                "column_id": "backlog",
            },
        },
    })
    child_data = json.loads(child_task_resp["result"]["content"][0]["text"])
    child_id = child_data["task"]["id"]

    # Cố tình chuyển child sang 'done' khi cha đang 'in-progress'
    invalid_move_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 12,
        "method": "tools/call",
        "params": {
            "name": "move_kanban_task",
            "arguments": {
                "task_id": child_id,
                "target_column": "done",
            },
        },
    })
    err_text = invalid_move_resp["result"]["content"][0]["text"]
    assert "Vi phạm Ràng buộc H2" in err_text or invalid_move_resp["result"]["isError"] is True
    print(f"✓ [Pass] 10. Ràng buộc H2 được bảo vệ nghiêm ngặt: {err_text}")

    # 11. Tool Call: list_git_commits
    commits_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 13,
        "method": "tools/call",
        "params": {"name": "list_git_commits", "arguments": {"project_id": first_proj_id, "limit": 5}},
    })
    commits_data = json.loads(commits_resp["result"]["content"][0]["text"])
    print(f"✓ [Pass] 11. Tool 'list_git_commits': tìm thấy {commits_data['count']} commits.")

    # 12. Tool Call: list_pull_requests
    prs_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 14,
        "method": "tools/call",
        "params": {"name": "list_pull_requests", "arguments": {"project_id": first_proj_id, "limit": 5}},
    })
    prs_data = json.loads(prs_resp["result"]["content"][0]["text"])
    print(f"✓ [Pass] 12. Tool 'list_pull_requests': tìm thấy {prs_data['count']} PRs.")

    # 13. Tool Call: list_academic_schedules
    sched_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 15,
        "method": "tools/call",
        "params": {"name": "list_academic_schedules", "arguments": {"limit": 5}},
    })
    sched_data = json.loads(sched_resp["result"]["content"][0]["text"])
    print(f"✓ [Pass] 13. Tool 'list_academic_schedules': tìm thấy {sched_data['count']} lịch.")

    # 14. Tool Call: list_defense_sessions
    def_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 16,
        "method": "tools/call",
        "params": {"name": "list_defense_sessions", "arguments": {"limit": 5}},
    })
    def_data = json.loads(def_resp["result"]["content"][0]["text"])
    print(f"✓ [Pass] 14. Tool 'list_defense_sessions': tìm thấy {def_data['count']} phiên phản biện.")

    # 15. Tool Call: get_student_analytics
    stu_resp = dispatcher.handle_request({
        "jsonrpc": "2.0",
        "id": 17,
        "method": "tools/call",
        "params": {"name": "get_student_analytics", "arguments": {"user_id": "student-demo"}},
    })
    stu_data = json.loads(stu_resp["result"]["content"][0]["text"])
    print(f"✓ [Pass] 15. Tool 'get_student_analytics': Sinh viên={stu_data['user']['full_name']}, XP={stu_data['profile']['exp_points']}, Radar={stu_data['profile']['radar_skills']}")

    # 16. Dọn dẹp dữ liệu kiểm thử
    with db() as conn:
        conn.execute("DELETE FROM engineering_tasks WHERE id IN (?, ?)", (test_task_id, child_id))
    print("✓ [Pass] 16. Dọn dẹp 2 tasks kiểm thử an toàn.")

    print("=" * 70)
    print("TẤT CẢ 16/16 BƯỚC KIỂM THỬ MCP SERVER ĐỀU THÀNH CÔNG 100%!")
    print("=" * 70)


if __name__ == "__main__":
    main()
