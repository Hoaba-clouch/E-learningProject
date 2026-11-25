"""Integration & RBAC tests for CodeMind MCP HTTP JSON-RPC endpoints."""

from __future__ import annotations

import json
from fastapi.testclient import TestClient

from app.core.database import db, init_db, row_dict
from app.core.timezone import now_utc
from app.main import app


def test_mcp_http_info_rpc_rbac_and_logs() -> None:
    init_db()
    client = TestClient(app)

    # Record baseline MCP audit IDs so cleanup restores exact DB state
    with db() as conn:
        baseline_mcp_ids = {
            r["id"]
            for r in conn.execute("SELECT id FROM audit_events WHERE category = 'mcp'").fetchall()
        }

    # Authenticate Student & Instructor demo sessions
    r_stu = client.post(
        "/v1/demo/session",
        json={"demo_role": "student", "preferred_email": "hoa.nb@student.edu.vn"},
    )
    assert r_stu.status_code == 201, r_stu.text
    stu_headers = {"Authorization": f"Bearer {r_stu.json()['access_token']}"}

    r_ins = client.post(
        "/v1/demo/session",
        json={"demo_role": "instructor", "preferred_email": "lananh.gv@codemind.ai"},
    )
    assert r_ins.status_code == 201, r_ins.text
    ins_headers = {"Authorization": f"Bearer {r_ins.json()['access_token']}"}

    # 1. GET /v1/mcp/info returns 11 tools with policy metadata, live DB metrics & H2 sample, 3 resources, 2 prompts
    info_res = client.get("/v1/mcp/info", headers=stu_headers)
    assert info_res.status_code == 200, info_res.text
    info = info_res.json()
    assert info["tools_count"] == 11
    assert info["resources_count"] == 3
    assert info["prompts_count"] == 2
    assert info["database"]["engine"] == "MySQL 8.0 Live"
    assert info["database"]["projects_count"] > 0
    assert info["rbac"]["current_role"] == "student"

    tools_by_name = {t["name"]: t for t in info["tools"]}
    assert tools_by_name["list_projects"]["access_mode"] == "read"
    assert tools_by_name["move_kanban_task"]["access_mode"] == "write"
    assert tools_by_name["move_kanban_task"]["enforces_h2"] is True
    assert tools_by_name["submit_ai_defense_audit"]["access_mode"] == "write"
    assert tools_by_name["submit_ai_defense_audit"]["allowed_roles"] == ["instructor", "admin"]
    assert tools_by_name["submit_ai_defense_audit"]["permitted"] is False
    assert tools_by_name["move_kanban_task"]["permitted"] is True

    sample_project_id = info["database"]["sample_project_id"] or "prj-codemind"
    sample_h2_task_id = info["database"]["sample_h2_task_id"]
    sample_student_id = info["database"]["sample_student_id"] or "usr-sv-02"
    sample_def_id = info["database"]["sample_defense_session_id"]
    assert sample_h2_task_id, "Expected at least one seeded H2-dependent task in MySQL"

    # Snapshot or seed temporary defense session before instructor write test
    created_temp_def = False
    if sample_def_id:
        with db() as conn:
            def_row = conn.execute(
                "SELECT id, final_defense_score, status, updated_at FROM defense_sessions WHERE id = ?",
                (sample_def_id,),
            ).fetchone()
            assert def_row is not None
            orig_def = row_dict(def_row)
    else:
        sample_def_id = "def-mcp-test-01"
        created_temp_def = True
        now = now_utc()
        with db() as conn:
            conn.execute(
                """INSERT INTO defense_sessions(
                       id, user_id, project_id, class_id, round_number, status,
                       architecture_score, algorithm_score, production_score, final_defense_score,
                       transcript_json, created_at, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    sample_def_id,
                    sample_student_id,
                    sample_project_id,
                    "class-oop",
                    3,
                    "in_progress",
                    86,
                    82,
                    88,
                    85,
                    "[]",
                    now,
                    now,
                ),
            )
        orig_def = {}

    try:
        # 2. Unauthenticated tools/list succeeds; unauthenticated create_kanban_task returns -32001
        r_unauth_list = client.post(
            "/v1/mcp/rpc",
            json={"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}},
        )
        assert r_unauth_list.status_code == 200
        assert len(r_unauth_list.json()["result"]["tools"]) == 11

        r_unauth_write = client.post(
            "/v1/mcp/rpc",
            json={
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "create_kanban_task",
                    "arguments": {"project_id": sample_project_id, "title": "Should Fail"},
                },
            },
        )
        assert r_unauth_write.status_code == 200
        err_unauth = r_unauth_write.json()["error"]
        assert err_unauth["code"] == -32001
        assert err_unauth["data"]["auth_required"] is True

        # 3a. Student list_projects succeeds
        r_lp = client.post(
            "/v1/mcp/rpc",
            headers=stu_headers,
            json={
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {"name": "list_projects", "arguments": {"limit": 5}},
            },
        )
        assert r_lp.status_code == 200
        lp_payload = json.loads(r_lp.json()["result"]["content"][0]["text"])
        assert lp_payload["count"] > 0

        # 3b. Student get_student_analytics returns real radar_skills
        r_analytics = client.post(
            "/v1/mcp/rpc",
            headers=stu_headers,
            json={
                "jsonrpc": "2.0",
                "id": 4,
                "method": "tools/call",
                "params": {"name": "get_student_analytics", "arguments": {"user_id": sample_student_id}},
            },
        )
        assert r_analytics.status_code == 200
        assert r_analytics.json()["result"]["isError"] is False
        ana_data = json.loads(r_analytics.json()["result"]["content"][0]["text"])
        assert set(ana_data["profile"]["radar_skills"].keys()) == {
            "algorithm",
            "debugging",
            "cleancode",
            "teamwork",
            "defense",
        }

        # 3c. Student H2 hard constraint block on dependent task
        r_h2 = client.post(
            "/v1/mcp/rpc",
            headers=stu_headers,
            json={
                "jsonrpc": "2.0",
                "id": 5,
                "method": "tools/call",
                "params": {
                    "name": "move_kanban_task",
                    "arguments": {"task_id": sample_h2_task_id, "target_column": "done"},
                },
            },
        )
        assert r_h2.status_code == 200
        h2_res = r_h2.json()["result"]
        assert h2_res["isError"] is True
        assert "Vi phạm Ràng buộc H2" in h2_res["content"][0]["text"]

        # 3d. Student calling submit_ai_defense_audit is blocked by RBAC Guard (-32003)
        r_rbac_deny = client.post(
            "/v1/mcp/rpc",
            headers=stu_headers,
            json={
                "jsonrpc": "2.0",
                "id": 6,
                "method": "tools/call",
                "params": {
                    "name": "submit_ai_defense_audit",
                    "arguments": {
                        "session_id": sample_def_id,
                        "verdict": "approved",
                        "notes": "Student self-approval attempt",
                    },
                },
            },
        )
        assert r_rbac_deny.status_code == 200
        err_rbac = r_rbac_deny.json()["error"]
        assert err_rbac["code"] == -32003
        assert err_rbac["data"]["rbac_denied"] is True

        # 4. Instructor calling submit_ai_defense_audit succeeds
        r_ins_audit = client.post(
            "/v1/mcp/rpc",
            headers=ins_headers,
            json={
                "jsonrpc": "2.0",
                "id": 7,
                "method": "tools/call",
                "params": {
                    "name": "submit_ai_defense_audit",
                    "arguments": {
                        "session_id": sample_def_id,
                        "verdict": "approved",
                        "notes": "Verified by MCP test",
                        "score_adjustment": 1,
                    },
                },
            },
        )
        assert r_ins_audit.status_code == 200
        ins_res = r_ins_audit.json()["result"]
        assert ins_res["isError"] is False
        audit_out = json.loads(ins_res["content"][0]["text"])
        assert audit_out["success"] is True

        # 5. resources/read & prompts/get
        for uri in (
            "codemind://system/stats",
            "codemind://projects",
            f"codemind://projects/{sample_project_id}",
        ):
            r_res = client.post(
                "/v1/mcp/rpc",
                headers=stu_headers,
                json={"jsonrpc": "2.0", "id": 8, "method": "resources/read", "params": {"uri": uri}},
            )
            assert r_res.status_code == 200
            contents = r_res.json()["result"]["contents"]
            assert len(contents) == 1
            parsed = json.loads(contents[0]["text"])
            assert parsed is not None

        for p_name, p_args in (
            ("kanban_sprint_summary", {"project_name": "PRJ-CODEMIND", "sprint_name": "Sprint 1"}),
            ("ai_code_defense_prep", {"student_name": "Nguyễn Văn A", "topic": "Mini C++ Compiler"}),
        ):
            r_prompt = client.post(
                "/v1/mcp/rpc",
                headers=stu_headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 9,
                    "method": "prompts/get",
                    "params": {"name": p_name, "arguments": p_args},
                },
            )
            assert r_prompt.status_code == 200
            msgs = r_prompt.json()["result"]["messages"]
            assert len(msgs) >= 1 and len(msgs[0]["content"]["text"]) > 20

        # 6. GET /v1/mcp/logs reflects h2_blocked and rbac_denied
        r_unauth_logs = client.get("/v1/mcp/logs")
        assert r_unauth_logs.status_code == 401

        r_logs = client.get("/v1/mcp/logs?limit=30", headers=ins_headers)
        assert r_logs.status_code == 200
        logs = r_logs.json()["logs"]
        reason_codes = {entry["reason_code"] for entry in logs}
        assert "h2_blocked" in reason_codes
        assert "rbac_denied" in reason_codes
        assert "mcp_ok" in reason_codes
    finally:
        # Restore defense session row and clean test audit logs
        with db() as conn:
            if created_temp_def:
                conn.execute("DELETE FROM defense_sessions WHERE id = ?", (sample_def_id,))
            else:
                conn.execute(
                    """UPDATE defense_sessions
                       SET final_defense_score = ?, status = ?, updated_at = ?
                       WHERE id = ?""",
                    (
                        orig_def["final_defense_score"],
                        orig_def["status"],
                        orig_def["updated_at"],
                        sample_def_id,
                    ),
                )
            rows = conn.execute("SELECT id FROM audit_events WHERE category = 'mcp'").fetchall()
            to_delete = [r["id"] for r in rows if r["id"] not in baseline_mcp_ids]
            for eid in to_delete:
                conn.execute("DELETE FROM audit_events WHERE id = ?", (eid,))
