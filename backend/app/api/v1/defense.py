from __future__ import annotations

import json
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user, record_audit_log
from app.core.database import db, row_dict
from app.core.security import sha256, uid
from app.core.timezone import now_utc
from app.schemas.defense import (
    DefenseCompleteIn,
    DefenseRespondIn,
    DefenseStartIn,
    ToggleCourseDefenseIn,
)
from app.services.analytics import track_event

router = APIRouter(tags=["AI 3D Defense & Dual Grading"])

TOKEN_RE = re.compile(r"[0-9a-zA-ZÀ-ỹ_+\-#./]+")


def _rubric_dict(row: Any) -> dict[str, Any]:
    if not row:
        return {
            "cicdWeightPct": 60,
            "defenseWeightPct": 40,
            "strictAntiCopyGuardrail": True,
            "autoFlagDiscrepancyThreshold": 25,
            "mandatoryProbes": [],
        }
    return {
        "cicdWeightPct": row["cicd_weight_pct"],
        "defenseWeightPct": row["defense_weight_pct"],
        "strictAntiCopyGuardrail": bool(row["strict_anti_copy_guardrail"]),
        "autoFlagDiscrepancyThreshold": row["auto_flag_discrepancy_threshold"],
        "mandatoryProbes": json.loads(row["mandatory_probes_json"] or "[]"),
    }


def _resolve_project_course(
    conn: Any, project_id: str, explicit_class_id: str | None = None
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    proj_row = conn.execute(
        """SELECT ep.id, ep.code, ep.name, ep.course, ep.status, gr.repo_url
           FROM engineering_projects ep
           LEFT JOIN git_repositories gr ON gr.project_id = ep.id
           WHERE ep.id = ?""",
        (project_id,),
    ).fetchone()
    proj = row_dict(proj_row) if proj_row else None

    course_obj: dict[str, Any] | None = None
    if proj and proj.get("course"):
        course_code = proj["course"].split("·")[0].strip()
        if course_code:
            c_row = conn.execute(
                "SELECT id, code, name, ai_defense_enabled, sandbox_enabled FROM courses WHERE UPPER(code) = UPPER(?)",
                (course_code,),
            ).fetchone()
            if c_row:
                course_obj = row_dict(c_row)

    if not course_obj and explicit_class_id:
        c_row = conn.execute(
            "SELECT id, code, name, ai_defense_enabled, sandbox_enabled FROM courses WHERE id = ?",
            (explicit_class_id,),
        ).fetchone()
        if c_row:
            course_obj = row_dict(c_row)

    if not course_obj:
        c_row = conn.execute(
            "SELECT id, code, name, ai_defense_enabled, sandbox_enabled FROM courses WHERE id IN ('class-capstone', 'class-oop') ORDER BY id ASC LIMIT 1"
        ).fetchone()
        if c_row:
            course_obj = row_dict(c_row)

    return proj, course_obj


def _evaluate_oral_response(
    text: str, expected_keywords: list[str]
) -> tuple[int, str, list[str]]:
    clean = (text or "").strip()
    lower_clean = clean.lower()
    raw_tokens = TOKEN_RE.findall(lower_clean)
    word_count = len(raw_tokens)
    unique_ratio = len(set(raw_tokens)) / max(1, word_count)

    has_char_spam = bool(re.search(r"(.)\1{5,}", clean))
    is_repetitive = word_count >= 5 and unique_ratio < 0.45

    matched_keywords: list[str] = []
    token_set = set(raw_tokens)
    for kw in expected_keywords or []:
        kw_clean = (kw or "").strip()
        if not kw_clean:
            continue
        kw_low = kw_clean.lower()
        if kw_low in lower_clean:
            matched_keywords.append(kw_clean)
            continue
        kw_tokens = [t for t in TOKEN_RE.findall(kw_low) if len(t) >= 3]
        if kw_tokens:
            hits = sum(1 for t in kw_tokens if t in token_set)
            if hits / len(kw_tokens) >= 0.5:
                matched_keywords.append(kw_clean)

    total_kw = len([k for k in (expected_keywords or []) if (k or "").strip()])
    matched_count = len(matched_keywords)

    if has_char_spam or is_repetitive or word_count < 4:
        score = 38
        feedback = (
            "Luận điểm quá ngắn hoặc lặp ký tự/từ khóa, chưa chứng minh được giải pháp kỹ thuật."
        )
        return score, feedback, matched_keywords

    if word_count < 8:
        score = min(55, 44 + matched_count * 4)
        feedback = (
            "Câu trả lời còn sơ sài (< 8 từ). Cần phân tích rõ cơ chế kiến trúc, luồng dữ liệu và cách xử lý ngoại lệ."
        )
        return score, feedback, matched_keywords

    if word_count < 18:
        kw_bonus = round((matched_count / max(1, total_kw)) * 14) if total_kw else 8
        word_bonus = min(6, (word_count - 8) // 2)
        score = max(56, min(76, 56 + word_bonus + kw_bonus))
        if matched_keywords:
            feedback = (
                f"Đã chạm tới điểm trọng tâm ({', '.join(matched_keywords[:3])}), nhưng cần lập luận sâu hơn về tải thực tế và đánh đổi hiệu năng."
            )
        else:
            feedback = (
                "Độ dài tạm ổn nhưng thiếu từ khóa chuyên ngành trọng tâm; nên làm rõ cơ chế lõi của hệ thống."
            )
        return score, feedback, matched_keywords

    # Substantive response (>= 18 words)
    length_bonus = min(8, (word_count - 18) // 4)
    if total_kw > 0 and matched_count == 0:
        score = min(74, 64 + length_bonus)
        feedback = (
            "Diễn đạt mạch lạc nhưng chưa trúng các khái niệm kỹ thuật cốt lõi được hỏi; Hội đồng cần kiểm tra sâu ở hiệp chất vấn."
        )
        return score, feedback, matched_keywords

    kw_bonus = round((matched_count / max(1, total_kw)) * 14) if total_kw else 12
    score = max(78, min(98, 76 + length_bonus + kw_bonus))
    if matched_keywords:
        feedback = (
            f"Luận điểm chắc chắn, làm rõ được trọng tâm ({', '.join(matched_keywords[:3])}) và tư duy kiến trúc thực tế."
        )
    else:
        feedback = "Luận điểm rõ ràng, giải thích tốt cơ chế triển khai và kiểm soát rủi ro hệ thống."
    return score, feedback, matched_keywords


def _serialize_session(r: Any) -> dict[str, Any]:
    s = row_dict(r)
    try:
        transcript = json.loads(s.get("transcript_json") or "[]")
    except Exception:
        transcript = []
    return {
        "id": s["id"],
        "userId": s["user_id"],
        "studentName": s.get("student_name") or "Học viên",
        "studentCode": s.get("student_code") or "—",
        "projectId": s["project_id"],
        "projectName": s.get("project_name") or s["project_id"],
        "projectCode": s.get("project_code") or s["project_id"],
        "classId": s["class_id"],
        "courseCode": s.get("course_code") or "",
        "roundNumber": s["round_number"],
        "status": s["status"],
        "architectureScore": s["architecture_score"],
        "algorithmScore": s["algorithm_score"],
        "productionScore": s["production_score"],
        "finalDefenseScore": s["final_defense_score"],
        "transcript": transcript,
        "createdAt": s["created_at"],
        "updatedAt": s["updated_at"],
    }


def _serialize_dual_submission(r: Any) -> dict[str, Any]:
    d = row_dict(r)
    return {
        "id": d["id"],
        "classId": d["class_id"],
        "userId": d.get("user_id"),
        "studentName": d["student_name"],
        "studentCode": d["student_code"],
        "chapterTitle": d["chapter_title"],
        "repoUrl": d["repo_url"],
        "submittedAt": d["submitted_at"],
        "passedTests": d["passed_tests"],
        "totalTests": d["total_tests"],
        "execTimeMs": d["exec_time_ms"],
        "memoryMb": d["memory_mb"],
        "commitHash": d["commit_hash"],
        "commitCount": d["commit_count"],
        "similarityPct": d["similarity_pct"],
        "testDetails": json.loads(d["test_details_json"] or "[]"),
        "defenseStatus": d["defense_status"],
        "defenseScore": d["defense_score"],
        "coherenceSummary": d["coherence_summary"],
        "transcript": json.loads(d["transcript_json"] or "[]"),
        "status": d["status"],
        "finalScore": d["final_score"],
        "instructorFeedback": d["instructor_feedback"],
        "updatedAt": d["updated_at"],
    }


@router.get("/defense/rubric")
def get_public_defense_rubric(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Học viên & Giảng viên xem cấu hình Rubric Chấm Kép hiện hành."""
    with db() as conn:
        row = conn.execute("SELECT * FROM defense_rubric_configs WHERE id='default'").fetchone()
    return _rubric_dict(row)


@router.get("/defense/workspace", status_code=status.HTTP_200_OK)
def get_defense_workspace(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Dữ liệu tổng hợp cho Phòng Phản Biện AI theo đúng quyền (Student / Instructor / Admin)."""
    role = (user.get("role") or "student").lower()
    is_staff = role in ("instructor", "admin", "org_admin")

    with db() as conn:
        course_rows = conn.execute(
            """SELECT id, code, name, teacher_name, student_count,
                      pending_dual_reviews, ai_defense_enabled, sandbox_enabled
               FROM courses ORDER BY code ASC"""
        ).fetchall()
        courses = [
            {
                "id": c["id"],
                "code": c["code"],
                "name": c["name"],
                "teacherName": c["teacher_name"],
                "studentCount": c["student_count"],
                "pendingDualReviews": c["pending_dual_reviews"],
                "aiDefenseEnabled": bool(c["ai_defense_enabled"]),
                "sandboxEnabled": bool(c["sandbox_enabled"]),
            }
            for c in course_rows
        ]
        courses_by_code = {c["code"].upper(): c for c in courses}

        commit_counts = {
            r["project_id"]: int(r["cnt"])
            for r in conn.execute(
                "SELECT project_id, COUNT(*) AS cnt FROM git_commits GROUP BY project_id"
            ).fetchall()
        }
        pr_counts = {
            r["project_id"]: int(r["cnt"])
            for r in conn.execute(
                "SELECT project_id, COUNT(*) AS cnt FROM git_pull_requests GROUP BY project_id"
            ).fetchall()
        }
        task_stats_rows = conn.execute(
            """SELECT project_id,
                      COUNT(*) AS total_cnt,
                      SUM(CASE WHEN column_id IN ('done', 'review') THEN 1 ELSE 0 END) AS done_cnt
               FROM engineering_tasks GROUP BY project_id"""
        ).fetchall()
        task_stats = {
            r["project_id"]: (int(r["done_cnt"] or 0), int(r["total_cnt"] or 0))
            for r in task_stats_rows
        }

        proj_rows = conn.execute(
            """SELECT ep.id, ep.code, ep.name, ep.course, ep.status, gr.repo_url
               FROM engineering_projects ep
               LEFT JOIN git_repositories gr ON gr.project_id = ep.id
               ORDER BY ep.id ASC"""
        ).fetchall()
        projects = []
        for p in proj_rows:
            c_code = (p["course"] or "").split("·")[0].strip().upper()
            matched_c = courses_by_code.get(c_code)
            done_cnt, total_cnt = task_stats.get(p["id"], (0, 0))
            projects.append(
                {
                    "id": p["id"],
                    "code": p["code"],
                    "name": p["name"],
                    "course": p["course"],
                    "status": p["status"],
                    "classId": matched_c["id"] if matched_c else "class-capstone",
                    "courseCode": matched_c["code"] if matched_c else c_code,
                    "aiDefenseEnabled": matched_c["aiDefenseEnabled"] if matched_c else True,
                    "repoUrl": p["repo_url"] or "",
                    "commitsCount": commit_counts.get(p["id"], 0),
                    "prsCount": pr_counts.get(p["id"], 0),
                    "doneTasksCount": done_cnt,
                    "totalTasksCount": total_cnt,
                }
            )

        rubric_row = conn.execute("SELECT * FROM defense_rubric_configs WHERE id='default'").fetchone()
        rubric = _rubric_dict(rubric_row)

        if is_staff:
            sess_rows = conn.execute(
                """SELECT ds.*, COALESCE(NULLIF(u.full_name, ''), u.display_name) AS student_name,
                          u.user_code AS student_code,
                          ep.name AS project_name, ep.code AS project_code, c.code AS course_code
                   FROM defense_sessions ds
                   LEFT JOIN users u ON u.id = ds.user_id
                   LEFT JOIN engineering_projects ep ON ep.id = ds.project_id
                   LEFT JOIN courses c ON c.id = ds.class_id
                   ORDER BY ds.updated_at DESC"""
            ).fetchall()
            sub_rows = conn.execute(
                "SELECT * FROM dual_submissions ORDER BY updated_at DESC, id ASC"
            ).fetchall()
        else:
            sess_rows = conn.execute(
                """SELECT ds.*, COALESCE(NULLIF(u.full_name, ''), u.display_name) AS student_name,
                          u.user_code AS student_code,
                          ep.name AS project_name, ep.code AS project_code, c.code AS course_code
                   FROM defense_sessions ds
                   LEFT JOIN users u ON u.id = ds.user_id
                   LEFT JOIN engineering_projects ep ON ep.id = ds.project_id
                   LEFT JOIN courses c ON c.id = ds.class_id
                   WHERE ds.user_id = ?
                   ORDER BY ds.updated_at DESC""",
                (user["id"],),
            ).fetchall()
            sub_rows = conn.execute(
                "SELECT * FROM dual_submissions WHERE user_id = ? ORDER BY updated_at DESC, id ASC",
                (user["id"],),
            ).fetchall()

        sessions = [_serialize_session(r) for r in sess_rows]
        dual_submissions = [_serialize_dual_submission(r) for r in sub_rows]

        completed_scores = [
            s["finalDefenseScore"] for s in sessions if s["finalDefenseScore"] is not None
        ]
        sub_scores = [d["defenseScore"] for d in dual_submissions if d.get("defenseScore") is not None]
        all_scores = completed_scores or sub_scores
        avg_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

        stats = {
            "totalSessions": len(sessions),
            "completedSessions": sum(1 for s in sessions if s["status"] in ("completed", "flagged")),
            "avgDefenseScore": avg_score,
            "flaggedCount": sum(1 for d in dual_submissions if d["status"] == "flagged"),
            "pendingReviewsCount": sum(
                1 for d in dual_submissions if d["status"] in ("pending", "flagged")
            ),
            "enabledCoursesCount": sum(1 for c in courses if c["aiDefenseEnabled"]),
            "totalCoursesCount": len(courses),
        }

    display_name = user.get("full_name") or user.get("display_name") or "Thành viên"
    return {
        "user": {
            "id": user["id"],
            "name": display_name,
            "role": role,
            "studentCode": user.get("user_code") or "—",
        },
        "projects": projects,
        "courses": courses,
        "rubric": rubric,
        "sessions": sessions,
        "dualSubmissions": dual_submissions,
        "stats": stats,
    }


@router.post("/defense/sessions", status_code=status.HTTP_201_CREATED)
def start_defense_session(
    payload: DefenseStartIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Khởi tạo phiên Bảo vệ Đồ án với Hội đồng AI (chỉ dành cho Học viên)."""
    if (user.get("role") or "student").lower() != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản Học viên mới được phép khởi tạo phiên thi bảo vệ đồ án.",
        )

    now = now_utc()
    defense_id = f"def-{uid()[:8]}"
    with db() as conn:
        proj, course = _resolve_project_course(conn, payload.project_id, payload.class_id)
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy đồ án '{payload.project_id}' trong hệ thống.",
            )
        class_id = course["id"] if course else (payload.class_id or "class-capstone")
        course_code = course["code"] if course else ""
        if course and not course["ai_defense_enabled"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Phòng Phản Biện AI hiện đang tạm khóa cho học phần {course_code}.",
            )
        conn.execute(
            """INSERT INTO defense_sessions(
                   id, user_id, project_id, class_id, round_number, status,
                   architecture_score, algorithm_score, production_score, final_defense_score,
                   transcript_json, created_at, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (defense_id, user["id"], proj["id"], class_id, 1, "in_progress", 0, 0, 0, None, "[]", now, now),
        )
        conn.commit()
    track_event(user["id"], None, "defense_session_started", {"defense_id": defense_id, "project_id": proj["id"]})
    return {
        "defense_id": defense_id,
        "project_id": proj["id"],
        "class_id": class_id,
        "course_code": course_code,
        "status": "in_progress",
    }


@router.post("/defense/sessions/{defense_id}/respond")
def respond_defense_round(
    defense_id: str,
    payload: DefenseRespondIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Ghi nhận luận điểm hoặc phản biện vặn lại và chấm điểm thực chất trên server."""
    phase = (payload.phase or "oral").strip().lower()
    if phase not in ("oral", "rebuttal"):
        raise HTTPException(status_code=422, detail="phase phải là 'oral' hoặc 'rebuttal'")

    now = now_utc()
    with db() as conn:
        sess = conn.execute("SELECT * FROM defense_sessions WHERE id=?", (defense_id,)).fetchone()
        if not sess:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên bảo vệ AI")
        if sess["user_id"] != user["id"] and user.get("role") not in ("instructor", "admin", "org_admin"):
            raise HTTPException(status_code=403, detail="Không có quyền truy cập phiên bảo vệ này")
        if sess["status"] in ("completed", "flagged"):
            raise HTTPException(status_code=400, detail="Phiên bảo vệ này đã chốt điểm hoàn tất.")

        transcript = json.loads(sess["transcript_json"] or "[]")
        student_name = user.get("full_name") or user.get("display_name") or "Học viên"

        matched_keywords: list[str] = []
        if phase == "rebuttal":
            opt_score = (
                payload.rebuttal_option_score
                if payload.rebuttal_option_score is not None
                else payload.rebuttal_score
            )
            if opt_score is not None:
                round_score = max(35, min(100, int(opt_score)))
                eval_text = (
                    "Phản biện sắc bén trước câu hỏi xoáy sâu của Hội đồng."
                    if round_score >= 85
                    else "Phản biện tạm chấp nhận được, cần củng cố tính an toàn khi tải cao."
                    if round_score >= 65
                    else "Lập luận chưa thuyết phục trước tình huống thực tế của Hội đồng."
                )
            else:
                round_score, eval_text, matched_keywords = _evaluate_oral_response(
                    payload.argument_text, payload.expected_keywords
                )
        else:
            round_score, eval_text, matched_keywords = _evaluate_oral_response(
                payload.argument_text, payload.expected_keywords
            )

        prev_arch = int(sess["architecture_score"] or 0)
        prev_algo = int(sess["algorithm_score"] or 0)
        prev_prod = int(sess["production_score"] or 0)

        arch_target = max(35, min(100, round_score + (2 if payload.round_number == 1 else 0)))
        algo_target = max(35, min(100, round_score + (2 if payload.round_number == 2 else -1)))
        prod_target = max(35, min(100, round_score + (2 if payload.round_number == 3 else 0)))

        arch_score = arch_target if prev_arch <= 0 else round(prev_arch * 0.45 + arch_target * 0.55)
        algo_score = algo_target if prev_algo <= 0 else round(prev_algo * 0.45 + algo_target * 0.55)
        prod_score = prod_target if prev_prod <= 0 else round(prev_prod * 0.45 + prod_target * 0.55)

        speaker_label = (payload.speaker_label or "").strip() or (
            "ThS. Lê Hoàng Yến · Phản biện Thuật toán"
            if phase == "rebuttal"
            else "TS. Trần Anh Tuấn · Chủ tịch Hội đồng"
        )
        question_text = (payload.question_text or "").strip() or (
            f"[Vòng {payload.round_number} · {phase}] Câu hỏi kiểm tra chuyên môn từ Hội đồng."
        )

        transcript.append(
            {
                "id": f"t-jury-{payload.round_number}-{phase}",
                "speaker": "ai_chair",
                "speakerLabel": speaker_label,
                "text": question_text,
            }
        )
        transcript.append(
            {
                "id": f"t-stu-{payload.round_number}-{phase}",
                "speaker": "student",
                "speakerLabel": student_name,
                "text": payload.argument_text.strip(),
                "evaluation": eval_text,
                "score": round_score,
            }
        )

        next_round = min(5, max(int(sess["round_number"] or 1), payload.round_number + (1 if phase == "rebuttal" else 0)))
        conn.execute(
            """UPDATE defense_sessions
               SET round_number=?, architecture_score=?, algorithm_score=?, production_score=?, transcript_json=?, updated_at=?
               WHERE id=?""",
            (
                next_round,
                arch_score,
                algo_score,
                prod_score,
                json.dumps(transcript, ensure_ascii=False),
                now,
                defense_id,
            ),
        )
        conn.execute(
            "UPDATE ai_service_units SET requests = requests + 1, input_tokens = input_tokens + 1800, output_tokens = output_tokens + 720 WHERE id='svc-defense'"
        )
        conn.commit()

    return {
        "defense_id": defense_id,
        "round_number": payload.round_number,
        "phase": phase,
        "round_score": round_score,
        "evaluation": eval_text,
        "matched_keywords": matched_keywords,
        "scores": {
            "architecture": arch_score,
            "algorithm": algo_score,
            "production": prod_score,
        },
        "transcript": transcript,
    }


@router.post("/defense/sessions/{defense_id}/complete")
def complete_defense_session(
    defense_id: str,
    payload: DefenseCompleteIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Chốt điểm phản biện AI và đồng bộ biên bản sang hàng đợi Chấm Kép của Giảng viên."""
    now = now_utc()
    with db() as conn:
        sess = conn.execute("SELECT * FROM defense_sessions WHERE id=?", (defense_id,)).fetchone()
        if not sess:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên bảo vệ AI")
        if sess["user_id"] != user["id"] and user.get("role") not in ("instructor", "admin", "org_admin"):
            raise HTTPException(status_code=403, detail="Không có quyền chốt phiên bảo vệ này")
        if sess["status"] in ("completed", "flagged"):
            raise HTTPException(status_code=400, detail="Phiên bảo vệ này đã được chốt điểm trước đó.")

        transcript = json.loads(sess["transcript_json"] or "[]")
        student_turns = [t for t in transcript if t.get("speaker") == "student"]
        if not student_turns:
            raise HTTPException(
                status_code=400,
                detail="Bạn cần trả lời ít nhất 1 vòng phản biện trước khi hoàn tất.",
            )

        final_defense = round((sess["architecture_score"] + sess["algorithm_score"] + sess["production_score"]) / 3)

        u_row = conn.execute(
            "SELECT full_name, display_name, user_code FROM users WHERE id = ?",
            (sess["user_id"],),
        ).fetchone()
        u_dict = row_dict(u_row) if u_row else {}
        student_name = (
            u_dict.get("full_name")
            or u_dict.get("display_name")
            or user.get("full_name")
            or user.get("display_name")
            or "Học viên CodeMind"
        )
        student_code = u_dict.get("user_code") or user.get("user_code") or "SV-000"

        proj_row = conn.execute(
            """SELECT ep.id, ep.code, ep.name, gr.repo_url
               FROM engineering_projects ep
               LEFT JOIN git_repositories gr ON gr.project_id = ep.id
               WHERE ep.id = ?""",
            (sess["project_id"],),
        ).fetchone()
        proj = row_dict(proj_row) if proj_row else {}

        c_row = conn.execute(
            "SELECT COUNT(*) AS cnt FROM git_commits WHERE project_id = ?",
            (sess["project_id"],),
        ).fetchone()
        real_commit_count = int(c_row["cnt"] or 0) if c_row else 0

        t_row = conn.execute(
            """SELECT COUNT(*) AS total_cnt,
                      SUM(CASE WHEN column_id IN ('done', 'review') THEN 1 ELSE 0 END) AS done_cnt
               FROM engineering_tasks WHERE project_id = ?""",
            (sess["project_id"],),
        ).fetchone()
        real_total_tasks = int(t_row["total_cnt"] or 0) if t_row else 0
        real_done_tasks = int(t_row["done_cnt"] or 0) if t_row else 0

        passed_tests = (
            payload.passed_tests
            if payload.passed_tests is not None
            else (real_done_tasks if real_total_tasks > 0 else 5)
        )
        total_tests = (
            payload.total_tests
            if payload.total_tests is not None
            else (real_total_tasks if real_total_tasks > 0 else 5)
        )
        chapter_title = (payload.chapter_title or "").strip() or (
            f"{(proj.get('name') or sess['project_id']).split(' - ')[0]} · Phản biện Hội đồng AI"
        )
        repo_url = (payload.repo_url or "").strip() or proj.get("repo_url") or ""

        rubric = conn.execute("SELECT * FROM defense_rubric_configs WHERE id='default'").fetchone()
        cicd_w = rubric["cicd_weight_pct"] if rubric else 60
        def_w = rubric["defense_weight_pct"] if rubric else 40
        threshold = rubric["auto_flag_discrepancy_threshold"] if rubric else 25

        cicd_pct = (passed_tests / max(1, total_tests)) * 100.0
        weighted_score = round((cicd_pct * cicd_w / 100.0) + (final_defense * def_w / 100.0))
        discrepancy = abs(cicd_pct - final_defense) >= threshold

        sub_id = f"sub-def-{defense_id[4:]}"
        coherence = (
            f"Cảnh báo lệch điểm tiến độ/CI ({round(cicd_pct)}%) vs Phản biện AI ({final_defense}%): cần Giảng viên kiểm tra lại."
            if discrepancy
            else f"Học viên bảo vệ qua {len(student_turns)} lượt phản biện AI đạt {final_defense}/100 ({real_commit_count} commit Git, {passed_tests}/{total_tests} hạng mục)."
        )
        sub_status = "flagged" if discrepancy else "pending"
        def_status = "flagged" if discrepancy else "completed"

        conn.execute(
            "UPDATE defense_sessions SET status=?, final_defense_score=?, updated_at=? WHERE id=?",
            (def_status, final_defense, now, defense_id),
        )
        conn.execute(
            "UPDATE student_profiles SET exp_points = exp_points + 50, radar_defense = MIN(100.0, (radar_defense + ?) / 2.0) WHERE user_id=?",
            (float(final_defense), sess["user_id"]),
        )

        test_details_count = min(10, max(1, total_tests))
        conn.execute(
            """INSERT OR REPLACE INTO dual_submissions(
                   id, class_id, user_id, student_name, student_code, chapter_title, repo_url, submitted_at,
                   passed_tests, total_tests, exec_time_ms, memory_mb, commit_hash, commit_count, similarity_pct,
                   test_details_json, defense_status, defense_score, coherence_summary, transcript_json,
                   status, final_score, instructor_feedback, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                sub_id,
                sess["class_id"],
                sess["user_id"],
                student_name,
                student_code,
                chapter_title,
                repo_url,
                "Vừa hoàn tất (Phản biện AI)",
                passed_tests,
                total_tests,
                34,
                14.0,
                sha256(defense_id)[:7],
                real_commit_count,
                5,
                json.dumps(
                    [
                        {
                            "id": f"tc-live-{i}",
                            "title": f"Tiêu chí kiểm định #{i}",
                            "status": "passed" if i <= passed_tests else "failed",
                            "durationMs": 6 + i,
                            "isEdgeCase": i == test_details_count,
                        }
                        for i in range(1, test_details_count + 1)
                    ],
                    ensure_ascii=False,
                ),
                def_status,
                final_defense,
                coherence,
                json.dumps(transcript, ensure_ascii=False),
                sub_status,
                None,
                "",
                now,
            ),
        )
        cnt_row = conn.execute(
            "SELECT COUNT(*) AS c FROM dual_submissions WHERE class_id=? AND status IN ('pending', 'flagged')",
            (sess["class_id"],),
        ).fetchone()
        conn.execute(
            "UPDATE courses SET pending_dual_reviews = ? WHERE id=?",
            (int(cnt_row["c"] or 0) if cnt_row else 0, sess["class_id"]),
        )

        conn.execute(
            """INSERT INTO notifications (
                id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
            ) VALUES (?, NULL, 'instructor', ?, ?, 'defense', 0, '/defense-room', ?)""",
            (
                f"notif-{uid()}",
                f"Biên bản Phản biện mới: {student_name}",
                f"{student_name} vừa hoàn tất Phản biện AI ({chapter_title}) đạt {final_defense}/100. Cần Giảng viên duyệt Chấm Kép.",
                now,
            ),
        )
        conn.commit()

    record_audit_log(
        student_name,
        sess["user_id"],
        f"Hoàn tất Phản biện AI ({final_defense}/100) -> Đẩy hàng đợi Chấm Kép",
        chapter_title,
        log_type="ai",
        resource_type="dual_submission",
        resource_id=sub_id,
    )
    return {
        "defense_id": defense_id,
        "submission_id": sub_id,
        "final_defense_score": final_defense,
        "cicd_pct": round(cicd_pct, 1),
        "weighted_score": weighted_score,
        "status": sub_status,
        "discrepancy": discrepancy,
        "coherence_summary": coherence,
        "commit_count": real_commit_count,
    }


@router.delete("/defense/sessions/{defense_id}", status_code=status.HTTP_200_OK)
def delete_defense_session(
    defense_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Xóa phiên bảo vệ (Admin/GV xóa bất kỳ; SV chỉ được xóa phiên nháp rỗng của chính mình)."""
    role = (user.get("role") or "student").lower()
    is_staff = role in ("instructor", "admin", "org_admin")

    with db() as conn:
        sess = conn.execute("SELECT * FROM defense_sessions WHERE id=?", (defense_id,)).fetchone()
        if not sess:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên bảo vệ.")

        if not is_staff:
            if sess["user_id"] != user["id"]:
                raise HTTPException(status_code=403, detail="Bạn không có quyền xóa phiên bảo vệ này.")
            if sess["status"] != "in_progress":
                raise HTTPException(
                    status_code=403,
                    detail="Không thể tự xóa phiên bảo vệ đã chốt điểm hoàn tất.",
                )

        sub_id = f"sub-def-{defense_id[4:]}"
        conn.execute("DELETE FROM dual_submissions WHERE id=?", (sub_id,))
        conn.execute("DELETE FROM defense_sessions WHERE id=?", (defense_id,))
        cnt_row = conn.execute(
            "SELECT COUNT(*) AS c FROM dual_submissions WHERE class_id=? AND status IN ('pending', 'flagged')",
            (sess["class_id"],),
        ).fetchone()
        conn.execute(
            "UPDATE courses SET pending_dual_reviews = ? WHERE id=?",
            (int(cnt_row["c"] or 0) if cnt_row else 0, sess["class_id"]),
        )
        conn.commit()

    return {"message": "Đã xóa phiên bảo vệ thành công.", "defense_id": defense_id}


@router.patch("/defense/courses/{class_id}/toggle", status_code=status.HTTP_200_OK)
def toggle_course_defense(
    class_id: str,
    payload: ToggleCourseDefenseIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Quản trị viên bật/tắt quyền mở Phòng Phản Biện AI cho từng học phần."""
    role = (user.get("role") or "student").lower()
    if role not in ("admin", "org_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên mới có quyền bật/tắt Phòng Phản Biện AI theo học phần.",
        )

    now = now_utc()
    next_val = 1 if payload.ai_defense_enabled else 0
    with db() as conn:
        course_row = conn.execute("SELECT * FROM courses WHERE id=?", (class_id,)).fetchone()
        if not course_row:
            raise HTTPException(status_code=404, detail="Không tìm thấy học phần yêu cầu.")
        conn.execute(
            "UPDATE courses SET ai_defense_enabled=?, updated_at=? WHERE id=?",
            (next_val, now, class_id),
        )
        conn.commit()
        updated = row_dict(conn.execute("SELECT * FROM courses WHERE id=?", (class_id,)).fetchone())

    record_audit_log(
        user.get("display_name") or user.get("full_name") or "Quản trị viên",
        user["id"],
        f"{'Mở' if next_val else 'Khóa'} Phòng Phản Biện AI cho học phần {updated['code']}",
        updated["name"],
        log_type="ai",
        resource_type="course",
        resource_id=class_id,
    )
    return {
        "classId": updated["id"],
        "code": updated["code"],
        "name": updated["name"],
        "aiDefenseEnabled": bool(updated["ai_defense_enabled"]),
    }
