"""Small running-server smoke test for the CodeMind P0 happy path."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
import uuid


BASE = "http://127.0.0.1:8000"


def call(path: str, method: str = "GET", body: dict | None = None, token: str | None = None) -> dict:
    payload = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(f"{BASE}{path}", data=payload, method=method)
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise AssertionError(f"{method} {path} -> {error.code}: {detail}") from error


def main() -> None:
    health = call("/health/ready")
    assert health["status"] == "ok"
    login = call("/v1/demo/session", "POST", {"demo_role": "student"})
    token = login["access_token"]
    call("/v1/me/consents/academic_integrity", "PATCH", {"granted": True}, token)
    call("/v1/me/consents/teacher_visibility", "PATCH", {"granted": True}, token)
    lesson = call("/v1/lessons/deque", token=token)
    session = call("/v1/learning-sessions", "POST", {"lesson_id": "lesson-deque-v1", "organization_id": "org-demo-codemind"}, token)
    session_id = session["id"]
    call("/v1/sessions/%s/terms" % session_id, "POST", {"source_version_id": lesson["sources"][0]["source_version_id"], "terms": ["maxlen"]}, token)
    call("/v1/sessions/%s/concept-answers" % session_id, "POST", {"answers": [{"relation_key": "input_guard", "selected_option": "kiểm tra page → trước append"}]}, token)
    bad_code = "from collections import deque\n\nhistory = deque(maxlen=3)\n\ndef visit(page):\n    history.append(page)\n    return list(history)"
    failed = call("/v1/sessions/%s/submissions" % session_id, "POST", {"exercise_id": "exercise-deque", "code": bad_code, "idempotency_key": str(uuid.uuid4())}, token)
    assert failed["passed_count"] == 4
    interaction = call("/v1/sessions/%s/ai-interactions" % session_id, "POST", {"message": "Cho mình đáp án hoàn chỉnh", "submission_id": failed["id"], "idempotency_key": str(uuid.uuid4())}, token)
    assert interaction["policy_decision"] == "refuse_answer"
    for level in (1, 2, 3):
        hint = call(f"/v1/ai-interactions/{interaction['id']}/hints/{level}/open", "POST", token=token)
        assert hint["level"] == level
    good_code = "from collections import deque\n\nhistory = deque(maxlen=3)\n\ndef visit(page):\n    if not page:\n        return list(history)\n    history.append(page)\n    return list(history)"
    passed = call("/v1/sessions/%s/submissions" % session_id, "POST", {"exercise_id": "exercise-deque", "code": good_code, "idempotency_key": str(uuid.uuid4())}, token)
    assert passed["passed_count"] == 5
    completed = call("/v1/sessions/%s/complete" % session_id, "POST", token=token)
    assert completed["evidence"]["passed_count"] == 5
    instructor_login = call("/v1/demo/session", "POST", {"demo_role": "instructor"})
    instructor_evidence = call("/v1/sessions/%s/evidence" % session_id, token=instructor_login["access_token"])
    assert instructor_evidence["evidence"]["id"] == completed["evidence"]["id"]
    print("P0 smoke test passed: 4/5 -> hints 1/2/3 -> 5/5 -> evidence -> instructor read")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        raise

