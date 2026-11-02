from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user, session_owned, log_audit
from app.core.database import db, row_dict
from app.core.security import uid, sha256
from app.core.timezone import now_utc
from app.schemas.submission import SubmissionIn
from app.services.analytics import track_event
from app.services.code_evaluator import evaluate_code

router = APIRouter(tags=["Submissions & Evaluation"])


@router.post("/sessions/{session_id}/submissions", status_code=status.HTTP_201_CREATED)
def create_submission(session_id: str, payload: SubmissionIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Tiếp nhận mã nguồn và chấm điểm tự động trong sandbox."""
    session_owned(session_id, user["id"])
    with db() as conn:
        existing = conn.execute("SELECT * FROM submissions WHERE idempotency_key=?", (payload.idempotency_key,)).fetchone()
        if existing:
            return {
                "id": existing["id"],
                "status": existing["status"],
                "passed_count": existing["passed_count"],
                "total_count": existing["total_count"],
            }
        
        submission_id = uid()
        passed_count, results = evaluate_code(payload.code)
        sub_status = "passed" if passed_count == 5 else "failed"
        timestamp = now_utc()
        
        conn.execute(
            """INSERT INTO submissions(id, learning_session_id, source_code, source_sha256, submission_no, idempotency_key, status, passed_count, total_count, created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (submission_id, session_id, payload.code, sha256(payload.code), 1, payload.idempotency_key, sub_status, passed_count, 5, timestamp),
        )
        for index, (result_status, message, duration) in enumerate(results, 1):
            conn.execute(
                "INSERT INTO test_results(id, submission_id, sequence_no, status, safe_message, duration_ms) VALUES(?,?,?,?,?,?)",
                (uid(), submission_id, index, result_status, message, int(duration)),
            )
        submission = conn.execute("SELECT id, status, passed_count, total_count FROM submissions WHERE id=?", (submission_id,)).fetchone()
        
    track_event(user["id"], session_id, "submission_queued", {"submission_no": 1, "code_bytes": len(payload.code.encode("utf-8"))})
    track_event(user["id"], session_id, "submission_finished", {"status": submission["status"], "passed_count": submission["passed_count"], "duration_ms": 8})
    return row_dict(submission) or {}


@router.get("/submissions/{submission_id}")
def get_submission(submission_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Xem chi tiết bài nộp và kết quả các test cases."""
    with db() as conn:
        submission = conn.execute("SELECT * FROM submissions WHERE id=?", (submission_id,)).fetchone()
        if not submission:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài nộp")
        if submission["learning_session_id"]:
            owner = conn.execute("SELECT user_id FROM learning_sessions WHERE id=?", (submission["learning_session_id"],)).fetchone()
            if owner and user["id"] != owner["user_id"]:
                raise HTTPException(status_code=403, detail="Không có quyền xem bài nộp")
        results = conn.execute("SELECT sequence_no, status, safe_message, duration_ms FROM test_results WHERE submission_id=? ORDER BY sequence_no", (submission_id,)).fetchall()
    return {"submission": row_dict(submission), "results": [row_dict(item) for item in results]}


@router.post("/sessions/{session_id}/complete")
def complete_session(session_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Hoàn thành phiên học và tạo Bằng chứng tự sửa lỗi (Evidence)."""
    session_owned(session_id, user["id"])
    timestamp = now_utc()
    with db() as conn:
        final_submission = conn.execute(
            "SELECT * FROM submissions WHERE learning_session_id=? AND passed_count=total_count ORDER BY created_at DESC LIMIT 1",
            (session_id,),
        ).fetchone()
        first_submission = conn.execute(
            "SELECT * FROM submissions WHERE learning_session_id=? ORDER BY created_at ASC LIMIT 1",
            (session_id,),
        ).fetchone()
        hints = conn.execute(
            """SELECT COUNT(*) count FROM ai_hints ah JOIN ai_interactions ai ON ai.id=ah.ai_interaction_id
               WHERE ai.learning_session_id=?""",
            (session_id,),
        ).fetchone()["count"]
        
        if not final_submission or not first_submission:
            raise HTTPException(status_code=409, detail="Cần có bài nộp đạt 5/5 trước khi hoàn thành")
            
        existing = conn.execute("SELECT * FROM evidence WHERE learning_session_id=?", (session_id,)).fetchone()
        if existing:
            return {"evidence": row_dict(existing), "session_status": "completed"}
            
        payload = f"{session_id}|{first_submission['source_sha256']}|{final_submission['source_sha256']}|{hints}|5"
        evidence_id = uid()
        conn.execute(
            """INSERT INTO evidence(id, learning_session_id, first_submission_id, final_submission_id, hint_count, passed_count, evidence_sha256, completed_at)
               VALUES(?,?,?,?,?,?,?,?)""",
            (evidence_id, session_id, first_submission["id"], final_submission["id"], hints, 5, sha256(payload), timestamp),
        )
        conn.execute("UPDATE learning_sessions SET status='completed', current_step_no=6, completed_at=? WHERE id=?", (timestamp, session_id))
        evidence = conn.execute("SELECT * FROM evidence WHERE id=?", (evidence_id,)).fetchone()
        
    track_event(user["id"], session_id, "lesson_completed", {"duration_sec": 180, "hint_count": hints, "submission_count": 2})
    track_event(user["id"], session_id, "self_correction_achieved", {"fail_count": 1, "hint_count": hints})
    return {"evidence": row_dict(evidence), "session_status": "completed"}


@router.get("/sessions/{session_id}/evidence")
def get_session_evidence(session_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Xem bằng chứng học tập (Chỉ học viên sở hữu hoặc Giảng viên khi đã được cấp quyền)."""
    with db() as conn:
        session = conn.execute("SELECT * FROM learning_sessions WHERE id=?", (session_id,)).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên học")
        allowed = (user["id"] == session["user_id"])
        if user.get("role") in ("instructor", "org_admin") and session["teacher_visibility"]:
            allowed = True
        if not allowed:
            log_audit(user["id"], "read_evidence", "learning_evidence", session_id, "deny", "consent_or_scope")
            raise HTTPException(status_code=403, detail="Evidence chưa được chia sẻ hoặc ngoài phạm vi")
        
        evidence = conn.execute("SELECT * FROM evidence WHERE learning_session_id=?", (session_id,)).fetchone()
        first = conn.execute("SELECT source_code, passed_count FROM submissions WHERE id=?", (evidence["first_submission_id"],)).fetchone() if evidence else None
        final = conn.execute("SELECT source_code, passed_count FROM submissions WHERE id=?", (evidence["final_submission_id"],)).fetchone() if evidence else None
        terms = conn.execute("SELECT term_text FROM term_selections WHERE learning_session_id=?", (session_id,)).fetchall()
        
    if user.get("role") in ("instructor", "org_admin"):
        track_event(user["id"], session_id, "instructor_evidence_viewed", {"organization_id": session["organization_id"]})
    return {
        "evidence": row_dict(evidence),
        "first_submission": row_dict(first),
        "final_submission": row_dict(final),
        "terms": [row_dict(term) for term in terms],
    }
