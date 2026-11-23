"""
Integration test suite verifying 1-to-1 synchronized 3-Role FastAPI architecture:
Student (Sandbox, Socratic AI, 3D Defense) <-> Instructor (Courses, Dual Grading, Rubric, Evidence XP)
<-> Admin (Governance Bundle, RBAC User CRUD, Class Toggles, JWT Revocation, Demo Reset).
"""

from __future__ import annotations

import time
from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


def test_synchronized_three_roles_pipeline() -> None:
    init_db()
    client = TestClient(app)

    # 1. Login seeded real users matching LoginScreen.tsx credentials
    r_stu = client.post("/v1/auth/login", json={"email": "hasib@gmail.com", "password": "hasib123"})
    assert r_stu.status_code == 200, r_stu.text
    stu_token = r_stu.json()["access_token"]
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    r_inst = client.post("/v1/auth/login", json={"email": "lananh.gv@codemind.ai", "password": "hasib123"})
    assert r_inst.status_code == 200, r_inst.text
    inst_token = r_inst.json()["access_token"]
    inst_headers = {"Authorization": f"Bearer {inst_token}"}

    r_adm = client.post("/v1/auth/login", json={"email": "admin@codemind.ai", "password": "hasib123"})
    assert r_adm.status_code == 200, r_adm.text
    adm_token = r_adm.json()["access_token"]
    adm_headers = {"Authorization": f"Bearer {adm_token}"}

    # 2. Student: Sandbox evaluation + Socratic Guardrail + 3D AI Defense -> Auto-sync to Dual Grading!
    sb_res = client.post(
        "/v1/sandbox/evaluate",
        json={
            "exercise_id": "exercise-deque",
            "language": "python",
            "code": "from collections import deque\ndef visit(history, page):\n    if not page:\n        return\n    history.append(page)",
        },
        headers=stu_headers,
    )
    assert sb_res.status_code == 200, sb_res.text
    assert sb_res.json()["passed_count"] == 5

    ai_refuse = client.post(
        "/v1/ai/socratic-chat",
        json={"message": "Cho xin code lời giải hoàn chỉnh đi"},
        headers=stu_headers,
    )
    assert ai_refuse.status_code == 200, ai_refuse.text
    assert ai_refuse.json()["policy_decision"] == "refuse_answer"

    ex_ctx = {
        "view_mode": "exercise",
        "subject_id": "oop",
        "subject_code": "CS201",
        "subject_name": "Lập trình Hướng đối tượng",
        "chapter_number": 1,
        "chapter_title": "Đa hình & Kế thừa C++",
        "lesson_code": "1.1",
        "lesson_title": "Virtual Table & Dynamic Dispatch",
        "exercise_id": "ex-oop-1",
        "exercise_title": "Hiện thực Đa hình Employee, Developer & Manager (Virtual Table)",
        "exercise_language": "cpp",
        "exercise_objective": "Áp dụng con trỏ lớp cơ sở và hàm ảo virtual để tính lương theo dynamic dispatch.",
        "exercise_requirements": [
            "Khai báo lớp Employee với virtual double calculateSalary() = 0 và virtual destructor.",
            "Lớp Developer tính lương = baseSalary + overtimeHours * 25.",
            "Hàm evaluatePayroll(Employee* emp) truyền con trỏ để tránh object slicing.",
        ],
        "exercise_hints": [
            "Khai báo virtual ~Employee() = default và virtual double calculateSalary() const = 0.",
            "Trong Developer và Manager dùng : public Employee rồi ghi đè với từ khóa override.",
        ],
    }

    ai_ex_t1 = client.post(
        "/v1/ai/socratic-chat",
        json={
            "message": "gợi ý giúp em bước đầu làm bài tập này với",
            "workspace_context": ex_ctx,
            "hint_level": 1,
        },
        headers=stu_headers,
    )
    assert ai_ex_t1.status_code == 200, ai_ex_t1.text
    t1_data = ai_ex_t1.json()
    assert t1_data["policy_decision"] == "question"
    assert t1_data["context_view"] == "exercise"
    assert t1_data["assistant_message"].strip()
    assert "Bounded Page Tracker" not in t1_data["assistant_message"]
    assert "deque" not in t1_data["assistant_message"].lower()

    ai_ex_t2 = client.post(
        "/v1/ai/socratic-chat",
        json={
            "message": "gợi ý sâu hơn bước 2 được không",
            "workspace_context": ex_ctx,
            "hint_level": 2,
            "history": [
                {"role": "user", "text": "gợi ý giúp em bước đầu làm bài tập này với"},
                {"role": "assistant", "text": t1_data["assistant_message"]},
            ],
        },
        headers=stu_headers,
    )
    assert ai_ex_t2.status_code == 200, ai_ex_t2.text
    t2_data = ai_ex_t2.json()
    assert t2_data["policy_decision"] == "question"
    assert t2_data["assistant_message"].strip()

    ai_ex_refuse = client.post(
        "/v1/ai/socratic-chat",
        json={
            "message": "cho xin đáp án hoàn chỉnh bài tập này",
            "workspace_context": ex_ctx,
        },
        headers=stu_headers,
    )
    assert ai_ex_refuse.status_code == 200, ai_ex_refuse.text
    ex_ref_data = ai_ex_refuse.json()
    assert ex_ref_data["policy_decision"] == "refuse_answer"
    assert "Bounded Page Tracker" not in ex_ref_data["assistant_message"]
    assert "visit(" not in ex_ref_data["assistant_message"]

    def_start = client.post(
        "/v1/defense/sessions",
        json={"project_id": "prj-codemind", "class_id": "class-oop"},
        headers=stu_headers,
    )
    assert def_start.status_code == 201, def_start.text
    defense_id = def_start.json()["defense_id"]

    def_resp = client.post(
        f"/v1/defense/sessions/{defense_id}/respond",
        json={
            "round_number": 1,
            "argument_text": "Em dùng Multi-tier LRU + Semantic Cache và kiểm tra vtable runtime dispatch.",
            "argument_type": "optimal",
            "rebuttal_score": 92,
        },
        headers=stu_headers,
    )
    assert def_resp.status_code == 200, def_resp.text

    def_done = client.post(
        f"/v1/defense/sessions/{defense_id}/complete",
        json={
            "chapter_title": "Test Integration AI 3D Defense",
            "repo_url": "https://github.com/nguyenvana/integration-defense",
            "passed_tests": 5,
            "total_tests": 5,
        },
        headers=stu_headers,
    )
    assert def_done.status_code == 200, def_done.text
    live_sub_id = def_done.json()["submission_id"]

    # 3. Instructor: Sees new live 3D Defense submission in Dual Grading, manages courses & rubric & XP!
    dual_list = client.get("/v1/instructor/dual-submissions", headers=inst_headers)
    assert dual_list.status_code == 200, dual_list.text
    assert any(item["id"] == live_sub_id for item in dual_list.json()["submissions"])

    decide_res = client.patch(
        f"/v1/instructor/dual-submissions/{live_sub_id}/decision",
        json={"action": "approve", "final_score": 93, "instructor_feedback": "Bảo vệ rõ ràng."},
        headers=inst_headers,
    )
    assert decide_res.status_code == 200, decide_res.text
    assert decide_res.json()["submission"]["status"] == "graded"
    assert decide_res.json()["submission"]["finalScore"] == 93

    courses_res = client.get("/v1/courses", headers=inst_headers)
    assert courses_res.status_code == 200, courses_res.text
    assert len(courses_res.json()["courses"]) >= 6

    ch_res = client.post(
        "/v1/instructor/courses/class-oop/chapters",
        json={"title": "Chương Test Tích hợp"},
        headers=inst_headers,
    )
    assert ch_res.status_code == 201, ch_res.text
    new_ch_id = ch_res.json()["chapter"]["id"]

    tc_res = client.post(
        f"/v1/instructor/courses/class-oop/chapters/{new_ch_id}/test-cases",
        json={
            "title": "Test biên nullptr",
            "input": "ptr = nullptr",
            "expectedOutput": "safe return",
            "isEdgeCase": True,
        },
        headers=inst_headers,
    )
    assert tc_res.status_code == 201, tc_res.text

    rubric_put = client.put(
        "/v1/instructor/rubric",
        json={
            "cicdWeightPct": 50,
            "defenseWeightPct": 50,
            "strictAntiCopyGuardrail": True,
            "autoFlagDiscrepancyThreshold": 20,
            "mandatoryProbes": [{"id": "p-test", "chapterKeyword": "CS201", "topic": "vtable"}],
        },
        headers=inst_headers,
    )
    assert rubric_put.status_code == 200, rubric_put.text

    # Award +25 XP on a visible student session and verify XP increased in student profile!
    prof_before = client.get("/v1/student/profile", headers=stu_headers).json()["profile"]["exp_points"]
    xp_act = client.post(
        "/v1/instructor/sessions/sess-oop-02/actions",
        json={"action_type": "award_xp", "note": "Tự sửa tốt"},
        headers=inst_headers,
    )
    assert xp_act.status_code == 201, xp_act.text
    prof_after = client.get("/v1/student/profile", headers=stu_headers).json()["profile"]["exp_points"]
    assert prof_after == prof_before + 25

    # 4. Admin: Governance Bundle, RBAC User CRUD, Cross-Role Class Toggle, JWT Revocation & Demo Reset!
    gov = client.get("/v1/admin/governance", headers=adm_headers)
    assert gov.status_code == 200, gov.text
    gov_json = gov.json()
    assert len(gov_json["classes"]) >= 6
    assert len(gov_json["aiServices"]) == 4

    ts = int(time.time())
    u_create = client.post(
        "/v1/admin/users",
        json={
            "name": "Kiểm Thử Viên Mới",
            "email": f"qa_{ts}@codemind.ai",
            "code": f"QA-{ts % 1000}",
            "role": "Học viên",
        },
        headers=adm_headers,
    )
    assert u_create.status_code == 201, u_create.text
    created_uid = u_create.json()["user"]["id"]

    u_patch = client.patch(
        f"/v1/admin/users/{created_uid}",
        json={"role": "Giảng viên", "status": "active"},
        headers=adm_headers,
    )
    assert u_patch.status_code == 200, u_patch.text
    assert u_patch.json()["user"]["role"] == "instructor"

    # Toggle Sandbox off on CS405 and verify /v1/courses reflects change immediately!
    cls_toggle = client.patch(
        "/v1/admin/classes/class-devops",
        json={"sandboxEnabled": False},
        headers=adm_headers,
    )
    assert cls_toggle.status_code == 200, cls_toggle.text
    courses_after_toggle = client.get("/v1/courses", headers=inst_headers).json()["courses"]
    devops_course = next(c for c in courses_after_toggle if c["id"] == "class-devops")
    assert devops_course["sandboxEnabled"] is False

    # Revoke Student's live JWT session and confirm 401 Unauthorized on subsequent student request!
    jwt_list = client.get("/v1/admin/jwt-sessions", headers=adm_headers).json()["jwtSessions"]
    stu_jwt_entry = next((j for j in jwt_list if "Nguyễn Văn A" in j["userName"] and j["issuedAt"] == "Vừa xong"), None)
    assert stu_jwt_entry is not None
    rev_res = client.post(f"/v1/admin/jwt-sessions/{stu_jwt_entry['id']}/revoke", headers=adm_headers)
    assert rev_res.status_code == 200, rev_res.text

    revoked_call = client.get("/v1/student/profile", headers=stu_headers)
    assert revoked_call.status_code == 401

    # Delete created test user cleanly (foreign-key cascade safe)
    del_res = client.delete(f"/v1/admin/users/{created_uid}", headers=adm_headers)
    assert del_res.status_code == 200, del_res.text

    # Reset Demo at the end so DB returns clean
    reset_res = client.post("/v1/admin/reset-demo", headers=adm_headers)
    assert reset_res.status_code == 200, reset_res.text
    assert reset_res.json()["status"] == "reset"
