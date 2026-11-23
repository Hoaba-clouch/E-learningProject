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
    DefensePackageIn,
    DefenseRespondIn,
    DefenseStartIn,
    LiveCouncilGradeIn,
    ToggleCourseDefenseIn,
)
from app.services.analytics import track_event
from app.services.gemini_client import generate_json, record_ai_usage

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


def _evaluate_oral_with_gemini(
    question_text: str,
    speaker_label: str,
    argument_text: str,
    expected_keywords: list[str],
    service_active: bool = True,
) -> tuple[int, str, list[str], str, int, int]:
    """Chấm điểm tự luận Phản biện qua Google Gemini LLM, tự động fallback về bộ chấm điểm từ khóa nếu lỗi."""
    base_score, base_feedback, base_matched = _evaluate_oral_response(argument_text, expected_keywords)
    raw_tokens = TOKEN_RE.findall((argument_text or "").strip().lower())
    word_count = len(raw_tokens)

    # Chặn spam/quá ngắn bằng fast-path trước để bảo toàn tốc độ và hạn mức API
    if not service_active or base_score <= 42 or word_count < 6:
        return base_score, base_feedback, base_matched, "local-guard", 0, 0

    kw_str = ", ".join(k.strip() for k in (expected_keywords or []) if k and k.strip()) or "Kiến trúc, Thuật toán, Vận hành"
    llm_res = generate_json(
        prompt=(
            f"Giám khảo hỏi: {speaker_label}\n"
            f"Câu hỏi bảo vệ: {question_text}\n"
            f"Từ khóa kỹ thuật kỳ vọng: {kw_str}\n"
            f"Câu trả lời của sinh viên: {argument_text.strip()}\n\n"
            "Hãy chấm điểm câu trả lời trên thang 0-100 và trả về JSON đúng cấu trúc:\n"
            '{"score": 85, "feedback": "Nhận xét kỹ thuật 2 câu ngắn gọn bằng tiếng Việt (nêu điểm mạnh và 1 điểm cần làm rõ).", "matched_keywords": ["..."]}'
        ),
        system_instruction=(
            "Bạn là Giám khảo Hội đồng Bảo vệ Đồ án Kỹ thuật Phần mềm. "
            "Chấm khách quan: nếu câu trả lời hời hợt hoặc thiếu căn cứ kỹ thuật chỉ chấm 45-62; "
            "nếu nêu đúng kiến trúc/trade-off/từ khóa kỹ thuật chấm 80-96. Luôn trả JSON thuần."
        ),
        temperature=0.25,
        max_output_tokens=320,
    )
    if not llm_res:
        return base_score, base_feedback, base_matched, "local-heuristic", 0, 0

    parsed, meta = llm_res
    if not isinstance(parsed, dict):
        return base_score, base_feedback, base_matched, "local-heuristic", 0, 0

    try:
        llm_score = int(parsed.get("score") or base_score)
    except Exception:
        llm_score = base_score

    if word_count < 8:
        llm_score = min(58, max(35, llm_score))
    else:
        llm_score = max(40, min(98, llm_score))

    # Nếu sinh viên đã trả lời dài >= 18 từ & khớp >= 2 từ khóa, đảm bảo công bằng tối thiểu
    if word_count >= 18 and len(base_matched) >= 2:
        llm_score = max(llm_score, 80)

    llm_feedback = str(parsed.get("feedback") or "").strip() or base_feedback
    raw_llm_kw = parsed.get("matched_keywords")
    valid_llm_kw = [str(x).strip() for x in raw_llm_kw if str(x).strip()] if isinstance(raw_llm_kw, list) else []
    merged_kw = list(dict.fromkeys([*base_matched, *valid_llm_kw]))[:8]

    return (
        llm_score,
        llm_feedback,
        merged_kw,
        str(meta.get("model") or "gemini"),
        int(meta.get("input_tokens") or 0),
        int(meta.get("output_tokens") or 0),
    )


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
            """SELECT ep.id, ep.code, ep.name, ep.course, ep.status, ep.is_frozen, gr.repo_url
               FROM engineering_projects ep
               LEFT JOIN git_repositories gr ON gr.project_id = ep.id
               ORDER BY ep.id ASC"""
        ).fetchall()
        pkg_rows = {
            r["project_id"]: row_dict(r) or {}
            for r in conn.execute("SELECT project_id, demo_url, slide_url, report_url FROM project_defense_packages").fetchall()
        }
        eval_rows: dict[str, dict[str, Any]] = {}
        for er in conn.execute(
            "SELECT project_id, final_score, graded_at, status FROM project_evaluations ORDER BY graded_at ASC"
        ).fetchall():
            eval_rows[er["project_id"]] = row_dict(er) or {}
        practice_counts = {
            r["project_id"]: int(r["cnt"] or 0)
            for r in conn.execute(
                "SELECT project_id, COUNT(*) AS cnt FROM defense_sessions GROUP BY project_id"
            ).fetchall()
        }

        projects = []
        for p in proj_rows:
            c_code = (p["course"] or "").split("·")[0].strip().upper()
            matched_c = courses_by_code.get(c_code)
            done_cnt, total_cnt = task_stats.get(p["id"], (0, 0))
            pkg = pkg_rows.get(p["id"], {})
            ev = eval_rows.get(p["id"])
            projects.append(
                {
                    "id": p["id"],
                    "code": p["code"],
                    "name": p["name"],
                    "course": p["course"],
                    "status": p["status"],
                    "isFrozen": bool(p["is_frozen"]),
                    "hasDefensePackage": bool((pkg.get("demo_url") or "").strip()),
                    "demoUrl": (pkg.get("demo_url") or "").strip(),
                    "isGraded": bool(ev),
                    "officialFinalScore": round(float(ev["final_score"]), 2) if ev and ev.get("final_score") is not None else None,
                    "officialGradedAt": ev.get("graded_at") if ev else None,
                    "practiceCount": practice_counts.get(p["id"], 0),
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
            "gradedProjectsCount": sum(1 for pr in projects if pr.get("isGraded")),
            "totalProjectsCount": len(projects),
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
        svc_row = conn.execute("SELECT active FROM ai_service_units WHERE id='svc-defense'").fetchone()
        defense_ai_active = bool(svc_row["active"]) if svc_row else True
        sess_snapshot = row_dict(sess) or {}

    speaker_label = (payload.speaker_label or "").strip() or (
        "ThS. Lê Hoàng Yến · Phản biện Thuật toán"
        if phase == "rebuttal"
        else "TS. Trần Anh Tuấn · Chủ tịch Hội đồng"
    )
    question_text = (payload.question_text or "").strip() or (
        f"[Vòng {payload.round_number} · {phase}] Câu hỏi kiểm tra chuyên môn từ Hội đồng."
    )

    matched_keywords: list[str] = []
    ai_model = "local-rebuttal"
    in_tok = 0
    out_tok = 0

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
            round_score, eval_text, matched_keywords, ai_model, in_tok, out_tok = _evaluate_oral_with_gemini(
                question_text,
                speaker_label,
                payload.argument_text,
                payload.expected_keywords,
                service_active=defense_ai_active,
            )
    else:
        round_score, eval_text, matched_keywords, ai_model, in_tok, out_tok = _evaluate_oral_with_gemini(
            question_text,
            speaker_label,
            payload.argument_text,
            payload.expected_keywords,
            service_active=defense_ai_active,
        )

    with db() as conn:
        transcript = json.loads(sess_snapshot.get("transcript_json") or "[]")
        student_name = user.get("full_name") or user.get("display_name") or "Học viên"

        prev_arch = int(sess_snapshot.get("architecture_score") or 0)
        prev_algo = int(sess_snapshot.get("algorithm_score") or 0)
        prev_prod = int(sess_snapshot.get("production_score") or 0)

        arch_target = max(35, min(100, round_score + (2 if payload.round_number == 1 else 0)))
        algo_target = max(35, min(100, round_score + (2 if payload.round_number == 2 else -1)))
        prod_target = max(35, min(100, round_score + (2 if payload.round_number == 3 else 0)))

        arch_score = arch_target if prev_arch <= 0 else round(prev_arch * 0.45 + arch_target * 0.55)
        algo_score = algo_target if prev_algo <= 0 else round(prev_algo * 0.45 + algo_target * 0.55)
        prod_score = prod_target if prev_prod <= 0 else round(prev_prod * 0.45 + prod_target * 0.55)

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

        next_round = min(5, max(int(sess_snapshot.get("round_number") or 1), payload.round_number + (1 if phase == "rebuttal" else 0)))
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
        record_ai_usage(conn, "svc-defense", in_tok or 680, out_tok or 280)
        conn.commit()

    return {
        "defense_id": defense_id,
        "round_number": payload.round_number,
        "phase": phase,
        "round_score": round_score,
        "evaluation": eval_text,
        "matched_keywords": matched_keywords,
        "ai_model": ai_model,
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
            f"Cảnh báo luyện tập lệch chỉ số tiến độ ({round(cicd_pct)}%) vs AI Mock ({final_defense}%): Giảng viên cần kiểm tra kỹ khi hỏi đáp trực tiếp."
            if discrepancy
            else f"Luyện tập Phản biện AI (Mock Readiness) đạt {final_defense}/100 ({real_commit_count} commit Git, {passed_tests}/{total_tests} hạng mục). Điểm chính thức do Hội đồng chấm trực tiếp."
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


def _validate_optional_http_url(raw_url: str | None, field_label: str) -> str:
    clean = (raw_url or "").strip()
    if not clean:
        return ""
    if not (clean.startswith("http://") or clean.startswith("https://")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_label} phải bắt đầu bằng http:// hoặc https://",
        )
    return clean


def _match_member_by_name(author_name: str | None, member_stats: dict[str, dict[str, Any]]) -> str | None:
    clean_author = (author_name or "").strip().lower()
    if not clean_author:
        return None
    for mid, st in member_stats.items():
        mname = (st.get("name") or "").strip().lower()
        if not mname:
            continue
        if clean_author == mname or (len(mname) >= 4 and (mname in clean_author or clean_author in mname)):
            return mid
    return None


def _serialize_official_evaluation(eval_row: Any) -> dict[str, Any]:
    if not eval_row:
        return {"isGraded": False}
    ev = row_dict(eval_row) or {}
    try:
        member_scores = json.loads(ev.get("member_scores_json") or "[]")
    except Exception:
        member_scores = []
    try:
        council_notes = json.loads(ev.get("council_notes_json") or "{}")
    except Exception:
        council_notes = {}
    if not isinstance(council_notes, dict):
        council_notes = {}

    demo_raw = ev.get("demo_score")
    demo_val = float(demo_raw) if demo_raw is not None else float(ev.get("group_score") or 0)
    return {
        "isGraded": True,
        "evalId": ev["id"],
        "groupScore": round(float(ev.get("group_score") or 0), 2),
        "demoScore": round(demo_val, 2),
        "architectureScore": round(float(ev.get("architecture_score") or 0), 2),
        "processScore": round(float(ev.get("process_score") or 0), 2),
        "defenseScore": round(float(ev.get("defense_score") or 0), 2),
        "finalScore": round(float(ev.get("final_score") or 0), 2),
        "feedback": ev.get("feedback") or "",
        "verdict": council_notes.get("verdict")
        or ("fail" if ev.get("status") == "redefense_required" else "pass"),
        "councilMembers": council_notes.get("council_members") or "",
        "demoVerified": bool(council_notes.get("demo_verified", True)),
        "repoVerified": bool(council_notes.get("repo_verified", True)),
        "frozenVerified": bool(council_notes.get("frozen_verified", False)),
        "graderName": ev.get("grader_name") or "Hội đồng Bảo vệ Đồ án",
        "defenseDate": ev.get("defense_date") or ev.get("graded_at") or "",
        "gradedAt": ev.get("graded_at") or "",
        "status": ev.get("status") or "graded",
        "memberScores": member_scores if isinstance(member_scores, list) else [],
    }


def _build_project_defense_dossier(conn: Any, project_id: str) -> dict[str, Any]:
    proj_row = conn.execute(
        "SELECT * FROM engineering_projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not proj_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy dự án '{project_id}' trong hệ thống.",
        )
    proj = row_dict(proj_row) or {}

    repo_row = conn.execute(
        "SELECT * FROM git_repositories WHERE project_id = ?", (project_id,)
    ).fetchone()
    repo = row_dict(repo_row) if repo_row else {}

    commit_rows = conn.execute(
        """SELECT id, sha, author_name, branch, task_code, message,
                  time_ago_label, additions, deletions
           FROM git_commits WHERE project_id = ?
           ORDER BY position_order DESC, created_at DESC""",
        (project_id,),
    ).fetchall()
    pr_rows = conn.execute(
        """SELECT id, pr_number, title, source_branch, target_branch,
                  task_code, author_name, status, ai_review_score, peer_approved
           FROM git_pull_requests WHERE project_id = ?
           ORDER BY pr_number DESC""",
        (project_id,),
    ).fetchall()
    task_rows = conn.execute(
        """SELECT id, code, title, description, column_id, priority,
                  points, assignee_json, epic, dod_json, submission_url, updated_at
           FROM engineering_tasks WHERE project_id = ?
           ORDER BY position_order ASC, updated_at DESC""",
        (project_id,),
    ).fetchall()

    try:
        team = json.loads(proj.get("team_json") or "[]")
    except Exception:
        team = []
    if not isinstance(team, list):
        team = []

    member_stats: dict[str, dict[str, Any]] = {}
    for idx, m in enumerate(team):
        mid = str(m.get("id") or f"mem-{idx+1}")
        member_stats[mid] = {
            "member_id": mid,
            "name": str(m.get("name") or f"Thành viên {idx+1}"),
            "role": str(m.get("role") or "Developer"),
            "avatar": str(m.get("avatar") or ""),
            "total_tasks": 0,
            "done_tasks": 0,
            "verified_tasks": 0,
            "completed_points": 0,
            "total_points": 0,
            "dod_completed": 0,
            "dod_total": 0,
            "commits_count": 0,
            "prs_count": 0,
            "top_tasks": [],
        }

    total_done_points = 0
    total_points = 0
    done_tasks_total = 0
    verified_tasks_total = 0
    epics_seen: list[str] = []
    recent_tasks: list[dict[str, Any]] = []

    for t in task_rows:
        td = row_dict(t) or {}
        pts = int(td.get("points") or 0)
        col = td.get("column_id") or "backlog"
        epic = str(td.get("epic") or "Sprint Goal").strip()
        if epic and epic not in epics_seen:
            epics_seen.append(epic)
        try:
            assignee = json.loads(td.get("assignee_json") or "{}")
        except Exception:
            assignee = {}
        try:
            dods = json.loads(td.get("dod_json") or "[]")
        except Exception:
            dods = []

        total_points += pts
        is_done = col in ("done", "verified")
        if is_done:
            done_tasks_total += 1
            total_done_points += pts
        if col == "verified":
            verified_tasks_total += 1

        m_id = assignee.get("id")
        matched_mid = m_id if (m_id and m_id in member_stats) else _match_member_by_name(assignee.get("name"), member_stats)
        if matched_mid:
            st = member_stats[matched_mid]
            st["total_tasks"] += 1
            st["total_points"] += pts
            st["dod_total"] += len(dods)
            st["dod_completed"] += sum(1 for d in dods if d.get("done"))
            if is_done:
                st["done_tasks"] += 1
                st["completed_points"] += pts
            if col == "verified":
                st["verified_tasks"] += 1
            if len(st["top_tasks"]) < 4:
                st["top_tasks"].append(f"{td.get('code', 'TASK')}: {td.get('title', '')}")

        if len(recent_tasks) < 10:
            recent_tasks.append(
                {
                    "id": td["id"],
                    "code": td.get("code") or "",
                    "title": td.get("title") or "",
                    "columnId": col,
                    "points": pts,
                    "epic": epic,
                    "assigneeName": assignee.get("name") or "Chưa gán",
                    "submissionUrl": td.get("submission_url") or "",
                }
            )

    recent_commits = []
    for c in commit_rows:
        cd = row_dict(c) or {}
        matched_mid = _match_member_by_name(cd.get("author_name"), member_stats)
        if matched_mid:
            member_stats[matched_mid]["commits_count"] += 1
        if len(recent_commits) < 8:
            recent_commits.append(
                {
                    "id": cd["id"],
                    "sha": cd.get("sha") or "",
                    "authorName": cd.get("author_name") or "",
                    "branch": cd.get("branch") or "main",
                    "taskCode": cd.get("task_code") or "",
                    "message": cd.get("message") or "",
                    "timeAgo": cd.get("time_ago_label") or "",
                    "additions": int(cd.get("additions") or 0),
                    "deletions": int(cd.get("deletions") or 0),
                }
            )

    recent_prs = []
    for pr in pr_rows:
        pd = row_dict(pr) or {}
        matched_mid = _match_member_by_name(pd.get("author_name"), member_stats)
        if matched_mid:
            member_stats[matched_mid]["prs_count"] += 1
        if len(recent_prs) < 6:
            recent_prs.append(
                {
                    "id": pd["id"],
                    "prNumber": int(pd.get("pr_number") or 0),
                    "title": pd.get("title") or "",
                    "sourceBranch": pd.get("source_branch") or "",
                    "targetBranch": pd.get("target_branch") or "main",
                    "taskCode": pd.get("task_code") or "",
                    "authorName": pd.get("author_name") or "",
                    "status": pd.get("status") or "open",
                    "aiReviewScore": int(pd.get("ai_review_score") or 90),
                    "peerApproved": bool(pd.get("peer_approved")),
                }
            )

    num_members = max(1, len(member_stats))
    expected_share = 100.0 / num_members
    member_metrics: list[dict[str, Any]] = []
    for st in member_stats.values():
        pct = round(
            (st["completed_points"] / total_done_points * 100.0)
            if total_done_points > 0
            else expected_share,
            1,
        )
        ratio = pct / expected_share if expected_share > 0 else 1.0
        st["contribution_pct"] = pct
        st["suggested_factor"] = round(max(0.7, min(1.15, ratio)), 2)
        member_metrics.append(st)

    pkg_row = conn.execute(
        "SELECT * FROM project_defense_packages WHERE project_id = ?", (project_id,)
    ).fetchone()
    pkg = row_dict(pkg_row) if pkg_row else {}

    eval_row = conn.execute(
        "SELECT * FROM project_evaluations WHERE project_id = ? ORDER BY graded_at DESC LIMIT 1",
        (project_id,),
    ).fetchone()

    sess_rows = conn.execute(
        """SELECT ds.id, ds.round_number, ds.status, ds.final_defense_score,
                  ds.transcript_json, ds.updated_at,
                  COALESCE(NULLIF(u.full_name, ''), u.display_name) AS student_name,
                  u.user_code AS student_code
           FROM defense_sessions ds
           LEFT JOIN users u ON u.id = ds.user_id
           WHERE ds.project_id = ?
           ORDER BY ds.updated_at DESC LIMIT 5""",
        (project_id,),
    ).fetchall()
    practice_sessions = []
    for sr in sess_rows:
        sd = row_dict(sr) or {}
        try:
            tr = json.loads(sd.get("transcript_json") or "[]")
        except Exception:
            tr = []
        practice_sessions.append(
            {
                "id": sd["id"],
                "studentName": sd.get("student_name") or "Học viên",
                "studentCode": sd.get("student_code") or "—",
                "readinessScore": sd.get("final_defense_score"),
                "status": sd.get("status") or "in_progress",
                "roundNumber": int(sd.get("round_number") or 1),
                "updatedAt": sd.get("updated_at") or "",
                "transcriptCount": len(tr) if isinstance(tr, list) else 0,
            }
        )

    demo_url = (pkg.get("demo_url") or "").strip()
    slide_url = (pkg.get("slide_url") or "").strip()
    report_url = (pkg.get("report_url") or "").strip()
    video_url = (pkg.get("video_url") or "").strip()
    repo_url = (repo.get("repo_url") or "").strip()

    return {
        "project": {
            "id": proj["id"],
            "code": proj.get("code") or "",
            "name": proj.get("name") or "",
            "client": proj.get("client") or "",
            "course": proj.get("course") or "",
            "status": proj.get("status") or "active",
            "sprint": proj.get("sprint") or "",
            "isFrozen": bool(proj.get("is_frozen")),
            "leaderUserId": proj.get("leader_user_id") or "",
            "instructorName": proj.get("instructor_name") or "",
            "dueDate": proj.get("due_date") or "",
            "storyPointsBudget": int(proj.get("story_points_budget") or 0),
            "repoUrl": repo_url,
            "repoSlug": repo.get("repo_slug") or "",
            "targetBranch": repo.get("target_branch") or "main",
            "totalTasks": len(task_rows),
            "doneTasks": done_tasks_total,
            "verifiedTasks": verified_tasks_total,
            "totalPoints": total_points,
            "completedPoints": total_done_points,
            "commitsCount": len(commit_rows),
            "prsCount": len(pr_rows),
            "epics": epics_seen[:8],
        },
        "package": {
            "demoUrl": demo_url,
            "slideUrl": slide_url,
            "reportUrl": report_url,
            "videoUrl": video_url,
            "repoUrl": repo_url,
            "architectureSummary": (pkg.get("architecture_summary") or "").strip(),
            "memberRolesSummary": (pkg.get("member_roles_summary") or "").strip(),
            "submittedByName": (pkg.get("submitted_by_name") or "").strip(),
            "updatedAt": pkg.get("updated_at") or "",
            "isComplete": bool(demo_url and (slide_url or report_url)),
        },
        "memberMetrics": member_metrics,
        "recentTasks": recent_tasks,
        "recentCommits": recent_commits,
        "recentPullRequests": recent_prs,
        "practiceSessions": practice_sessions,
        "officialEvaluation": _serialize_official_evaluation(eval_row),
    }


@router.get("/defense/projects/{project_id}/dossier", status_code=status.HTTP_200_OK)
def get_project_defense_dossier(
    project_id: str,
    _: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lấy toàn bộ hồ sơ dự án thực tế phục vụ luyện tập & Hội đồng chấm điểm trực tiếp."""
    with db() as conn:
        return _build_project_defense_dossier(conn, project_id)


@router.put("/defense/projects/{project_id}/package", status_code=status.HTTP_200_OK)
def save_project_defense_package(
    project_id: str,
    payload: DefensePackageIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lưu Hồ sơ Bảo vệ Đồ án (Link Demo trực tiếp, Slide, Báo cáo, Video, Tóm tắt kiến trúc)."""
    demo_url = _validate_optional_http_url(payload.demo_url, "Link Live Demo")
    slide_url = _validate_optional_http_url(payload.slide_url, "Link Slide thuyết trình")
    report_url = _validate_optional_http_url(payload.report_url, "Link Báo cáo đồ án")
    video_url = _validate_optional_http_url(payload.video_url, "Link Video demo")
    repo_url = _validate_optional_http_url(payload.repo_url, "Link GitHub Repository")

    now = now_utc()
    actor_name = user.get("full_name") or user.get("display_name") or "Thành viên"
    with db() as conn:
        proj = conn.execute("SELECT id, code, name FROM engineering_projects WHERE id = ?", (project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Không tìm thấy dự án")

        conn.execute(
            """INSERT OR REPLACE INTO project_defense_packages(
                   project_id, demo_url, slide_url, report_url, video_url,
                   architecture_summary, member_roles_summary, submitted_by, submitted_by_name, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (
                project_id,
                demo_url,
                slide_url,
                report_url,
                video_url,
                (payload.architecture_summary or "").strip(),
                (payload.member_roles_summary or "").strip(),
                user["id"],
                actor_name,
                now,
            ),
        )
        if repo_url:
            repo_exists = conn.execute(
                "SELECT project_id FROM git_repositories WHERE project_id = ?", (project_id,)
            ).fetchone()
            if repo_exists:
                conn.execute(
                    "UPDATE git_repositories SET repo_url = ?, updated_at = ? WHERE project_id = ?",
                    (repo_url, now, project_id),
                )
        conn.commit()
        dossier = _build_project_defense_dossier(conn, project_id)

    record_audit_log(
        actor_name,
        user["id"],
        f"Cập nhật Hồ sơ Bảo vệ Đồ án {proj['code']}",
        demo_url or slide_url or proj["name"],
        log_type="project",
        resource_type="defense_package",
        resource_id=project_id,
    )
    return {"status": "saved", "package": dossier["package"], "dossier": dossier}


def _normalize_practice_round(raw_item: Any, fallback_item: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw_item, dict):
        return fallback_item
    out = dict(fallback_item)
    for k in ("phaseTitle", "jurySpeakerId", "question", "evidenceRef", "placeholderExample", "mentorHint"):
        val = str(raw_item.get(k) or "").strip()
        if val:
            out[k] = val
    if out["jurySpeakerId"] not in ("jury-1", "jury-2", "jury-3"):
        out["jurySpeakerId"] = fallback_item["jurySpeakerId"]
    kws = raw_item.get("suggestedKeywords")
    if isinstance(kws, list):
        clean_kws = [str(x).strip() for x in kws if str(x).strip()][:5]
        if clean_kws:
            out["suggestedKeywords"] = clean_kws
    samples = raw_item.get("sampleArguments")
    if isinstance(samples, list) and len(samples) >= 2:
        norm_samples = []
        for idx, s in enumerate(samples[:3]):
            if isinstance(s, dict) and str(s.get("text") or "").strip():
                t_val = s.get("type")
                if t_val not in ("optimal", "acceptable", "flawed"):
                    t_val = ("optimal", "acceptable", "flawed")[min(idx, 2)]
                norm_samples.append(
                    {
                        "id": str(s.get("id") or f"s-{out['roundNumber']}-{idx+1}"),
                        "label": str(s.get("label") or f"Phương án {idx+1}"),
                        "text": str(s.get("text")).strip(),
                        "type": t_val,
                    }
                )
        if len(norm_samples) >= 2:
            out["sampleArguments"] = norm_samples
    dd = raw_item.get("drillDownChallenge")
    if isinstance(dd, dict):
        fb_dd = fallback_item["drillDownChallenge"]
        rebs = dd.get("rebuttalOptions")
        norm_rebs = []
        if isinstance(rebs, list):
            for idx, r in enumerate(rebs[:3]):
                if isinstance(r, dict) and str(r.get("answer") or "").strip():
                    norm_rebs.append(
                        {
                            "id": str(r.get("id") or f"r-{out['roundNumber']}-{idx+1}"),
                            "answer": str(r.get("answer")).strip(),
                            "score": max(35, min(98, int(r.get("score") or (92 if idx == 0 else 74 if idx == 1 else 52)))),
                            "feedback": str(r.get("feedback") or fb_dd["rebuttalOptions"][0]["feedback"]).strip(),
                            "architectureImpact": str(r.get("architectureImpact") or fb_dd["rebuttalOptions"][0]["architectureImpact"]).strip(),
                        }
                    )
        out["drillDownChallenge"] = {
            "criticJuryId": str(dd.get("criticJuryId") or fb_dd["criticJuryId"]),
            "criticName": str(dd.get("criticName") or fb_dd["criticName"]),
            "challengeTitle": str(dd.get("challengeTitle") or fb_dd["challengeTitle"]),
            "criticQuestion": str(dd.get("criticQuestion") or fb_dd["criticQuestion"]),
            "rebuttalOptions": norm_rebs if len(norm_rebs) >= 2 else fb_dd["rebuttalOptions"],
        }
    return out


def _build_deterministic_practice_rounds(dossier: dict[str, Any], student_name: str) -> list[dict[str, Any]]:
    proj = dossier["project"]
    pkg = dossier["package"]
    tasks = dossier["recentTasks"]
    commits = dossier["recentCommits"]
    epics = proj.get("epics") or ["Kiến trúc cốt lõi"]

    top_task = tasks[0] if tasks else {"code": proj["code"], "title": "Luồng nghiệp vụ chính", "epic": epics[0]}
    second_task = tasks[1] if len(tasks) > 1 else top_task
    top_commit = commits[0] if commits else {"sha": "main", "message": "Cấu trúc module hệ thống", "branch": proj["targetBranch"]}
    demo_hint = pkg["demoUrl"] or f"môi trường demo {proj['code']}"
    arch_hint = pkg["architectureSummary"] or f"kiến trúc dự án {proj['name']} ({', '.join(epics[:3])})"

    ev1 = f"Căn cứ dự án {proj['code']}: {proj['doneTasks']}/{proj['totalTasks']} task · Epic {top_task['epic']}"
    ev2 = f"Căn cứ code & Kanban: Task {top_task['code']} ({top_task['title']}) · {proj['commitsCount']} commits Git"
    ev3 = f"Căn cứ Demo & Vận hành: {pkg['demoUrl'] or 'Chưa nộp link Demo'} · {proj['prsCount']} Pull Requests"

    return [
        {
            "roundNumber": 1,
            "phaseTitle": f"Vòng 1 (Mock): Kiến trúc & Dữ liệu thật dự án {proj['code']}",
            "jurySpeakerId": "jury-1",
            "evidenceRef": ev1,
            "question": (
                f"Trong đồ án '{proj['name']}', vì sao nhóm em chọn cấu trúc {arch_hint[:140]}? "
                f"Khi phải mở rộng hoặc đổi công nghệ ở module '{top_task['epic']}', phần nào dễ bị ảnh hưởng dây chuyền nhất?"
            ),
            "suggestedKeywords": ["Phân tách tầng", "Contract API", "Khả năng mở rộng", "Trade-off"],
            "placeholderExample": f"Thưa thầy, ở dự án {proj['code']} nhóm em tách rõ tầng giao tiếp, xử lý nghiệp vụ và truy xuất CSDL...",
            "sampleArguments": [
                {
                    "id": "dyn-1a",
                    "label": "Chuẩn kiến trúc: Nêu rõ phân tầng & đánh đổi",
                    "text": f"Thưa Hội đồng, trong {proj['code']} nhóm em tách biệt tầng UI, tầng xử lý API/Business và CSDL quan hệ; khi mở rộng {top_task['epic']} chỉ cần cập nhật schema và service mà không vỡ hợp đồng dữ liệu.",
                    "type": "optimal",
                },
                {
                    "id": "dyn-1b",
                    "label": "Trung bình: Mô tả chức năng, thiếu phân tích coupling",
                    "text": f"Dạ nhóm em chia thư mục frontend và backend riêng để dễ làm task {top_task['code']}, khi thêm tính năng thì viết thêm API mới.",
                    "type": "acceptable",
                },
                {
                    "id": "dyn-1c",
                    "label": "Yếu: Làm cho chạy, chưa rõ ranh giới module",
                    "text": "Dạ phần nào chạy được thì nhóm em nối thẳng vào database cho nhanh ạ.",
                    "type": "flawed",
                },
            ],
            "drillDownChallenge": {
                "criticJuryId": "jury-3",
                "criticName": "KS. Nguyễn Bảo Long · Chuyên gia Kiến trúc",
                "challengeTitle": f"Kiểm tra tình huống lỗi khi demo {proj['code']}",
                "criticQuestion": f"Nếu ngay lúc demo tại {demo_hint}, API chính hoặc kết nối CSDL bị chậm/timeout thì màn hình đang chạy xử lý ra sao để không sập phiên trình diễn?",
                "rebuttalOptions": [
                    {
                        "id": "reb-1-best",
                        "answer": "Em bọc timeout, báo trạng thái lỗi rõ ràng cho người dùng kèm nút thử lại, giữ state giao diện an toàn và ghi log phía server để khoanh vùng nhanh.",
                        "score": 93,
                        "feedback": "Tư duy chịu lỗi tốt, giữ ổn định được buổi demo trực tiếp.",
                        "architectureImpact": "+14 Readiness Kiến trúc & Chịu lỗi",
                    },
                    {
                        "id": "reb-1-mid",
                        "answer": "Em kiểm tra mã lỗi HTTP và hiện thông báo thất bại để tải lại trang.",
                        "score": 74,
                        "feedback": "Đạt mức cơ bản, nên bổ sung cơ chế retry/fallback cụ thể hơn khi bảo vệ thật.",
                        "architectureImpact": "+7 Readiness Kiến trúc",
                    },
                    {
                        "id": "reb-1-low",
                        "answer": "Dạ thường chạy local nên ít bị lỗi đó, nếu lỗi thì em F5 lại ạ.",
                        "score": 48,
                        "feedback": "Hội đồng thật sẽ trừ điểm phần xử lý biên và độ tin cậy vận hành.",
                        "architectureImpact": "-10 Readiness Vận hành",
                    },
                ],
            },
            "mentorHint": f"Gợi ý luyện tập cho {student_name}: Nói cụ thể module bạn trực tiếp phụ trách, đừng chỉ đọc lại tên công nghệ.",
        },
        {
            "roundNumber": 2,
            "phaseTitle": f"Vòng 2 (Mock): Truy vấn Code & Commit thật ({top_commit['sha'][:7]})",
            "jurySpeakerId": "jury-2",
            "evidenceRef": ev2,
            "question": (
                f"Thấy lịch sử có task '{top_task['code']} - {top_task['title']}' và commit '{top_commit['message'][:90]}'. "
                f"Em hãy giải thích thuật toán/luồng dữ liệu cốt lõi bên trong phần code đó và các trường hợp biên đã test."
            ),
            "suggestedKeywords": ["Độ phức tạp", "Validate dữ liệu", "Edge case", "Đồng bộ trạng thái"],
            "placeholderExample": f"Ở task {top_task['code']}, đầu vào đi qua bước kiểm tra hợp lệ, xử lý nghiệp vụ và cập nhật trạng thái...",
            "sampleArguments": [
                {
                    "id": "dyn-2a",
                    "label": "Nắm chắc code: Giải thích luồng + case biên",
                    "text": f"Ở task {top_task['code']}, em kiểm tra chặt đầu vào, bảo vệ ràng buộc toàn vẹn dữ liệu ở tầng backend và có test kiểm chứng các case biên (rỗng, trùng lặp, sai quyền) trước khi merge PR vào nhánh {proj['targetBranch']}.",
                    "type": "optimal",
                },
                {
                    "id": "dyn-2b",
                    "label": "Hiểu sơ bộ luồng chính, chưa rõ test biên",
                    "text": f"Em xử lý logic cho {top_task['title']} bằng cách gửi request từ UI lên server lưu vào DB rồi trả kết quả về hiển thị.",
                    "type": "acceptable",
                },
                {
                    "id": "dyn-2c",
                    "label": "Không nhớ rõ phần mình code",
                    "text": "Phần này bữa nhóm ghép code chung nên em không nhớ chính xác từng hàm ạ.",
                    "type": "flawed",
                },
            ],
            "drillDownChallenge": {
                "criticJuryId": "jury-2",
                "criticName": "ThS. Lê Hoàng Yến · Phản biện Thuật toán",
                "challengeTitle": "Thẩm định thực chất (Anti-Freerider)",
                "criticQuestion": f"Nếu Hội đồng yêu cầu em mở IDE sửa trực tiếp một điều kiện lọc ở '{second_task['title']}' trong 2 phút ngay tại buổi bảo vệ, em sẽ sửa file nào và kiểm tra lại bằng cách nào?",
                "rebuttalOptions": [
                    {
                        "id": "reb-2-best",
                        "answer": "Em xác định đúng endpoint/service và component hiển thị tương ứng, sửa điều kiện ở cả backend lẫn schema validate, sau đó chạy test suite + kiểm tra network payload ngay trên trình duyệt.",
                        "score": 94,
                        "feedback": "Chứng minh làm chủ hoàn toàn mã nguồn do chính mình phát triển.",
                        "architectureImpact": "+15 Readiness Làm chủ Codebase",
                    },
                    {
                        "id": "reb-2-mid",
                        "answer": "Em tìm theo tên component giao diện trước rồi lần ngược sang file gọi API để sửa lại điều kiện lọc.",
                        "score": 76,
                        "feedback": "Hợp lý, lưu ý kiểm tra thêm phân quyền/validate phía backend.",
                        "architectureImpact": "+8 Readiness Làm chủ Codebase",
                    },
                    {
                        "id": "reb-2-low",
                        "answer": "Em phải nhờ bạn nhóm trưởng chỉ giúp file đó nằm ở thư mục nào ạ.",
                        "score": 45,
                        "feedback": "Cẩn thận! Nếu lên Hội đồng thật mà không tìm được file mình làm sẽ bị nghi ngại tỷ lệ đóng góp.",
                        "architectureImpact": "-15 Cảnh báo Freerider",
                    },
                ],
            },
            "mentorHint": "Khi bảo vệ thật, thầy cô rất hay mở đúng file bạn commit nhiều nhất và hỏi tại sao viết dòng đó.",
        },
        {
            "roundNumber": 3,
            "phaseTitle": "Vòng 3 (Mock): Kịch bản Demo Trực tiếp & Phản biện Nhóm",
            "jurySpeakerId": "jury-3",
            "evidenceRef": ev3,
            "question": (
                f"Dự án hiện hoàn thành {proj['doneTasks']}/{proj['totalTasks']} task ({proj['completedPoints']} SP) với {proj['commitsCount']} commits. "
                f"Trong 5 phút demo trực tiếp trước Hội đồng, em sẽ trình diễn kịch bản nào chứng minh hệ thống chạy thật chứ không phải mock?"
            ),
            "suggestedKeywords": ["End-to-End", "Dữ liệu thật DB", "Phân quyền", "Anti-Freerider"],
            "placeholderExample": "Em sẽ demo luồng tạo dữ liệu thật, kiểm tra persistence sau khi F5 và minh chứng phân quyền giữa các vai trò...",
            "sampleArguments": [
                {
                    "id": "dyn-3a",
                    "label": "Kịch bản Demo thuyết phục (E2E + F5 + DB + RBAC)",
                    "text": "Em demo trực tiếp luồng nghiệp vụ end-to-end từ tài khoản Học viên sang Giảng viên/Admin trên server đang chạy, nhấn F5 chứng minh dữ liệu lưu thật dưới MySQL, và cố tình gọi API trái quyền để Hội đồng thấy HTTP 403.",
                    "type": "optimal",
                },
                {
                    "id": "dyn-3b",
                    "label": "Demo giao diện các màn hình chính",
                    "text": "Em mở từng màn hình chính của hệ thống cho thầy cô xem giao diện hoạt động và số liệu hiển thị.",
                    "type": "acceptable",
                },
                {
                    "id": "dyn-3c",
                    "label": "Chỉ chiếu slide chụp màn hình",
                    "text": "Dạ máy em nay hơi lag nên nhóm em xin chiếu ảnh chụp trong slide thay demo ạ.",
                    "type": "flawed",
                },
            ],
            "drillDownChallenge": {
                "criticJuryId": "jury-1",
                "criticName": "TS. Trần Anh Tuấn · Chủ tịch Hội đồng",
                "challengeTitle": "Chất vấn Kịch bản Dự phòng Demo",
                "criticQuestion": "Nếu Hội đồng hỏi điểm hạn chế lớn nhất hiện tại của sản phẩm và hướng phát triển tiếp theo, nhóm em trả lời sao cho trung thực mà vẫn thuyết phục?",
                "rebuttalOptions": [
                    {
                        "id": "reb-3-best",
                        "answer": "Em nêu thẳng 1–2 giới hạn kỹ thuật có thật (ví dụ tải đồng thời / tự động CI CD / mở rộng container) kèm lộ trình nâng cấp cụ thể và lý do chọn ưu tiên phạm vi MVP hiện tại.",
                        "score": 95,
                        "feedback": "Trung thực, có tư duy kỹ sư và kiểm soát được phạm vi đồ án.",
                        "architectureImpact": "+15 Readiness Sẵn sàng Hội đồng",
                    },
                    {
                        "id": "reb-3-mid",
                        "answer": "Sản phẩm hiện đáp ứng các chức năng chính và nhóm sẽ tối ưu thêm giao diện và tốc độ trong tương lai.",
                        "score": 73,
                        "feedback": "An toàn nhưng hơi chung chung; nên chỉ rõ giới hạn kỹ thuật cụ thể.",
                        "architectureImpact": "+6 Readiness",
                    },
                    {
                        "id": "reb-3-low",
                        "answer": "Dạ sản phẩm của nhóm em đã hoàn thiện 100%, không còn nhược điểm nào ạ.",
                        "score": 50,
                        "feedback": "Tránh khẳng định tuyệt đối vì Hội đồng sẽ test biên để bắt lỗi ngay.",
                        "architectureImpact": "-8 Readiness",
                    },
                ],
            },
            "mentorHint": "Chuẩn bị sẵn dữ liệu test sạch, mở sẵn 2 tab (Sinh viên & Giảng viên) để demo chuyển vai mượt mà.",
        },
    ]


@router.post("/defense/projects/{project_id}/practice-questions", status_code=status.HTTP_200_OK)
def generate_practice_questions(
    project_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Sinh bộ câu hỏi Luyện tập Phản biện AI bám sát dữ liệu dự án thật từ MySQL."""
    with db() as conn:
        dossier = _build_project_defense_dossier(conn, project_id)
        svc_row = conn.execute("SELECT active FROM ai_service_units WHERE id='svc-defense'").fetchone()
        service_active = bool(svc_row["active"]) if svc_row else True

    student_name = user.get("full_name") or user.get("display_name") or "Học viên"
    fallback_rounds = _build_deterministic_practice_rounds(dossier, student_name)
    source = "project-evidence"

    if service_active:
        proj = dossier["project"]
        pkg = dossier["package"]
        task_lines = "; ".join(f"{t['code']} ({t['columnId']}): {t['title']}" for t in dossier["recentTasks"][:6]) or "Chưa có task"
        commit_lines = "; ".join(f"{c['sha'][:7]} ({c['authorName']}): {c['message']}" for c in dossier["recentCommits"][:5]) or "Chưa có commit"
        llm_res = generate_json(
            prompt=(
                f"Dự án: {proj['code']} - {proj['name']} ({proj['course']})\n"
                f"Sinh viên luyện tập: {student_name}\n"
                f"Link Demo: {pkg['demoUrl'] or 'Chưa nộp'} | Repo: {proj['repoUrl'] or 'Chưa gắn'}\n"
                f"Tóm tắt kiến trúc: {pkg['architectureSummary'] or 'Chưa cập nhật'}\n"
                f"Tiến độ Kanban: {proj['doneTasks']}/{proj['totalTasks']} task, {proj['completedPoints']} SP\n"
                f"Một số task thật: {task_lines}\n"
                f"Một số commit Git thật: {commit_lines}\n\n"
                "Hãy tạo JSON object chứa khóa 'rounds' gồm đúng 3 vòng luyện tập phản biện đồ án sát với dự án này (KHÔNG bịa công nghệ không liên quan). "
                "Mỗi vòng có: roundNumber (1..3), phaseTitle, jurySpeakerId ('jury-1'|'jury-2'|'jury-3'), evidenceRef, question, "
                "suggestedKeywords (3-4 từ), sampleArguments (3 lựa chọn optimal/acceptable/flawed), "
                "drillDownChallenge (criticJuryId, criticName, challengeTitle, criticQuestion, rebuttalOptions 3 mục score/answer/feedback/architectureImpact), mentorHint."
            ),
            system_instruction="Bạn là trợ lý luyện tập bảo vệ đồ án kỹ nghệ phần mềm. Trả JSON hợp lệ tiếng Việt, bám sát dữ liệu dự án được cung cấp.",
            temperature=0.35,
            max_output_tokens=1500,
        )
        if llm_res and isinstance(llm_res[0], dict) and isinstance(llm_res[0].get("rounds"), list):
            parsed_rounds = llm_res[0]["rounds"]
            meta = llm_res[1]
            if len(parsed_rounds) >= 3:
                fallback_rounds = [
                    _normalize_practice_round(parsed_rounds[i], fallback_rounds[i])
                    for i in range(3)
                ]
                source = f"gemini:{meta.get('model') or 'gemini'}"
                with db() as conn:
                    record_ai_usage(
                        conn,
                        "svc-defense",
                        int(meta.get("input_tokens") or 750),
                        int(meta.get("output_tokens") or 900),
                    )
                    conn.commit()

    return {
        "project_id": project_id,
        "source": source,
        "evidence_summary": {
            "projectCode": dossier["project"]["code"],
            "projectName": dossier["project"]["name"],
            "doneTasks": dossier["project"]["doneTasks"],
            "totalTasks": dossier["project"]["totalTasks"],
            "commitsCount": dossier["project"]["commitsCount"],
            "demoUrl": dossier["package"]["demoUrl"],
            "hasArchitectureSummary": bool(dossier["package"]["architectureSummary"]),
        },
        "rounds": fallback_rounds,
    }


@router.post("/defense/projects/{project_id}/council-questions", status_code=status.HTTP_200_OK)
def generate_council_questions(
    project_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Trợ lý AI gợi ý câu hỏi hỏi-đáp trực tiếp cho Giảng viên / Hội đồng dựa trên hồ sơ & đóng góp Anti-Freerider."""
    role = (user.get("role") or "student").lower()
    if role not in ("instructor", "admin", "org_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Giảng viên hoặc Quản trị viên mới được dùng Trợ lý gợi ý câu hỏi Hội đồng.",
        )

    with db() as conn:
        dossier = _build_project_defense_dossier(conn, project_id)
        svc_row = conn.execute("SELECT active FROM ai_service_units WHERE id='svc-defense'").fetchone()
        service_active = bool(svc_row["active"]) if svc_row else True

    proj = dossier["project"]
    pkg = dossier["package"]
    metrics = dossier["memberMetrics"]

    project_probes = [
        {
            "category": "Demo Trực tiếp",
            "question": f"Yêu cầu nhóm chạy trực tiếp luồng nghiệp vụ chính trên {pkg['demoUrl'] or 'ứng dụng'}, sau đó tải lại trang (F5) và kiểm tra dữ liệu lưu thực tế trong DB.",
            "whatToVerify": "Không dùng dữ liệu giả tĩnh; luồng tạo/sửa/xóa đồng bộ từ giao diện xuống DB.",
        },
        {
            "category": "Kiến trúc & Bảo mật",
            "question": f"Kiểm tra phân quyền RBAC & xử lý lỗi biên của {proj['code']}: điều gì xảy ra nếu user gửi dữ liệu sai định dạng hoặc gọi API trái vai trò?",
            "whatToVerify": "API trả HTTP 401/403/422 rõ ràng, giao diện không trắng màn hình.",
        },
        {
            "category": "Git & Tiến độ",
            "question": f"Đối chiếu lịch sử {proj['commitsCount']} commits / {proj['prsCount']} PRs với bảng Kanban ({proj['doneTasks']}/{proj['totalTasks']} task): vì sao có phần tập trung ở giai đoạn cuối?",
            "whatToVerify": "Lịch sử làm việc đều đặn, không dồn code hoặc copy vào phút chót.",
        },
    ]

    member_probes = []
    for m in metrics:
        top_t = "; ".join(m["top_tasks"][:2]) if m["top_tasks"] else "Chưa ghi nhận task hoàn thành cụ thể"
        low_contrib = float(m.get("contribution_pct") or 0) < 22.0 or int(m.get("commits_count") or 0) == 0
        member_probes.append(
            {
                "memberId": m["member_id"],
                "memberName": m["name"],
                "memberRole": m["role"],
                "contributionPct": m["contribution_pct"],
                "evidenceBasis": f"{m['completed_points']}/{m['total_points']} SP ({m['contribution_pct']}%) · {m['commits_count']} commits · {top_t}",
                "question": (
                    f"{m['name']} hãy giải thích chi tiết file code và thiết kế CSDL/API mà em trực tiếp cài đặt trong ({top_t}), đồng thời chỉ chỗ sẽ sửa nếu cần thêm điều kiện kiểm tra mới."
                    if not low_contrib
                    else f"{m['name']} (tỷ lệ {m['contribution_pct']}%, {m['commits_count']} commits): hãy mở đúng phần giao diện/hàm em tự viết và giải thích luồng chạy từ UI xuống API để Hội đồng xác nhận đóng góp thực."
                ),
                "whatToVerify": "Mở được đúng file code mình viết, hiểu rõ biến/hàm/luồng xử lý và giải thích được lý do thiết kế.",
            }
        )

    source = "project-evidence"
    if service_active and metrics:
        member_summary = "\n".join(
            f"- {m['name']} ({m['role']}): {m['completed_points']}/{m['total_points']} SP ({m['contribution_pct']}%), {m['commits_count']} commits, tasks: {', '.join(m['top_tasks'][:3])}"
            for m in metrics
        )
        llm_res = generate_json(
            prompt=(
                f"Dự án: {proj['code']} - {proj['name']}\n"
                f"Tóm tắt kiến trúc do nhóm nộp: {pkg['architectureSummary'] or 'Chưa có'}\n"
                f"Phân công do nhóm khai báo: {pkg['memberRolesSummary'] or 'Chưa có'}\n"
                f"Dữ liệu đóng góp thực tế (Anti-Freerider):\n{member_summary}\n\n"
                "Hãy gợi ý JSON gồm:\n"
                "- 'projectProbes': 3 câu hỏi kiểm chứng Demo & Kiến trúc (category, question, whatToVerify)\n"
                "- 'memberProbes': mỗi thành viên ở trên 1 câu hỏi đích danh (memberId, question, whatToVerify)."
            ),
            system_instruction="Bạn là Chủ tịch Hội đồng bảo vệ đồ án đại học. Sinh câu hỏi thực tế, sắc bén giúp thầy cô kiểm tra demo thật và lọc freerider. Chỉ trả JSON thuần.",
            temperature=0.35,
            max_output_tokens=1100,
        )
        if llm_res and isinstance(llm_res[0], dict):
            parsed, meta = llm_res
            if isinstance(parsed.get("projectProbes"), list) and len(parsed["projectProbes"]) >= 2:
                norm_pp = []
                for idx, p in enumerate(parsed["projectProbes"][:3]):
                    if isinstance(p, dict) and str(p.get("question") or "").strip():
                        norm_pp.append(
                            {
                                "category": str(p.get("category") or f"Kiểm chứng #{idx+1}"),
                                "question": str(p.get("question")).strip(),
                                "whatToVerify": str(p.get("whatToVerify") or "Kiểm tra trực tiếp trên Demo/Repo").strip(),
                            }
                        )
                if norm_pp:
                    project_probes = norm_pp
            if isinstance(parsed.get("memberProbes"), list):
                by_id = {str(mp.get("memberId") or ""): mp for mp in parsed["memberProbes"] if isinstance(mp, dict)}
                for idx, mp in enumerate(member_probes):
                    cand = by_id.get(mp["memberId"]) or (parsed["memberProbes"][idx] if idx < len(parsed["memberProbes"]) else None)
                    if isinstance(cand, dict) and str(cand.get("question") or "").strip():
                        mp["question"] = str(cand.get("question")).strip()
                        if str(cand.get("whatToVerify") or "").strip():
                            mp["whatToVerify"] = str(cand.get("whatToVerify")).strip()
            source = f"gemini:{meta.get('model') or 'gemini'}"
            with db() as conn:
                record_ai_usage(
                    conn,
                    "svc-defense",
                    int(meta.get("input_tokens") or 520),
                    int(meta.get("output_tokens") or 620),
                )
                conn.commit()

    return {
        "project_id": project_id,
        "source": source,
        "projectProbes": project_probes,
        "memberProbes": member_probes,
    }


@router.post("/defense/projects/{project_id}/live-grade", status_code=status.HTTP_200_OK)
def submit_live_council_grade(
    project_id: str,
    payload: LiveCouncilGradeIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Giảng viên / Hội đồng chấm điểm bảo vệ trực tiếp sau khi xem Demo & hỏi đáp."""
    role = (user.get("role") or "student").lower()
    if role not in ("instructor", "admin", "org_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Giảng viên hoặc Quản trị viên mới có quyền chốt điểm Hội đồng trực tiếp.",
        )

    verdict = (payload.verdict or "pass").strip().lower()
    if verdict not in ("pass", "pass_with_revisions", "fail"):
        raise HTTPException(
            status_code=422,
            detail="verdict phải là pass, pass_with_revisions hoặc fail",
        )

    final_score = round(
        0.35 * payload.demo_score
        + 0.25 * payload.architecture_score
        + 0.15 * payload.process_score
        + 0.25 * payload.defense_score,
        2,
    )
    now = now_utc()
    instructor_name = user.get("full_name") or user.get("display_name") or "Giảng viên Hội đồng"
    council_members = (payload.council_members or "").strip() or instructor_name
    eval_status = "redefense_required" if verdict == "fail" else "graded"

    with db() as conn:
        dossier = _build_project_defense_dossier(conn, project_id)
        proj = dossier["project"]
        existing = conn.execute(
            "SELECT id FROM project_evaluations WHERE project_id = ? ORDER BY graded_at DESC LIMIT 1",
            (project_id,),
        ).fetchone()
        eval_id = existing["id"] if existing else f"eval-{uid()[:8]}"

        member_scores_data = [m.model_dump() for m in payload.member_scores]
        if not member_scores_data:
            member_scores_data = [
                {
                    "member_id": m["member_id"],
                    "name": m["name"],
                    "role": m["role"],
                    "contribution_pct": m["contribution_pct"],
                    "suggested_factor": m["suggested_factor"],
                    "individual_score": round(min(10.0, max(0.0, final_score * m["suggested_factor"])), 1),
                    "asked_question": "",
                    "live_qa_note": "",
                }
                for m in dossier["memberMetrics"]
            ]

        council_notes = {
            "verdict": verdict,
            "council_members": council_members,
            "demo_verified": payload.demo_verified,
            "repo_verified": payload.repo_verified,
            "frozen_verified": payload.frozen_verified,
        }

        if existing:
            conn.execute(
                """UPDATE project_evaluations
                   SET instructor_id=?, group_score=?, demo_score=?, architecture_score=?,
                       process_score=?, defense_score=?, final_score=?, feedback=?,
                       member_scores_json=?, anti_freerider_metrics_json=?,
                       council_notes_json=?, grader_name=?, defense_date=?, status=?, graded_at=?
                   WHERE id=?""",
                (
                    user["id"],
                    final_score,
                    payload.demo_score,
                    payload.architecture_score,
                    payload.process_score,
                    payload.defense_score,
                    final_score,
                    (payload.feedback or "").strip() or "Đã hoàn tất bảo vệ đồ án trực tiếp trước Hội đồng.",
                    json.dumps(member_scores_data, ensure_ascii=False),
                    json.dumps(dossier["memberMetrics"], ensure_ascii=False),
                    json.dumps(council_notes, ensure_ascii=False),
                    council_members,
                    now,
                    eval_status,
                    now,
                    eval_id,
                ),
            )
        else:
            conn.execute(
                """INSERT INTO project_evaluations(
                       id, project_id, instructor_id, group_score, demo_score, architecture_score,
                       process_score, defense_score, final_score, feedback,
                       member_scores_json, anti_freerider_metrics_json,
                       council_notes_json, grader_name, defense_date, status, graded_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    eval_id,
                    project_id,
                    user["id"],
                    final_score,
                    payload.demo_score,
                    payload.architecture_score,
                    payload.process_score,
                    payload.defense_score,
                    final_score,
                    (payload.feedback or "").strip() or "Đã hoàn tất bảo vệ đồ án trực tiếp trước Hội đồng.",
                    json.dumps(member_scores_data, ensure_ascii=False),
                    json.dumps(dossier["memberMetrics"], ensure_ascii=False),
                    json.dumps(council_notes, ensure_ascii=False),
                    council_members,
                    now,
                    eval_status,
                    now,
                ),
            )

        if verdict == "fail":
            conn.execute(
                "UPDATE engineering_projects SET status='active', updated_at=? WHERE id=?",
                (now, project_id),
            )
        else:
            conn.execute(
                "UPDATE engineering_projects SET status='delivered', tl_color='done', updated_at=? WHERE id=?",
                (now, project_id),
            )
            prof = conn.execute("SELECT user_id FROM student_profiles LIMIT 1").fetchone()
            if prof:
                conn.execute(
                    "UPDATE student_profiles SET exp_points = exp_points + 150 WHERE user_id = ?",
                    (prof["user_id"],),
                )

        conn.execute(
            """INSERT INTO notifications(
                   id, recipient_user_id, target_role, title, desc_text, category, is_read, action_url, created_at
               ) VALUES(?,?,?,?,?,?,?,?,?)""",
            (
                f"notif-council-{uid()[:8]}",
                None,
                "student",
                f"Biên bản Hội đồng đồ án {proj['code']}: {final_score}/10",
                f"{council_members} vừa chốt điểm bảo vệ trực tiếp đồ án {proj['name']} đạt {final_score}/10.",
                "defense",
                0,
                "/defense-room",
                now,
            ),
        )
        conn.commit()
        updated_eval_row = conn.execute(
            "SELECT * FROM project_evaluations WHERE id = ?", (eval_id,)
        ).fetchone()
        official_eval = _serialize_official_evaluation(updated_eval_row)

    record_audit_log(
        instructor_name,
        user["id"],
        f"Chốt điểm Hội đồng trực tiếp ({final_score}/10)",
        f"{proj['code']} - {proj['name']}",
        log_type="defense",
        resource_type="project_evaluation",
        resource_id=eval_id,
    )
    track_event(
        user["id"],
        None,
        "live_council_graded",
        {"project_id": project_id, "final_score": final_score, "verdict": verdict},
    )
    return {
        "status": eval_status,
        "eval_id": eval_id,
        "final_score": final_score,
        "officialEvaluation": official_eval,
    }
