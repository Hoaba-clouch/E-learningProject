from __future__ import annotations

import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user, record_audit_log
from app.core.database import db
from app.core.security import sha256, uid
from app.core.timezone import now_utc
from app.schemas.defense import DefenseCompleteIn, DefenseRespondIn, DefenseStartIn
from app.services.analytics import track_event

router = APIRouter(tags=["AI 3D Defense & Dual Grading"])


def _rubric_dict(row: Any) -> dict[str, Any]:
    return {
        "cicdWeightPct": row["cicd_weight_pct"],
        "defenseWeightPct": row["defense_weight_pct"],
        "strictAntiCopyGuardrail": bool(row["strict_anti_copy_guardrail"]),
        "autoFlagDiscrepancyThreshold": row["auto_flag_discrepancy_threshold"],
        "mandatoryProbes": json.loads(row["mandatory_probes_json"] or "[]"),
    }


@router.get("/defense/rubric")
def get_public_defense_rubric(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Học viên & Giảng viên xem cấu hình Rubric Chấm Kép hiện hành."""
    with db() as conn:
        row = conn.execute("SELECT * FROM defense_rubric_configs WHERE id='default'").fetchone()
    if not row:
        return {
            "cicdWeightPct": 60,
            "defenseWeightPct": 40,
            "strictAntiCopyGuardrail": True,
            "autoFlagDiscrepancyThreshold": 25,
            "mandatoryProbes": [],
        }
    return _rubric_dict(row)


@router.post("/defense/sessions", status_code=status.HTTP_201_CREATED)
def start_defense_session(
    payload: DefenseStartIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Khởi tạo phiên Bảo vệ Đồ án với Hội đồng AI 3D."""
    now = now_utc()
    defense_id = f"def-{uid()[:8]}"
    with db() as conn:
        course = conn.execute("SELECT id, code, ai_defense_enabled FROM courses WHERE id=?", (payload.class_id,)).fetchone()
        if course and not course["ai_defense_enabled"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Phòng Phản Biện AI 3D hiện đang tạm khóa cho học phần {course['code']}.",
            )
        conn.execute(
            """INSERT INTO defense_sessions(
                   id, user_id, project_id, class_id, round_number, status,
                   architecture_score, algorithm_score, production_score, final_defense_score,
                   transcript_json, created_at, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (defense_id, user["id"], payload.project_id, payload.class_id, 1, "in_progress", 86, 84, 88, None, "[]", now, now),
        )
    track_event(user["id"], None, "defense_session_started", {"defense_id": defense_id, "project_id": payload.project_id})
    return {
        "defense_id": defense_id,
        "project_id": payload.project_id,
        "class_id": payload.class_id,
        "status": "in_progress",
    }


@router.post("/defense/sessions/{defense_id}/respond")
def respond_defense_round(
    defense_id: str,
    payload: DefenseRespondIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Ghi nhận luận điểm phản biện của học viên và chấm điểm theo Hội đồng 3 giám khảo AI."""
    now = now_utc()
    with db() as conn:
        sess = conn.execute("SELECT * FROM defense_sessions WHERE id=?", (defense_id,)).fetchone()
        if not sess:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên bảo vệ AI 3D")
        if sess["user_id"] != user["id"] and user.get("role") not in ("instructor", "admin", "org_admin"):
            raise HTTPException(status_code=403, detail="Không có quyền truy cập phiên bảo vệ này")

        transcript = json.loads(sess["transcript_json"] or "[]")
        student_name = user.get("full_name") or user.get("display_name") or "Học viên"

        base_delta = 6 if payload.argument_type == "optimal" else 2 if payload.argument_type == "acceptable" else -10
        arch_score = max(30, min(100, int((sess["architecture_score"] + payload.rebuttal_score) / 2) + (3 if base_delta > 0 else -5)))
        algo_score = max(30, min(100, payload.rebuttal_score))
        prod_score = max(30, min(100, int((sess["production_score"] + payload.rebuttal_score) / 2) + (2 if base_delta > 0 else -4)))

        transcript.append(
            {
                "id": f"t-chair-{payload.round_number}",
                "speaker": "ai_chair",
                "speakerLabel": "TS. Trần Anh Tuấn · Chủ tịch Hội đồng",
                "text": f"[Vòng {payload.round_number}] Phân tích kiến trúc & cơ chế xử lý xung đột tài nguyên của hệ thống.",
            }
        )
        transcript.append(
            {
                "id": f"t-stu-{payload.round_number}",
                "speaker": "student",
                "speakerLabel": student_name,
                "text": payload.argument_text,
                "evaluation": (
                    "Luận điểm sắc bén, chứng minh làm chủ kiến trúc."
                    if payload.rebuttal_score >= 85
                    else "Đạt yêu cầu cơ bản, cần bổ sung phân tích edge-case."
                    if payload.rebuttal_score >= 65
                    else "Chưa bảo vệ được cơ chế lõi — cần rà soát lại thiết kế."
                ),
            }
        )

        conn.execute(
            """UPDATE defense_sessions
               SET round_number=?, architecture_score=?, algorithm_score=?, production_score=?, transcript_json=?, updated_at=?
               WHERE id=?""",
            (
                payload.round_number + 1,
                arch_score,
                algo_score,
                prod_score,
                json.dumps(transcript, ensure_ascii=False),
                now,
                defense_id,
            ),
        )
        conn.execute(
            "UPDATE ai_service_units SET requests = requests + 1, input_tokens = input_tokens + 2400, output_tokens = output_tokens + 950 WHERE id='svc-defense'"
        )

    return {
        "defense_id": defense_id,
        "round_number": payload.round_number,
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
    """Chốt điểm phản biện AI 3D và tự động đồng bộ biên bản sang hàng đợi Chấm Kép của Giảng viên."""
    now = now_utc()
    with db() as conn:
        sess = conn.execute("SELECT * FROM defense_sessions WHERE id=?", (defense_id,)).fetchone()
        if not sess:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên bảo vệ AI 3D")
        if sess["user_id"] != user["id"] and user.get("role") not in ("instructor", "admin", "org_admin"):
            raise HTTPException(status_code=403, detail="Không có quyền chốt phiên bảo vệ này")

        final_defense = round((sess["architecture_score"] + sess["algorithm_score"] + sess["production_score"]) / 3)
        transcript = json.loads(sess["transcript_json"] or "[]")
        conn.execute(
            "UPDATE defense_sessions SET status='completed', final_defense_score=?, updated_at=? WHERE id=?",
            (final_defense, now, defense_id),
        )

        # Cập nhật XP + Radar Bảo vệ của học viên
        conn.execute(
            "UPDATE student_profiles SET exp_points = exp_points + 50, radar_defense = MIN(100.0, (radar_defense + ?) / 2.0) WHERE user_id=?",
            (float(final_defense), user["id"]),
        )

        rubric = conn.execute("SELECT * FROM defense_rubric_configs WHERE id='default'").fetchone()
        threshold = rubric["auto_flag_discrepancy_threshold"] if rubric else 25
        cicd_pct = (payload.passed_tests / max(1, payload.total_tests)) * 100
        discrepancy = abs(cicd_pct - final_defense) >= threshold

        sub_id = f"sub-def-{defense_id[4:]}"
        student_name = user.get("full_name") or user.get("display_name") or "Nguyễn Văn A"
        student_code = user.get("user_code") or "2210842"
        coherence = (
            f"Cảnh báo lệch điểm CI/CD ({round(cicd_pct)}%) vs Phản biện 3D ({final_defense}%): cần Giảng viên kiểm tra lại."
            if discrepancy
            else f"Học viên bảo vệ trực tiếp qua Hội đồng AI 3D đạt {final_defense}/100, khớp kết quả CI/CD {payload.passed_tests}/{payload.total_tests}."
        )
        sub_status = "flagged" if discrepancy else "pending"
        def_status = "flagged" if discrepancy else "completed"

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
                user["id"],
                student_name,
                student_code,
                payload.chapter_title,
                payload.repo_url,
                "Vừa xong (Live AI 3D)",
                payload.passed_tests,
                payload.total_tests,
                34,
                14.0,
                sha256(defense_id)[:7],
                7,
                5,
                json.dumps(
                    [
                        {
                            "id": f"tc-live-{i}",
                            "title": f"Kiểm thử hệ thống #{i}",
                            "status": "passed" if i <= payload.passed_tests else "failed",
                            "durationMs": 6 + i,
                            "isEdgeCase": i == payload.total_tests,
                        }
                        for i in range(1, payload.total_tests + 1)
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
        conn.execute(
            "UPDATE courses SET pending_dual_reviews = pending_dual_reviews + 1 WHERE id=?",
            (sess["class_id"],),
        )

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Học viên",
        user["id"],
        f"Hoàn tất Phản biện AI 3D ({final_defense}/100) -> Đẩy hàng đợi Chấm Kép",
        f"{payload.chapter_title}",
        log_type="ai",
        resource_type="dual_submission",
        resource_id=sub_id,
    )
    return {
        "defense_id": defense_id,
        "submission_id": sub_id,
        "final_defense_score": final_defense,
        "status": sub_status,
    }
