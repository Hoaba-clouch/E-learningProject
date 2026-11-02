from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user, session_owned, require_role
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc
from app.schemas.lms import SessionStartIn, ProgressIn, TermsIn, ConceptAnswersIn
from app.services.analytics import track_event

router = APIRouter(tags=["LMS & Learning Sessions"])


@router.get("/lessons/{slug}")
def get_lesson(slug: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy nội dung bài học và tài liệu chuẩn đính kèm."""
    with db() as conn:
        lesson = conn.execute("SELECT * FROM lessons WHERE slug = ? AND status = 'published' ORDER BY version DESC LIMIT 1", (slug,)).fetchone()
        if not lesson:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài học")
        steps = conn.execute("SELECT sequence_no, step_type, title, completion_rule FROM lesson_steps WHERE lesson_id = ? ORDER BY sequence_no", (lesson["id"],)).fetchall()
        sources = conn.execute(
            """SELECT s.id as source_id, s.canonical_url, s.publisher, s.trust_status, sv.id as source_version_id,
                      sv.version_label, sv.content_text, sv.content_sha256, sv.availability_status
               FROM lesson_sources ls JOIN source_versions sv ON sv.id=ls.source_version_id
               JOIN sources s ON s.id=sv.source_id WHERE ls.lesson_id=? ORDER BY ls.display_order""",
            (lesson["id"],),
        ).fetchall()
    track_event(user["id"], None, "lesson_viewed", {"lesson_id": lesson["id"], "version": lesson["version"]})
    return {"lesson": row_dict(lesson), "steps": [row_dict(item) for item in steps], "sources": [row_dict(item) for item in sources]}


@router.post("/learning-sessions", status_code=status.HTTP_201_CREATED)
def create_learning_session(payload: SessionStartIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Khởi tạo phiên học tập cho sinh viên."""
    require_role(user, "student")
    with db() as conn:
        lesson = conn.execute("SELECT * FROM lessons WHERE id=? AND status='published'", (payload.lesson_id,)).fetchone()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson chưa được publish")
        consent = conn.execute("SELECT granted FROM consents WHERE user_id=? AND purpose='academic_integrity'", (user["id"],)).fetchone()
        if not consent or not consent["granted"]:
            raise HTTPException(status_code=409, detail="Cần cam kết trung thực trước khi bắt đầu")
        visibility = conn.execute("SELECT granted FROM consents WHERE user_id=? AND purpose='teacher_visibility'", (user["id"],)).fetchone()
        session_id = uid()
        timestamp = now_utc()
        conn.execute(
            """INSERT INTO learning_sessions(id, user_id, lesson_id, organization_id, status, current_step_no, progress_version, teacher_visibility, started_at, updated_at)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (session_id, user["id"], lesson["id"], payload.organization_id, "in_progress", 1, 1, int(bool(visibility and visibility["granted"])), timestamp, timestamp),
        )
        first_step = conn.execute("SELECT id FROM lesson_steps WHERE lesson_id=? AND sequence_no=1", (lesson["id"],)).fetchone()
        if first_step:
            conn.execute("INSERT INTO step_attempts(id, learning_session_id, lesson_step_id, attempt_no, status) VALUES(?,?,?,?,?)", (uid(), session_id, first_step["id"], 1, "started"))
        session = conn.execute("SELECT * FROM learning_sessions WHERE id=?", (session_id,)).fetchone()
    track_event(user["id"], session_id, "learning_session_started", {"lesson_id": lesson["id"], "org_present": bool(payload.organization_id)})
    return row_dict(session) or {}


@router.get("/learning-sessions/{session_id}")
def get_learning_session(session_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy chi tiết phiên học tập."""
    session = session_owned(session_id, user["id"])
    with db() as conn:
        attempts = conn.execute("SELECT * FROM step_attempts WHERE learning_session_id=? ORDER BY id", (session_id,)).fetchall()
        terms = conn.execute("SELECT term_text, context_excerpt FROM term_selections WHERE learning_session_id=?", (session_id,)).fetchall()
        concept = conn.execute("SELECT * FROM concept_answers WHERE learning_session_id=? ORDER BY id DESC LIMIT 1", (session_id,)).fetchone()
        evidence = conn.execute("SELECT * FROM evidence WHERE learning_session_id=?", (session_id,)).fetchone()
    return {
        "session": row_dict(session) if isinstance(session, dict) else dict(session),
        "attempts": [row_dict(item) for item in attempts],
        "terms": [row_dict(item) for item in terms],
        "concept": row_dict(concept),
        "evidence": row_dict(evidence),
    }


@router.patch("/learning-sessions/{session_id}/progress")
def update_progress(session_id: str, payload: ProgressIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Cập nhật tiến trình bước học tập."""
    session = session_owned(session_id, user["id"])
    if session["progress_version"] != payload.progress_version:
        raise HTTPException(status_code=409, detail="Progress version đã thay đổi, hãy tải lại phiên học")
    if payload.target_step > session["current_step_no"] + 1:
        raise HTTPException(status_code=422, detail="Chưa hoàn thành bước trước đó")
    timestamp = now_utc()
    with db() as conn:
        conn.execute("UPDATE learning_sessions SET current_step_no=?, progress_version=progress_version+1, updated_at=? WHERE id=?", (payload.target_step, timestamp, session_id))
        step = conn.execute("SELECT id FROM lesson_steps WHERE lesson_id=? AND sequence_no=?", (session["lesson_id"], payload.target_step)).fetchone()
        if step:
            conn.execute(
                "INSERT INTO step_attempts(id, learning_session_id, lesson_step_id, attempt_no, status, completed_at) VALUES(?,?,?,?,?,?)",
                (uid(), session_id, step["id"], 1, "passed" if payload.target_step > 1 else "started", timestamp if payload.target_step > 1 else None),
            )
        updated = conn.execute("SELECT * FROM learning_sessions WHERE id=?", (session_id,)).fetchone()
    track_event(user["id"], session_id, "step_advanced", {"target_step": payload.target_step})
    return row_dict(updated) or {}


@router.post("/sessions/{session_id}/terms", status_code=status.HTTP_201_CREATED)
def select_terms(session_id: str, payload: TermsIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lưu từ khóa thuật ngữ chuẩn từ documentation."""
    session = session_owned(session_id, user["id"])
    normalized = {term.strip().lower() for term in payload.terms if term.strip()}
    if not normalized or "maxlen" not in normalized:
        raise HTTPException(status_code=422, detail="Hãy chọn thuật ngữ có trong source đã pin")
    with db() as conn:
        source = conn.execute("SELECT content_text FROM source_versions WHERE id=?", (payload.source_version_id,)).fetchone()
        if not source or any(term not in source["content_text"].lower() for term in normalized):
            raise HTTPException(status_code=422, detail="Thuật ngữ không có trong source version")
        for term in normalized:
            conn.execute(
                """INSERT OR REPLACE INTO term_selections(id, learning_session_id, source_version_id, term_text, term_normalized, context_excerpt)
                   VALUES(?,?,?,?,?,?)""",
                (uid(), session_id, payload.source_version_id, term, term, "maxlen chỉ giữ tối đa số phần tử được cấu hình."),
            )
        saved = conn.execute("SELECT term_text, context_excerpt FROM term_selections WHERE learning_session_id=?", (session_id,)).fetchall()
    track_event(user["id"], session_id, "term_selected", {"term_count": len(saved)})
    return {"terms": [row_dict(item) for item in saved]}


@router.post("/sessions/{session_id}/concept-answers")
def submit_concept_answers(session_id: str, payload: ConceptAnswersIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Chấm điểm câu hỏi khái niệm (Concept check)."""
    session_owned(session_id, user["id"])
    selected = payload.answers[0].selected_option if payload.answers else ""
    correct = (selected == "kiểm tra page → trước append")
    with db() as conn:
        conn.execute(
            """INSERT INTO concept_answers(id, learning_session_id, relation_key, selected_option, is_correct, rule_version, answered_at)
               VALUES(?,?,?,?,?,?,?)""",
            (uid(), session_id, "input_guard", selected, int(correct), "deque-v1", now_utc()),
        )
    track_event(user["id"], session_id, "concept_check_submitted", {"score": 1 if correct else 0})
    if not correct:
        raise HTTPException(status_code=422, detail="Hãy nối bước kiểm tra page trước append")
    return {"score": 1, "correct": True, "feedback": "Đúng: input guard phải chạy trước history.append(page)."}
