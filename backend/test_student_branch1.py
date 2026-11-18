"""
Integration test suite for Branch 1 (Nhánh 1 — Student Learning Workspace + F8 Official Lectures + SQLite Progress & XP Shop).
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


def test_student_branch1_full_learning_pipeline() -> None:
    init_db()
    client = TestClient(app)

    # 1. Admin reset demo DB to clean seeded state + login Instructor & Student
    r_adm = client.post("/v1/auth/login", json={"email": "admin@codemind.ai", "password": "hasib123"})
    assert r_adm.status_code == 200, r_adm.text
    adm_headers = {"Authorization": f"Bearer {r_adm.json()['access_token']}"}

    r_reset = client.post("/v1/admin/reset-demo", headers=adm_headers)
    assert r_reset.status_code == 200, r_reset.text

    r_stu = client.post(
        "/v1/demo/session",
        json={"demo_role": "student", "preferred_email": "hasib@gmail.com"},
    )
    assert r_stu.status_code == 201, r_stu.text
    stu_headers = {"Authorization": f"Bearer {r_stu.json()['access_token']}"}

    r_inst = client.post("/v1/auth/login", json={"email": "lananh.gv@codemind.ai", "password": "hasib123"})
    assert r_inst.status_code == 200, r_inst.text
    inst_headers = {"Authorization": f"Bearer {r_inst.json()['access_token']}"}

    # 2. Overview hydration & F8 Official lecture check
    ov_res = client.get("/v1/student/learning-overview", headers=stu_headers)
    assert ov_res.status_code == 200, ov_res.text
    ov = ov_res.json()
    assert ov["profile"]["exp_points"] == 3240
    assert ov["profile"]["current_streak"] == 14
    assert len(ov["completed_lessons"]) >= 5

    cs201 = next((c for c in ov["courses"] if c["code"] == "CS201"), None)
    assert cs201 is not None, "Seeded course CS201 missing"
    assert cs201["chapters"][0]["lessons"][0]["youtubeId"] == "M6FwepHC6vM"

    # 3. Lesson completion + idempotent XP check
    comp1 = client.post(
        "/v1/student/lessons/complete",
        json={
            "subject_id": "oop",
            "chapter_id": "oop-c2",
            "lesson_id": "2.2",
            "xp": 80,
            "quiz_score": 3,
            "quiz_total": 3,
        },
        headers=stu_headers,
    )
    assert comp1.status_code == 200, comp1.text
    assert comp1.json()["xp_awarded"] == 80
    assert comp1.json()["total_xp"] == 3320

    comp2 = client.post(
        "/v1/student/lessons/complete",
        json={
            "subject_id": "oop",
            "chapter_id": "oop-c2",
            "lesson_id": "2.2",
            "xp": 80,
            "quiz_score": 3,
            "quiz_total": 3,
        },
        headers=stu_headers,
    )
    assert comp2.status_code == 200, comp2.text
    assert comp2.json()["xp_awarded"] == 0
    assert comp2.json()["total_xp"] == 3320

    # 4. F8 Video Timestamp Notes CRUD
    note_create = client.post(
        "/v1/student/video-notes",
        json={
            "subject_id": "oop",
            "lesson_id": "1.1",
            "time_sec": 185,
            "timestamp": "03:05",
            "content": "F8 Note Test: protected inheritance cho phép lớp con kế thừa an toàn",
        },
        headers=stu_headers,
    )
    assert note_create.status_code == 201, note_create.text
    created_note = note_create.json()["note"]
    assert created_note["timestamp"] == "03:05"

    note_list = client.get("/v1/student/video-notes?subject_id=oop&lesson_id=1.1", headers=stu_headers)
    assert note_list.status_code == 200, note_list.text
    assert any(n["id"] == created_note["id"] for n in note_list.json()["notes"])

    note_del = client.delete(f"/v1/student/video-notes/{created_note['id']}", headers=stu_headers)
    assert note_del.status_code == 200, note_del.text

    note_list_after = client.get("/v1/student/video-notes?subject_id=oop&lesson_id=1.1", headers=stu_headers)
    assert not any(n["id"] == created_note["id"] for n in note_list_after.json()["notes"])

    # 5. Chapter Exercise Submission -> Docker test case grading + Sync into Instructor Dual Grading
    sub_res = client.post(
        "/v1/student/chapter-submissions",
        json={
            "subject_id": "oop",
            "chapter_number": 1,
            "exercise_id": "ex-oop-1",
            "exercise_title": "Hiện thực Đa hình Employee & Developer (vtable)",
            "repo_url": "https://github.com/codemind-student/cpp-oop-polymorphism-lab",
            "student_note": "Đã xử lý virtual destructor và smart pointer chống rò rỉ bộ nhớ",
            "xp": 100,
        },
        headers=stu_headers,
    )
    assert sub_res.status_code == 201, sub_res.text
    sub_data = sub_res.json()
    assert sub_data["submission"]["testsPassed"] == sub_data["submission"]["testsTotal"]
    assert sub_data["total_xp"] == 3420
    dual_id = sub_data["submission"]["dual_submission_id"]

    # Confirm Instructor sees synced dual submission
    dual_list = client.get("/v1/instructor/dual-submissions", headers=inst_headers)
    assert dual_list.status_code == 200, dual_list.text
    assert any(item["id"] == dual_id for item in dual_list.json()["submissions"])

    # Confirm Student overview persists submission after reload
    ov_after_sub = client.get("/v1/student/learning-overview", headers=stu_headers).json()
    assert any(s["exercise_id"] == "ex-oop-1" for s in ov_after_sub["chapter_submissions"])

    # 6. XP Shop Quest Claim + Purchase + Duplicate Rejection
    q_res = client.post(
        "/v1/student/xp-shop/claim-quest",
        json={"quest_id": "q1", "reward": 300},
        headers=stu_headers,
    )
    assert q_res.status_code == 200, q_res.text
    assert q_res.json()["exp_points"] == 3720
    assert "q1" in q_res.json()["claimed_quests"]

    q_dup = client.post(
        "/v1/student/xp-shop/claim-quest",
        json={"quest_id": "q1", "reward": 300},
        headers=stu_headers,
    )
    assert q_dup.status_code == 400

    buy_res = client.post(
        "/v1/student/xp-shop/purchase",
        json={"category": "theme", "item_id": "graphite", "cost": 500},
        headers=stu_headers,
    )
    assert buy_res.status_code == 200, buy_res.text
    assert buy_res.json()["exp_points"] == 3220
    assert "graphite" in buy_res.json()["owned_items"]["theme"]

    # 7. Cleanly restore demo DB state
    r_reset_final = client.post("/v1/admin/reset-demo", headers=adm_headers)
    assert r_reset_final.status_code == 200
