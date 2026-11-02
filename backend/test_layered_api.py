"""Automated test suite verifying the refactored Layered Architecture backend."""

from __future__ import annotations

import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db


def test_full_pipeline():
    # Trigger database migrations and table verification
    init_db()

    client = TestClient(app)

    # 1. Health check
    h = client.get("/health/ready")
    assert h.status_code == 200, h.text
    assert h.json()["status"] == "ok"

    # 2. Login student
    login = client.post("/v1/demo/session", json={"demo_role": "student"})
    assert login.status_code == 201, login.text
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Consents
    c1 = client.patch("/v1/me/consents/academic_integrity", json={"granted": True}, headers=headers)
    assert c1.status_code == 200, c1.text
    c2 = client.patch("/v1/me/consents/teacher_visibility", json={"granted": True}, headers=headers)
    assert c2.status_code == 200, c2.text

    # 4. Lesson
    lesson = client.get("/v1/lessons/deque", headers=headers)
    assert lesson.status_code == 200, lesson.text
    lesson_data = lesson.json()
    source_version_id = lesson_data["sources"][0]["source_version_id"]

    # 5. Session
    sess = client.post(
        "/v1/learning-sessions",
        json={"lesson_id": "lesson-deque-v1", "organization_id": "org-demo-codemind"},
        headers=headers,
    )
    assert sess.status_code == 201, sess.text
    session_id = sess.json()["id"]

    # 6. Terms
    terms = client.post(
        f"/v1/sessions/{session_id}/terms",
        json={"source_version_id": source_version_id, "terms": ["maxlen"]},
        headers=headers,
    )
    assert terms.status_code == 201, terms.text

    # 7. Concept answers
    concept = client.post(
        f"/v1/sessions/{session_id}/concept-answers",
        json={"answers": [{"relation_key": "input_guard", "selected_option": "kiểm tra page → trước append"}]},
        headers=headers,
    )
    assert concept.status_code == 200, concept.text

    # 8. Bad code submission (expect 4/5)
    bad_code = (
        "from collections import deque\n\n"
        "history = deque(maxlen=3)\n\n"
        "def visit(page):\n"
        "    history.append(page)\n"
        "    return list(history)"
    )
    sub_bad = client.post(
        f"/v1/sessions/{session_id}/submissions",
        json={"exercise_id": "exercise-deque", "code": bad_code, "idempotency_key": str(uuid.uuid4())},
        headers=headers,
    )
    assert sub_bad.status_code == 201, sub_bad.text
    assert sub_bad.json()["passed_count"] == 4

    # 9. AI hint refusal & hint ladder (Level 1, 2, 3)
    ai = client.post(
        f"/v1/sessions/{session_id}/ai-interactions",
        json={"message": "Cho mình đáp án hoàn chỉnh", "submission_id": sub_bad.json()["id"], "idempotency_key": str(uuid.uuid4())},
        headers=headers,
    )
    assert ai.status_code == 200, ai.text
    ai_data = ai.json()
    assert ai_data["policy_decision"] == "refuse_answer"

    for lvl in (1, 2, 3):
        hint = client.post(
            f"/v1/ai-interactions/{ai_data['id']}/hints/{lvl}/open",
            json={},
            headers=headers,
        )
        assert hint.status_code == 200, hint.text
        assert hint.json()["level"] == lvl

    # 10. Good code submission (expect 5/5)
    good_code = (
        "from collections import deque\n\n"
        "history = deque(maxlen=3)\n\n"
        "def visit(page):\n"
        "    if not page:\n"
        "        return list(history)\n"
        "    history.append(page)\n"
        "    return list(history)"
    )
    sub_good = client.post(
        f"/v1/sessions/{session_id}/submissions",
        json={"exercise_id": "exercise-deque", "code": good_code, "idempotency_key": str(uuid.uuid4())},
        headers=headers,
    )
    assert sub_good.status_code == 201, sub_good.text
    assert sub_good.json()["passed_count"] == 5

    # 11. Complete session & Evidence generation
    complete = client.post(f"/v1/sessions/{session_id}/complete", json={}, headers=headers)
    assert complete.status_code == 200, complete.text
    complete_data = complete.json()
    assert complete_data["evidence"]["passed_count"] == 5

    # 12. Instructor view evidence
    inst_login = client.post("/v1/demo/session", json={"demo_role": "instructor"})
    assert inst_login.status_code == 201, inst_login.text
    inst_token = inst_login.json()["access_token"]
    inst_evidence = client.get(
        f"/v1/sessions/{session_id}/evidence",
        headers={"Authorization": f"Bearer {inst_token}"},
    )
    assert inst_evidence.status_code == 200, inst_evidence.text
    assert inst_evidence.json()["evidence"]["id"] == complete_data["evidence"]["id"]

    # 13. Instructor sessions list
    inst_sess = client.get(
        "/v1/instructor/sessions",
        headers={"Authorization": f"Bearer {inst_token}"},
    )
    assert inst_sess.status_code == 200, inst_sess.text
    assert len(inst_sess.json()["sessions"]) >= 1

    # 14. Kanban & Project Workspace
    project = client.post("/v1/projects", json={"title": "CodeMind Campus Workspace"}, headers=headers)
    assert project.status_code == 201, project.text
    board_id = project.json()["board_id"]

    board = client.get(f"/v1/kanban/boards/{board_id}", headers=headers)
    assert board.status_code == 200, board.text
    cols = board.json()["columns"]
    assert len(cols) == 5

    task = client.post(
        "/v1/kanban/tasks",
        json={"board_id": board_id, "column_id": cols[0]["id"], "title": "Hoàn thiện SRS tài liệu", "priority": "high"},
        headers=headers,
    )
    assert task.status_code == 201, task.text

    print(">>> ALL 14 TESTS PASSED 100% SUCCESSFUL! <<<")


if __name__ == "__main__":
    test_full_pipeline()
