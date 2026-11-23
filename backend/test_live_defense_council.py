"""
Integration test suite for Two-Phase Defense Room (Phương án 1):
  1. Student submits Defense Package (Live Demo, Slide, Report, Architecture Summary)
  2. Student generates real project-grounded AI Mock Practice questions
  3. RBAC 403 blocking Student from Council Question Assistant & Live Council Grading
  4. Instructor generates Council Q&A Probes grounded in Kanban/Git/Anti-Freerider data
  5. Instructor grades live across 4 criteria (Demo 35%, Arch 25%, Process 15%, Q&A 25%) + per-member Q&A notes
  6. Student reads Official Council Result in dossier
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


def test_live_defense_council_workflow() -> None:
    init_db()
    client = TestClient(app)

    r_adm = client.post("/v1/auth/login", json={"email": "admin@codemind.ai", "password": "hasib123"})
    assert r_adm.status_code == 200, r_adm.text
    adm_headers = {"Authorization": f"Bearer {r_adm.json()['access_token']}"}
    assert client.post("/v1/admin/reset-demo", headers=adm_headers).status_code == 200

    r_stu = client.post("/v1/auth/login", json={"email": "hasib@gmail.com", "password": "hasib123"})
    assert r_stu.status_code == 200, r_stu.text
    stu_headers = {"Authorization": f"Bearer {r_stu.json()['access_token']}"}

    r_inst = client.post("/v1/auth/login", json={"email": "lananh.gv@codemind.ai", "password": "hasib123"})
    assert r_inst.status_code == 200, r_inst.text
    inst_headers = {"Authorization": f"Bearer {r_inst.json()['access_token']}"}

    # 1. Invalid URL rejected 422
    bad_pkg = client.put(
        "/v1/defense/projects/prj-codemind/package",
        json={"demo_url": "localhost:8443/no-scheme"},
        headers=stu_headers,
    )
    assert bad_pkg.status_code == 422, bad_pkg.text

    # 2. Student saves valid Defense Package
    good_pkg = client.put(
        "/v1/defense/projects/prj-codemind/package",
        json={
            "demo_url": "https://codemind-demo.vercel.app",
            "slide_url": "https://docs.google.com/presentation/d/demo-slides",
            "report_url": "https://drive.google.com/file/d/report-pdf",
            "video_url": "https://youtu.be/codemind-demo",
            "architecture_summary": "3-tier FastAPI + MySQL 8.0 + React 19 với Docker Sandbox cô lập.",
            "member_roles_summary": "Hòa (Lead/Frontend+AI), Huy (RBAC/Analytics), Nghị (Backend/Docker).",
        },
        headers=stu_headers,
    )
    assert good_pkg.status_code == 200, good_pkg.text
    pkg_data = good_pkg.json()
    assert pkg_data["package"]["demoUrl"] == "https://codemind-demo.vercel.app"
    assert pkg_data["package"]["isComplete"] is True

    # 3. Student generates real project-grounded Mock Practice questions
    practice_res = client.post(
        "/v1/defense/projects/prj-codemind/practice-questions",
        headers=stu_headers,
    )
    assert practice_res.status_code == 200, practice_res.text
    practice_json = practice_res.json()
    assert len(practice_json["rounds"]) == 3
    assert practice_json["rounds"][0].get("evidenceRef")
    assert practice_json["evidence_summary"]["demoUrl"] == "https://codemind-demo.vercel.app"

    # 4. Student blocked 403 from Instructor-only council endpoints
    assert (
        client.post("/v1/defense/projects/prj-codemind/council-questions", headers=stu_headers).status_code
        == 403
    )
    assert (
        client.post(
            "/v1/defense/projects/prj-codemind/live-grade",
            json={
                "demo_score": 9.0,
                "architecture_score": 9.0,
                "process_score": 9.0,
                "defense_score": 9.0,
            },
            headers=stu_headers,
        ).status_code
        == 403
    )

    # 5. Instructor fetches dossier & generates member-specific Council Questions
    dossier_res = client.get("/v1/defense/projects/prj-codemind/dossier", headers=inst_headers)
    assert dossier_res.status_code == 200, dossier_res.text
    dossier = dossier_res.json()
    assert dossier["package"]["demoUrl"] == "https://codemind-demo.vercel.app"
    assert len(dossier["memberMetrics"]) >= 1

    cq_res = client.post("/v1/defense/projects/prj-codemind/council-questions", headers=inst_headers)
    assert cq_res.status_code == 200, cq_res.text
    cq = cq_res.json()
    assert len(cq["projectProbes"]) >= 2
    assert len(cq["memberProbes"]) == len(dossier["memberMetrics"])

    # 6. Instructor submits Live Council Grade: 0.35*9.2 + 0.25*8.8 + 0.15*9.0 + 0.25*8.6 = 8.92
    first_mem = dossier["memberMetrics"][0]
    grade_payload = {
        "demo_score": 9.2,
        "architecture_score": 8.8,
        "process_score": 9.0,
        "defense_score": 8.6,
        "feedback": "Demo chạy mượt dữ liệu thật MySQL, phản biện kiến trúc chắc chắn.",
        "verdict": "pass",
        "council_members": "Cô Lan Anh, Thầy Minh Tuấn",
        "demo_verified": True,
        "repo_verified": True,
        "frozen_verified": True,
        "member_scores": [
            {
                "member_id": m["member_id"],
                "name": m["name"],
                "role": m["role"],
                "contribution_pct": m["contribution_pct"],
                "suggested_factor": m["suggested_factor"],
                "individual_score": 9.1 if m["member_id"] == first_mem["member_id"] else 8.8,
                "asked_question": "Giải thích luồng RBAC & chống lộ token?" if m["member_id"] == first_mem["member_id"] else "Trình bày phần bạn cài đặt?",
                "live_qa_note": "Trả lời trực tiếp mạch lạc, chứng minh rõ trong code." if m["member_id"] == first_mem["member_id"] else "Đạt yêu cầu.",
            }
            for m in dossier["memberMetrics"]
        ],
    }
    grade_res = client.post(
        "/v1/defense/projects/prj-codemind/live-grade",
        json=grade_payload,
        headers=inst_headers,
    )
    assert grade_res.status_code == 200, grade_res.text
    grade_data = grade_res.json()
    assert grade_data["final_score"] == 8.92

    # 7. Student reads Official Council Result in dossier
    stu_dossier = client.get("/v1/defense/projects/prj-codemind/dossier", headers=stu_headers)
    assert stu_dossier.status_code == 200, stu_dossier.text
    ev = stu_dossier.json()["officialEvaluation"]
    assert ev["isGraded"] is True
    assert ev["finalScore"] == 8.92
    assert ev["demoScore"] == 9.2
    assert ev["councilMembers"] == "Cô Lan Anh, Thầy Minh Tuấn"
    assert ev["memberScores"][0]["asked_question"] == "Giải thích luồng RBAC & chống lộ token?"
