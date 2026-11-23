"""
Integration test suite for Branch 2 (Nhánh 2 — Engineering Projects, Task Management & Kanban Board SQLite).
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


def test_kanban_branch2_full_project_task_pipeline() -> None:
    init_db()
    client = TestClient(app)

    # 1. Reset demo DB via Admin & login Instructor + Outsider Student (hasib) + Leader Student (hoa.nb)
    r_adm = client.post("/v1/auth/login", json={"email": "admin@codemind.ai", "password": "hasib123"})
    assert r_adm.status_code == 200, r_adm.text
    adm_headers = {"Authorization": f"Bearer {r_adm.json()['access_token']}"}

    r_reset = client.post("/v1/admin/reset-demo", headers=adm_headers)
    assert r_reset.status_code == 200, r_reset.text

    r_ins = client.post(
        "/v1/demo/session",
        json={"demo_role": "instructor", "preferred_email": "lananh.gv@codemind.ai"},
    )
    assert r_ins.status_code == 201, r_ins.text
    ins_headers = {"Authorization": f"Bearer {r_ins.json()['access_token']}"}

    r_hasib = client.post(
        "/v1/demo/session",
        json={"demo_role": "student", "preferred_email": "hasib@gmail.com"},
    )
    assert r_hasib.status_code == 201, r_hasib.text
    hasib_headers = {"Authorization": f"Bearer {r_hasib.json()['access_token']}"}

    r_stu = client.post(
        "/v1/demo/session",
        json={"demo_role": "student", "preferred_email": "hoa.nb@student.edu.vn"},
    )
    assert r_stu.status_code == 201, r_stu.text
    stu_headers = {"Authorization": f"Bearer {r_stu.json()['access_token']}"}

    # Verify strict student scoping: hasib only sees prj-compiler (member, non-leader) and cannot patch/invite prj-codemind
    hasib_ws = client.get("/v1/kanban/workspace", headers=hasib_headers).json()
    assert [p["id"] for p in hasib_ws["projects"]] == ["prj-compiler"]
    hasib_compiler = hasib_ws["projects"][0]
    assert hasib_compiler["isMyProject"] is True
    assert hasib_compiler["isLead"] is False
    assert hasib_compiler["status"] == "delivered"
    assert client.patch(
        "/v1/kanban/workspace/projects/prj-codemind",
        json={"status": "delivered"},
        headers=hasib_headers,
    ).status_code == 403
    assert client.post(
        "/v1/kanban/projects/prj-codemind/invitations",
        json={"user_id": "usr-sv-02", "role_title": "Developer"},
        headers=hasib_headers,
    ).status_code == 403

    # 2. Fetch full Kanban workspace as Instructor -> 8 projects, verify seeded leaderUserId alignment
    ws_res = client.get("/v1/kanban/workspace", headers=ins_headers)
    assert ws_res.status_code == 200, ws_res.text
    ws = ws_res.json()
    projects = ws["projects"]
    assert len(projects) == 8
    by_id = {p["id"]: p for p in projects}
    assert by_id["prj-codemind"]["leaderUserId"] == "usr-sv-01"
    assert by_id["prj-security"]["leaderUserId"] == "usr-sv-01"
    assert by_id["prj-compiler"]["leaderUserId"] == "usr-sv-04"
    assert by_id["prj-devnet"]["leaderUserId"] == "usr-sv-03"
    assert by_id["prj-pintos"]["leaderUserId"] == "usr-sv-03"
    assert by_id["prj-faceattend"]["leaderUserId"] == "usr-sv-03"
    assert by_id["prj-ecommerce"]["leaderUserId"] == "usr-sv-08"

    codemind = by_id.get("prj-codemind")
    assert codemind is not None
    assert codemind["tasksTotal"] == 14
    initial_codemind_done = codemind["tasksDone"]

    compiler = by_id.get("prj-compiler")
    assert compiler is not None
    assert compiler["tasksDone"] == 4
    assert compiler["tasksTotal"] == 4
    assert compiler["progress"] == 1.0

    # 3. Create Project + toggle fav
    proj_create = client.post(
        "/v1/kanban/workspace/projects",
        json={
            "name": "AI Smart Grading Hub",
            "client": "SE-450 · Capstone",
            "course": "SE-450 · Distributed AI Grading",
            "kind": "AI ENGINE",
            "status": "planning",
            "fav": True,
            "due_date": "25/12/2026",
            "story_points": 450,
            "team_members": ["Nguyễn Bá Hòa", "Võ Nhật Huy"],
        },
        headers=stu_headers,
    )
    assert proj_create.status_code == 201, proj_create.text
    created_proj = proj_create.json()["project"]
    created_proj_id = created_proj["id"]
    assert created_proj["tasksTotal"] == 1
    assert created_proj["fav"] is True

    proj_patch = client.patch(
        f"/v1/kanban/workspace/projects/{created_proj_id}",
        json={"fav": False},
        headers=stu_headers,
    )
    assert proj_patch.status_code == 200, proj_patch.text
    assert proj_patch.json()["project"]["fav"] is False

    ws_after_proj = client.get("/v1/kanban/workspace", headers=stu_headers).json()
    assert any(p["id"] == created_proj_id and p["fav"] is False for p in ws_after_proj["projects"])

    # 4. Create task + update checklist/assignee on prj-codemind
    t_create = client.post(
        "/v1/kanban/workspace/projects/prj-codemind/tasks",
        json={
            "code": "TE-NEW01",
            "title": "Kiểm thử Kanban đồng bộ SQLite",
            "description": "Đảm bảo thay đổi lưu trực tiếp xuống CSDL.",
            "column": "ready",
            "priority": "high",
            "points": 5,
            "assignee": {"name": "Võ Nhật Huy", "avatar": "H", "role": "Frontend & AI Dev"},
            "checklist": [{"id": "chk-1", "text": "Tạo API workspace", "done": False}],
        },
        headers=stu_headers,
    )
    assert t_create.status_code == 201, t_create.text
    new_task = t_create.json()["task"]
    new_task_id = new_task["id"]

    t_patch = client.patch(
        f"/v1/kanban/workspace/tasks/{new_task_id}",
        json={
            "checklist": [{"id": "chk-1", "text": "Tạo API workspace", "done": True}],
            "assignee": {"name": "Nguyễn Bá Hòa", "avatar": "H", "role": "Leader & Architect"},
        },
        headers=stu_headers,
    )
    assert t_patch.status_code == 200, t_patch.text
    assert t_patch.json()["task"]["checklist"][0]["done"] is True
    assert t_patch.json()["task"]["assignee"]["name"] == "Nguyễn Bá Hòa"

    # 5. Hard Constraint H2 enforcement (task-5 dependsOn task-4; task-4 is in-progress)
    h2_move_blocked = client.post(
        "/v1/kanban/workspace/tasks/task-5/move",
        json={"target_column": "done", "target_index": 0},
        headers=stu_headers,
    )
    assert h2_move_blocked.status_code == 422, h2_move_blocked.text

    h2_patch_blocked = client.patch(
        "/v1/kanban/workspace/tasks/task-5",
        json={"column": "done"},
        headers=stu_headers,
    )
    assert h2_patch_blocked.status_code == 422, h2_patch_blocked.text

    # Resolve blocker task-4 -> done, then move task-5 -> done
    move_t4 = client.post(
        "/v1/kanban/workspace/tasks/task-4/move",
        json={"target_column": "done", "target_index": 0},
        headers=stu_headers,
    )
    assert move_t4.status_code == 200, move_t4.text
    assert move_t4.json()["xp_awarded"] == 15

    move_t5 = client.post(
        "/v1/kanban/workspace/tasks/task-5/move",
        json={"target_column": "done", "target_index": 0},
        headers=stu_headers,
    )
    assert move_t5.status_code == 200, move_t5.text
    assert move_t5.json()["xp_awarded"] == 15

    ws_after_h2 = client.get("/v1/kanban/workspace", headers=stu_headers).json()
    codemind_after = next(p for p in ws_after_h2["projects"] if p["id"] == "prj-codemind")
    assert codemind_after["tasksDone"] == initial_codemind_done + 2
    assert codemind_after["tasksTotal"] == 15

    # 6. AI WBS Generation + Batch Insert + Delete Task
    wbs_res = client.post(
        "/v1/kanban/workspace/ai-wbs",
        json={
            "feature_name": "Realtime Kanban Sync",
            "description": "Đồng bộ tức thời",
            "stack": "fullstack",
            "granularity": 3,
            "include_h2": True,
            "selected_members": [
                {"name": "Nguyễn Bá Hòa", "avatar": "H", "role": "Leader"},
                {"name": "Võ Nhật Huy", "avatar": "H", "role": "Dev"},
            ],
        },
        headers=stu_headers,
    )
    assert wbs_res.status_code == 200, wbs_res.text
    wbs_tasks = wbs_res.json()["tasks"]
    assert len(wbs_tasks) == 3
    assert wbs_tasks[1].get("dependsOn") == wbs_tasks[0]["id"]

    batch_res = client.post(
        "/v1/kanban/workspace/projects/prj-codemind/tasks/batch",
        json={"tasks": wbs_tasks},
        headers=stu_headers,
    )
    assert batch_res.status_code == 201, batch_res.text
    inserted_wbs = batch_res.json()["tasks"]
    assert len(inserted_wbs) == 3

    del_res = client.delete(f"/v1/kanban/workspace/tasks/{new_task_id}", headers=stu_headers)
    assert del_res.status_code == 200, del_res.text

    # 6b. Verify Staff-only is_frozen, frozen/delivered locks, and real leader RBAC
    assert client.patch(
        "/v1/kanban/workspace/projects/prj-codemind",
        json={"is_frozen": True},
        headers=stu_headers,
    ).status_code == 403

    freeze_res = client.patch(
        "/v1/kanban/workspace/projects/prj-codemind",
        json={"is_frozen": True},
        headers=ins_headers,
    )
    assert freeze_res.status_code == 200, freeze_res.text
    assert freeze_res.json()["project"]["isFrozen"] is True

    assert client.post(
        "/v1/kanban/workspace/projects/prj-codemind/tasks",
        json={"title": "Should be blocked when frozen", "column": "ready", "points": 2},
        headers=stu_headers,
    ).status_code == 403
    assert client.patch(
        "/v1/kanban/workspace/projects/prj-codemind",
        json={"status": "review"},
        headers=stu_headers,
    ).status_code == 403
    assert client.post(
        "/v1/kanban/projects/prj-codemind/invitations",
        json={"user_id": "usr-sv-02", "role_title": "Developer"},
        headers=stu_headers,
    ).status_code == 403

    unfreeze_res = client.patch(
        "/v1/kanban/workspace/projects/prj-codemind",
        json={"is_frozen": False},
        headers=ins_headers,
    )
    assert unfreeze_res.status_code == 200, unfreeze_res.text
    assert unfreeze_res.json()["project"]["isFrozen"] is False

    # Student leader cannot set status=delivered, but can toggle planning/active/review when unfrozen
    assert client.patch(
        "/v1/kanban/workspace/projects/prj-codemind",
        json={"status": "delivered"},
        headers=stu_headers,
    ).status_code == 403
    rev_res = client.patch(
        "/v1/kanban/workspace/projects/prj-codemind",
        json={"status": "review"},
        headers=stu_headers,
    )
    assert rev_res.status_code == 200, rev_res.text
    assert rev_res.json()["project"]["status"] == "review"
    act_res = client.patch(
        "/v1/kanban/workspace/projects/prj-codemind",
        json={"status": "active"},
        headers=stu_headers,
    )
    assert act_res.status_code == 200, act_res.text
    assert act_res.json()["project"]["status"] == "active"

    # Non-leader member (hasib on prj-compiler) is blocked from status/freeze/invite/task mutations
    assert client.patch(
        "/v1/kanban/workspace/projects/prj-compiler",
        json={"status": "active"},
        headers=hasib_headers,
    ).status_code == 403
    assert client.patch(
        "/v1/kanban/workspace/projects/prj-compiler",
        json={"is_frozen": True},
        headers=hasib_headers,
    ).status_code == 403
    assert client.post(
        "/v1/kanban/projects/prj-compiler/invitations",
        json={"user_id": "usr-sv-03", "role_title": "Developer"},
        headers=hasib_headers,
    ).status_code == 403
    assert client.post(
        "/v1/kanban/workspace/projects/prj-compiler/tasks",
        json={"title": "Blocked on delivered project", "column": "ready", "points": 2},
        headers=hasib_headers,
    ).status_code == 403

    # Real leader of delivered prj-compiler (Phan Đình Nghị) sees isLead=True but cannot modify delivered project
    r_nghi = client.post(
        "/v1/demo/session",
        json={"demo_role": "student", "preferred_email": "nghi.pd@student.edu.vn"},
    )
    assert r_nghi.status_code == 201, r_nghi.text
    nghi_headers = {"Authorization": f"Bearer {r_nghi.json()['access_token']}"}
    nghi_ws = client.get("/v1/kanban/workspace", headers=nghi_headers).json()
    nghi_compiler = next(p for p in nghi_ws["projects"] if p["id"] == "prj-compiler")
    assert nghi_compiler["isMyProject"] is True
    assert nghi_compiler["isLead"] is True
    assert client.patch(
        "/v1/kanban/workspace/projects/prj-compiler",
        json={"status": "active"},
        headers=nghi_headers,
    ).status_code == 403
    assert client.post(
        "/v1/kanban/projects/prj-compiler/invitations",
        json={"user_id": "usr-sv-03", "role_title": "Developer"},
        headers=nghi_headers,
    ).status_code == 403
    assert client.delete(
        "/v1/kanban/projects/prj-compiler/members/usr-sv-02",
        headers=nghi_headers,
    ).status_code == 403
    assert client.post(
        "/v1/kanban/workspace/projects/prj-compiler/tasks",
        json={"title": "Leader blocked on delivered project", "column": "ready", "points": 2},
        headers=nghi_headers,
    ).status_code == 403

    # 7. Cleanly restore demo DB state
    r_reset_final = client.post("/v1/admin/reset-demo", headers=adm_headers)
    assert r_reset_final.status_code == 200, r_reset_final.text
