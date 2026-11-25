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


def test_team_members_role_scoping() -> None:
    init_db()
    client = TestClient(app)

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

    r_empty = client.post(
        "/v1/demo/session",
        json={"demo_role": "student"},
    )
    assert r_empty.status_code == 201, r_empty.text
    empty_headers = {"Authorization": f"Bearer {r_empty.json()['access_token']}"}

    # 1. Student with 1 project (hasib -> prj-compiler): teammates + GVHD Cô Trần Thị B + GVPB Thầy Trần Minh Quân
    stu_team_res = client.get("/v1/team/members", headers=hasib_headers)
    assert stu_team_res.status_code == 200, stu_team_res.text
    stu_team = stu_team_res.json()
    assert stu_team["scopeRole"] == "student"
    assert stu_team["scopedProjectsCount"] == 1
    assert stu_team["total"] == 5
    stu_by_id = {m["id"]: m for m in stu_team["members"]}
    assert set(stu_by_id.keys()) == {"usr-gv-01", "usr-gv-03", "usr-sv-04", "usr-sv-01", "usr-sv-02"}
    for excluded in ("usr-sv-03", "usr-sv-05", "usr-sv-06", "usr-sv-07", "usr-sv-08", "usr-gv-02"):
        assert excluded not in stu_by_id
    assert [m["id"] for m in stu_team["members"] if m["isLead"]] == ["usr-sv-04"]
    assert stu_by_id["usr-gv-01"]["isAdvisor"] is True
    assert stu_by_id["usr-gv-01"]["isLead"] is False
    assert [p["id"] for p in stu_by_id["usr-gv-01"]["projects"]] == ["prj-compiler"]

    hasib_nav = client.get("/v1/navigation/counts", headers=hasib_headers)
    assert hasib_nav.status_code == 200, hasib_nav.text
    assert hasib_nav.json()["team_members"] == 5

    # Student cannot change status of users outside their team (or even teammates other than self)
    assert (
        client.patch(
            "/v1/team/members/usr-sv-08/status",
            json={"status": "remote"},
            headers=hasib_headers,
        ).status_code
        == 403
    )

    # 2. Student with 0 seeded projects (student-demo): empty team list & nav badge = 0
    empty_team_res = client.get("/v1/team/members", headers=empty_headers)
    assert empty_team_res.status_code == 200, empty_team_res.text
    assert empty_team_res.json()["members"] == []
    assert empty_team_res.json()["total"] == 0
    assert empty_team_res.json()["scopedProjectsCount"] == 0
    assert client.get("/v1/navigation/counts", headers=empty_headers).json()["team_members"] == 0

    # 3. Instructor (usr-gv-01): guided project students + active colleague instructors (usr-gv-01..05)
    ins_team_res = client.get("/v1/team/members", headers=ins_headers)
    assert ins_team_res.status_code == 200, ins_team_res.text
    ins_team = ins_team_res.json()
    assert ins_team["scopeRole"] == "instructor"
    assert ins_team["scopedProjectsCount"] == 3
    assert ins_team["total"] == 9
    ins_by_id = {m["id"]: m for m in ins_team["members"]}
    assert set(ins_by_id.keys()) == {
        "usr-gv-01",
        "usr-gv-02",
        "usr-gv-03",
        "usr-gv-04",
        "usr-gv-05",
        "usr-sv-01",
        "usr-sv-02",
        "usr-sv-03",
        "usr-sv-04",
    }
    for excluded in ("usr-sv-08", "usr-sv-07", "usr-sv-05", "usr-sv-06"):
        assert excluded not in ins_by_id
    assert ins_by_id["usr-gv-01"]["isAdvisor"] is True
    assert ins_by_id["usr-gv-02"]["isAdvisor"] is True
    assert ins_by_id["usr-gv-01"]["isLead"] is False
    assert ins_by_id["usr-gv-02"]["isLead"] is False
    assert {mid for mid, m in ins_by_id.items() if m["isLead"]} == {"usr-sv-01", "usr-sv-03", "usr-sv-04"}
    assert ins_by_id["usr-sv-02"]["isLead"] is False
    assert client.get("/v1/navigation/counts", headers=ins_headers).json()["team_members"] == 9

    # 4. Admin: all active instructors & students, excluding pending (usr-sv-05) & suspended (usr-sv-06)
    adm_team_res = client.get("/v1/team/members", headers=adm_headers)
    assert adm_team_res.status_code == 200, adm_team_res.text
    adm_team = adm_team_res.json()
    assert adm_team["scopeRole"] == "admin"
    adm_by_id = {m["id"]: m for m in adm_team["members"]}
    assert {
        "usr-gv-01",
        "usr-gv-02",
        "usr-gv-03",
        "usr-gv-04",
        "usr-gv-05",
        "usr-sv-01",
        "usr-sv-02",
        "usr-sv-03",
        "usr-sv-04",
        "usr-sv-07",
        "usr-sv-08",
    }.issubset(set(adm_by_id.keys()))
    assert "usr-sv-05" not in adm_by_id
    assert "usr-sv-06" not in adm_by_id
    assert client.get("/v1/navigation/counts", headers=adm_headers).json()["team_members"] == adm_team["total"]


def test_user_avatar_upload_and_profile_update() -> None:
    init_db()
    client = TestClient(app)

    r_adm = client.post("/v1/auth/login", json={"email": "admin@codemind.ai", "password": "hasib123"})
    assert r_adm.status_code == 200, r_adm.text
    adm_headers = {"Authorization": f"Bearer {r_adm.json()['access_token']}"}
    assert client.post("/v1/admin/reset-demo", headers=adm_headers).status_code == 200

    r_stu = client.post(
        "/v1/demo/session",
        json={"demo_role": "student", "preferred_email": "hasib@gmail.com"},
    )
    assert r_stu.status_code == 201, r_stu.text
    stu_headers = {"Authorization": f"Bearer {r_stu.json()['access_token']}"}

    valid_png = (
        "data:image/png;base64,"
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2dIAAAAASUVORK5CYII="
    )

    # 1. Upload valid PNG avatar
    up_res = client.post(
        "/v1/users/me/avatar",
        json={"avatar_data": valid_png},
        headers=stu_headers,
    )
    assert up_res.status_code == 200, up_res.text
    assert up_res.json()["avatar_url"] == valid_png

    # 2. Propagates to /users/me, /student/learning-overview, and /team/members
    me_res = client.get("/v1/users/me", headers=stu_headers)
    assert me_res.status_code == 200, me_res.text
    assert me_res.json()["avatar_url"] == valid_png

    ov_res = client.get("/v1/student/learning-overview", headers=stu_headers)
    assert ov_res.status_code == 200, ov_res.text
    assert ov_res.json()["user"]["avatar_url"] == valid_png

    team_res = client.get("/v1/team/members", headers=stu_headers)
    assert team_res.status_code == 200, team_res.text
    me_team = next(m for m in team_res.json()["members"] if m["id"] == "usr-sv-02")
    assert me_team["avatarUrl"] == valid_png

    # 3. Reject SVG / malformed magic bytes with 422
    svg_res = client.post(
        "/v1/users/me/avatar",
        json={"avatar_data": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=="},
        headers=stu_headers,
    )
    assert svg_res.status_code == 422

    fake_png_res = client.post(
        "/v1/users/me/avatar",
        json={"avatar_data": "data:image/png;base64,aGVsbG8td29ybGQtbm90LWEtcG5nLWZpbGUtYnl0ZXM="},
        headers=stu_headers,
    )
    assert fake_png_res.status_code == 422

    # 4. Update display name & restore
    patch_res = client.patch(
        "/v1/users/me",
        json={"full_name": "Nguyễn Văn A (Updated)"},
        headers=stu_headers,
    )
    assert patch_res.status_code == 200, patch_res.text
    assert patch_res.json()["full_name"] == "Nguyễn Văn A (Updated)"
    assert client.get("/v1/users/me", headers=stu_headers).json()["full_name"] == "Nguyễn Văn A (Updated)"

    restore_res = client.patch(
        "/v1/users/me",
        json={"full_name": "Nguyễn Văn A"},
        headers=stu_headers,
    )
    assert restore_res.status_code == 200

    # 5. Delete avatar cleanly
    del_res = client.delete("/v1/users/me/avatar", headers=stu_headers)
    assert del_res.status_code == 200, del_res.text
    assert del_res.json()["avatar_url"] == ""
    assert client.get("/v1/users/me", headers=stu_headers).json()["avatar_url"] == ""
    team_after = client.get("/v1/team/members", headers=stu_headers).json()["members"]
    me_team_after = next(m for m in team_after if m["id"] == "usr-sv-02")
    assert me_team_after["avatarUrl"] == ""


def test_shared_profile_sync_with_team_person_detail() -> None:
    init_db()
    client = TestClient(app)

    r_adm = client.post("/v1/auth/login", json={"email": "admin@codemind.ai", "password": "hasib123"})
    assert r_adm.status_code == 200, r_adm.text
    adm_headers = {"Authorization": f"Bearer {r_adm.json()['access_token']}"}
    assert client.post("/v1/admin/reset-demo", headers=adm_headers).status_code == 200

    # 1. Instructor seeded profile + taught_courses + guided_project_ids
    r_ins = client.post(
        "/v1/demo/session",
        json={"demo_role": "instructor", "preferred_email": "lananh.gv@codemind.ai"},
    )
    assert r_ins.status_code == 201, r_ins.text
    ins_headers = {"Authorization": f"Bearer {r_ins.json()['access_token']}"}

    ins_me_res = client.get("/v1/users/me", headers=ins_headers)
    assert ins_me_res.status_code == 200, ins_me_res.text
    ins_me = ins_me_res.json()
    assert ins_me["headline"]
    assert ins_me["bio"]
    assert ins_me["department"]
    assert ins_me["office_location"]
    assert isinstance(ins_me["skills"], list) and len(ins_me["skills"]) >= 3
    taught_codes = {c["code"] for c in ins_me["taught_courses"]}
    assert {"CS201", "CS202", "CS210", "CS499"}.issubset(taught_codes)
    assert set(ins_me["guided_project_ids"]) == {"prj-codemind", "prj-compiler", "prj-devnet"}

    # Reject invalid URL
    bad_url = client.patch(
        "/v1/users/me",
        json={"website_url": "javascript:alert(1)"},
        headers=ins_headers,
    )
    assert bad_url.status_code == 422

    # 2. Update Instructor profile via PATCH /v1/users/me and verify 1-to-1 propagation
    ins_patch = {
        "headline": "Giảng viên Chính · Kiến trúc Phần mềm & AST",
        "bio": "Hướng dẫn chuyên sâu về Clean Architecture và Hội đồng phản biện AI.",
        "department": "Khoa CNTT · Bộ môn Kỹ nghệ Phần mềm",
        "office_location": "Phòng Lab A3-205 · Tiếp SV: Thứ 2 & 4",
        "skills": ["System Design", "C++20", "Clean Architecture"],
        "github_url": "https://github.com/tran-thi-b-lab",
        "website_url": "https://codemind.edu.vn/gv/tran-thi-b",
        "phone": "0903 812 999",
    }
    p_res = client.patch("/v1/users/me", json=ins_patch, headers=ins_headers)
    assert p_res.status_code == 200, p_res.text
    p_data = p_res.json()
    assert p_data["headline"] == ins_patch["headline"]
    assert p_data["office_location"] == ins_patch["office_location"]
    assert p_data["skills"] == ins_patch["skills"]

    r_stu = client.post(
        "/v1/demo/session",
        json={"demo_role": "student", "preferred_email": "hasib@gmail.com"},
    )
    assert r_stu.status_code == 201, r_stu.text
    stu_headers = {"Authorization": f"Bearer {r_stu.json()['access_token']}"}

    for hdrs in (ins_headers, stu_headers):
        t_res = client.get("/v1/team/members", headers=hdrs)
        assert t_res.status_code == 200, t_res.text
        gv1 = next(m for m in t_res.json()["members"] if m["id"] == "usr-gv-01")
        assert gv1["headline"] == ins_patch["headline"]
        assert gv1["bio"] == ins_patch["bio"]
        assert gv1["department"] == ins_patch["department"]
        assert gv1["officeLocation"] == ins_patch["office_location"]
        assert gv1["skills"] == ins_patch["skills"]
        assert gv1["githubUrl"] == ins_patch["github_url"]
        assert gv1["websiteUrl"] == ins_patch["website_url"]
        assert gv1["phone"] == ins_patch["phone"]
        assert {"CS201", "CS202", "CS210", "CS499"}.issubset({c["code"] for c in gv1["taughtCourses"]})

    # 3. Update Student profile and verify sync across /users/me, /student/learning-overview & /team/members
    stu_patch = {
        "headline": "Systems C++ & Compiler Specialist",
        "bio": "Phát triển AST Visualizer và tối ưu bộ nhớ C++20.",
        "skills": ["C++20", "AST Visualizer", "Pytest"],
        "phone": "0915 999 842",
    }
    sp_res = client.patch("/v1/users/me", json=stu_patch, headers=stu_headers)
    assert sp_res.status_code == 200, sp_res.text

    stu_me = client.get("/v1/users/me", headers=stu_headers).json()
    stu_ov = client.get("/v1/student/learning-overview", headers=stu_headers).json()
    stu_team = client.get("/v1/team/members", headers=stu_headers).json()
    sv2 = next(m for m in stu_team["members"] if m["id"] == "usr-sv-02")

    assert stu_me["headline"] == stu_ov["user"]["headline"] == sv2["headline"] == stu_patch["headline"]
    assert stu_me["bio"] == stu_ov["user"]["bio"] == sv2["bio"] == stu_patch["bio"]
    assert stu_me["skills"] == stu_ov["user"]["skills"] == sv2["skills"] == stu_patch["skills"]
    assert stu_me["phone"] == stu_ov["user"]["phone"] == sv2["phone"] == stu_patch["phone"]
    assert sv2["learningSummary"] is not None
    assert sv2["learningSummary"]["expPoints"] == stu_ov["profile"]["exp_points"]
    assert sv2["learningSummary"]["streakDays"] == stu_ov["profile"]["current_streak"]

    # Clean up demo DB state
    assert client.post("/v1/admin/reset-demo", headers=adm_headers).status_code == 200
