from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

def test_sync_github_different_repos_updates_commits_and_diagram():
    init_db()
    client = TestClient(app)

    # 1. Sign in demo student (Nguyễn Bá Hòa - Leader of prj-codemind)
    r_stu = client.post("/v1/demo/session", json={"demo_role": "student", "preferred_email": "hoa.nb@student.edu.vn"})
    assert r_stu.status_code == 201
    headers = {"Authorization": f"Bearer {r_stu.json()['access_token']}"}

    # Baseline: ensure initial workspace is reset to original repo
    client.post(
        "/v1/git-hub/projects/prj-codemind/sync-github",
        json={"repoUrl": "https://github.com/Hoaba-clouch/E-learningProject"},
        headers=headers,
    )
    ws_init = client.get("/v1/git-hub/workspace?project_id=prj-codemind", headers=headers).json()
    assert ws_init["repository"]["repoSlug"] == "hoaba-clouch/e-learningproject"
    init_first_commit = ws_init["commits"][0]["message"]

    # 2. Sync facebook/react
    sync_react = client.post(
        "/v1/git-hub/projects/prj-codemind/sync-github",
        json={"repoUrl": "https://github.com/facebook/react"},
        headers=headers,
    )
    assert sync_react.status_code == 200
    res_react = sync_react.json()
    assert res_react["synced"] is True
    assert res_react["repoSlug"] == "facebook/react"
    assert res_react["commitsSynced"] > 0

    # Verify workspace commits changed!
    ws_react = client.get("/v1/git-hub/workspace?project_id=prj-codemind", headers=headers).json()
    assert ws_react["repository"]["repoSlug"] == "facebook/react"
    react_first_commit = ws_react["commits"][0]["message"]
    # Commit messages MUST have changed!
    assert react_first_commit != init_first_commit

    # Verify architecture diagram changed!
    arch_react = client.get("/v1/git-hub/projects/prj-codemind/architecture", headers=headers).json()
    assert "facebook/react" in arch_react["title"] or "React" in arch_react["title"]
    assert "Fiber" in arch_react["techStack"] or "Reconciler" in arch_react["title"]
    assert any("Fiber" in n.get("data", {}).get("label", "") or "JSX" in n.get("data", {}).get("label", "") for n in arch_react["nodes"])

    # 3. Sync fastapi/fastapi
    sync_fastapi = client.post(
        "/v1/git-hub/projects/prj-codemind/sync-github",
        json={"repoUrl": "https://github.com/fastapi/fastapi"},
        headers=headers,
    )
    assert sync_fastapi.status_code == 200
    assert sync_fastapi.json()["repoSlug"] == "fastapi/fastapi"

    # Verify workspace commits and architecture changed to FastAPI!
    ws_fastapi = client.get("/v1/git-hub/workspace?project_id=prj-codemind", headers=headers).json()
    assert ws_fastapi["repository"]["repoSlug"] == "fastapi/fastapi"
    arch_fastapi = client.get("/v1/git-hub/projects/prj-codemind/architecture", headers=headers).json()
    assert "fastapi/fastapi" in arch_fastapi["title"]
    assert "FastAPI" in arch_fastapi["techStack"]

    # 4. Sync back to original repo
    sync_orig = client.post(
        "/v1/git-hub/projects/prj-codemind/sync-github",
        json={"repoUrl": "https://github.com/Hoaba-clouch/E-learningProject"},
        headers=headers,
    )
    assert sync_orig.status_code == 200
    assert sync_orig.json()["repoSlug"] == "hoaba-clouch/e-learningproject"
    arch_orig = client.get("/v1/git-hub/projects/prj-codemind/architecture", headers=headers).json()
    assert "CodeMind" in arch_orig["title"]
    print("ALL MULTI-REPO DYNAMIC SYNC TESTS PASSED!")
