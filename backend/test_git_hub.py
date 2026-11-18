"""
Integration test suite for Nhánh 3: Git Project Hub, Git Graph Commits & 2-Tier PR Review SQLite Sync.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


def test_git_hub_full_pipeline_and_cross_module_sync() -> None:
    init_db()
    client = TestClient(app)

    # 1. Reset demo DB & sign in Student + Instructor
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

    r_ins = client.post(
        "/v1/demo/session",
        json={"demo_role": "instructor", "preferred_email": "lananh.gv@codemind.ai"},
    )
    assert r_ins.status_code == 201, r_ins.text
    ins_headers = {"Authorization": f"Bearer {r_ins.json()['access_token']}"}

    # Check initial Student XP
    prof_before = client.get("/v1/student/learning-overview", headers=stu_headers)
    assert prof_before.status_code == 200, prof_before.text
    xp_before = int(prof_before.json()["profile"]["exp_points"])

    # 2. Fetch Git Hub Workspace for prj-codemind & prj-ecommerce
    ws_cm = client.get("/v1/git-hub/workspace?project_id=prj-codemind", headers=stu_headers)
    assert ws_cm.status_code == 200, ws_cm.text
    cm = ws_cm.json()
    assert cm["activeProjectId"] == "prj-codemind"
    assert len(cm["projects"]) == 8
    assert len(cm["commits"]) == 16
    assert len(cm["pullRequests"]) == 4
    assert sum(m["sharePct"] for m in cm["memberAnalytics"]) == 100

    ws_ec = client.get("/v1/git-hub/workspace?project_id=prj-ecommerce", headers=stu_headers)
    assert ws_ec.status_code == 200, ws_ec.text
    ec = ws_ec.json()
    assert ec["repository"]["repoSlug"] == "tuan-arch/se402-saga-commerce"
    assert len(ec["commits"]) == 6

    # 3. Repo URL & Target Branch Persistence + Validation
    bad_repo = client.put(
        "/v1/git-hub/projects/prj-codemind/repo",
        json={"repo_url": "ftp://invalid", "target_branch": "develop", "default_merge_strategy": "squash"},
        headers=stu_headers,
    )
    assert bad_repo.status_code == 422

    repo_upd = client.put(
        "/v1/git-hub/projects/prj-codemind/repo",
        json={
            "repo_url": "https://github.com/Hoaba-clouch/CodeMind-Capstone-v2",
            "target_branch": "develop",
            "default_merge_strategy": "squash",
        },
        headers=stu_headers,
    )
    assert repo_upd.status_code == 200, repo_upd.text
    assert repo_upd.json()["repository"]["repoSlug"] == "hoaba-clouch/codemind-capstone-v2"
    assert repo_upd.json()["repository"]["targetBranch"] == "develop"

    # 4. Push Commit onto Graph + +10 XP
    commit_res = client.post(
        "/v1/git-hub/projects/prj-codemind/commits",
        json={
            "branch": "feature/auth",
            "message": "feat(#TE22C19): Bo sung refresh token rotation va unit test",
            "files_changed": ["backend/app/api/v1/auth.py", "backend/test_auth_rbac.py"],
        },
        headers=stu_headers,
    )
    assert commit_res.status_code == 201, commit_res.text
    c_data = commit_res.json()
    assert c_data["commit"]["taskCode"] == "TE22C19"
    assert c_data["commit"]["cx"] > 1300
    assert c_data["xp_awarded"] == 10

    # 5. Create PR with unsafe code snippet -> AST Scanner flags critical
    pr_new = client.post(
        "/v1/git-hub/projects/prj-codemind/pull-requests",
        json={
            "title": "feat(eval): Them endpoint test sandbox #TE41E89",
            "description": "Chay test tu dong",
            "source_branch": "feature/evaluator",
            "target_branch": "develop",
            "task_code": "TE41E89",
            "code_snippet": "subprocess.run(cmd, shell=True)",
        },
        headers=stu_headers,
    )
    assert pr_new.status_code == 201, pr_new.text
    new_pr = pr_new.json()["pullRequest"]
    assert new_pr["status"] == "changes_requested"
    assert any(f["severity"] == "critical" and not f["resolved"] for f in new_pr["aiFindings"])

    # 6. Full 2-Tier Lifecycle on seeded PR #08 (pr-cm-08 / #TE35D77)
    premature_approve = client.post(
        "/v1/git-hub/pull-requests/pr-cm-08/peer-approve",
        json={"comment": "Try approve"},
        headers=stu_headers,
    )
    assert premature_approve.status_code == 422

    premature_merge = client.post(
        "/v1/git-hub/pull-requests/pr-cm-08/merge",
        json={"merge_strategy": "squash"},
        headers=stu_headers,
    )
    assert premature_merge.status_code == 422

    ai_fix = client.post("/v1/git-hub/pull-requests/pr-cm-08/ai-fix", headers=stu_headers)
    assert ai_fix.status_code == 200, ai_fix.text
    assert ai_fix.json()["pullRequest"]["aiReviewScore"] >= 98
    assert all(f["resolved"] for f in ai_fix.json()["pullRequest"]["aiFindings"])

    still_blocked_merge = client.post(
        "/v1/git-hub/pull-requests/pr-cm-08/merge",
        json={"merge_strategy": "squash"},
        headers=stu_headers,
    )
    assert still_blocked_merge.status_code == 422

    peer_ok = client.post(
        "/v1/git-hub/pull-requests/pr-cm-08/peer-approve",
        json={"reviewer_name": "Nguyễn Bá Hòa", "comment": "Đã vá shell=False sạch sẽ, LGTM!"},
        headers=stu_headers,
    )
    assert peer_ok.status_code == 200, peer_ok.text
    assert peer_ok.json()["pullRequest"]["peerApproved"] is True
    assert peer_ok.json()["pullRequest"]["status"] == "approved"

    merge_ok = client.post(
        "/v1/git-hub/pull-requests/pr-cm-08/merge",
        json={"merge_strategy": "squash"},
        headers=stu_headers,
    )
    assert merge_ok.status_code == 200, merge_ok.text
    m_data = merge_ok.json()
    assert m_data["pullRequest"]["status"] == "merged"
    assert len(m_data["pullRequest"]["dodSha256"]) == 64
    assert m_data["updatedTaskCode"] == "TE35D77"
    assert m_data["xp_awarded"] == 30

    # Verify cross-module sync: Student XP (+10 + 30 = +40), Kanban TE35D77 done, Instructor Dual Grading entry
    prof_after = client.get("/v1/student/learning-overview", headers=stu_headers)
    assert int(prof_after.json()["profile"]["exp_points"]) == xp_before + 40

    kb_after = client.get("/v1/kanban/workspace", headers=stu_headers).json()
    cm_proj = next(p for p in kb_after["projects"] if p["id"] == "prj-codemind")
    t4 = next(t for t in cm_proj["tasks"] if t["code"] == "TE35D77")
    assert t4["column"] == "done"
    assert "/pull/8" in (t4.get("submissionUrl") or "")

    ins_subs = client.get("/v1/instructor/dual-submissions", headers=ins_headers).json()["submissions"]
    assert any(s["id"] == m_data["dualSubmissionId"] for s in ins_subs)

    # Verify reload persistence on Git Hub workspace
    ws_reloaded = client.get("/v1/git-hub/workspace?project_id=prj-codemind", headers=stu_headers).json()
    assert ws_reloaded["repository"]["targetBranch"] == "develop"
    assert len(ws_reloaded["commits"]) == 19  # 16 seed + 1 push + 1 ai-fix + 1 merge

    # 8. Test Dynamic Architecture & Live GitHub Sync APIs
    arch_get = client.get("/v1/git-hub/projects/prj-codemind/architecture", headers=stu_headers)
    assert arch_get.status_code == 200, arch_get.text
    arch_json = arch_get.json()
    assert arch_json["projectId"] == "prj-codemind"
    assert len(arch_json["subsystems"]) == 4
    assert len(arch_json["nodes"]) >= 15
    assert len(arch_json["flows"]) >= 3

    # Test update architecture
    arch_json["title"] = "CodeMind AI - Sơ đồ kiến trúc cập nhật"
    arch_put = client.put("/v1/git-hub/projects/prj-codemind/architecture", json=arch_json, headers=stu_headers)
    assert arch_put.status_code == 200, arch_put.text
    assert arch_put.json()["success"] is True

    # Test AI Generate Architecture
    arch_gen = client.post("/v1/git-hub/projects/prj-ecommerce/generate-architecture", json={}, headers=stu_headers)
    assert arch_gen.status_code == 200, arch_gen.text
    assert arch_gen.json()["projectId"] == "prj-ecommerce"

    # Test Live GitHub Sync endpoint
    gh_sync = client.post(
        "/v1/git-hub/projects/prj-codemind/sync-github",
        json={"repoUrl": "https://github.com/Hoaba-clouch/E-learningProject"},
        headers=stu_headers,
    )
    assert gh_sync.status_code == 200, gh_sync.text
    sync_res = gh_sync.json()
    assert sync_res["synced"] is True
    assert sync_res["repoSlug"] == "hoaba-clouch/e-learningproject"

    # Clean up back to baseline demo state
    assert client.post("/v1/admin/reset-demo", headers=adm_headers).status_code == 200
