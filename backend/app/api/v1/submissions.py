from __future__ import annotations

import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import assert_sandbox_enabled_for_exercise, current_user, log_audit, session_owned
from app.core.database import db, row_dict
from app.core.security import uid, sha256
from app.core.timezone import now_utc
from app.schemas.submission import SandboxEvaluateIn, SubmissionIn
from app.services.analytics import track_event
from app.services.code_evaluator import evaluate_sandbox_detailed

router = APIRouter(tags=["Submissions & Evaluation"])


def _evaluation(row: dict[str, Any]) -> dict[str, Any]:
    try:
        value = json.loads(row.get("evaluation_json") or "{}")
        return value if isinstance(value, dict) else {}
    except (TypeError, ValueError):
        return {}


def _submission_response(row: dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    data.pop("source_code", None)
    data.pop("idempotency_key", None)
    data.pop("evaluation_json", None)
    data["evaluation"] = _evaluation(row)
    return data


def _verified_pass(row: dict[str, Any]) -> bool:
    evaluation = _evaluation(row)
    cases = evaluation.get("test_cases") or []
    return bool(
        row.get("status") == "passed"
        and evaluation.get("execution_status") == "executed"
        and evaluation.get("runner") == "docker-python-v1"
        and evaluation.get("sha256") == row.get("source_sha256")
        and cases
        and len(cases) == evaluation.get("total_count") == row.get("total_count")
        and all(case.get("status") == "passed" and case.get("executed") for case in cases)
    )


@router.post("/sandbox/evaluate")
def evaluate_sandbox_code(
    payload: SandboxEvaluateIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Execute Python in Docker, or record an explicit unavailable/not_run result."""
    with db() as conn:
        policies = assert_sandbox_enabled_for_exercise(conn, user, payload.exercise_id)
        result = evaluate_sandbox_detailed(
            payload.code,
            payload.language,
            payload.exercise_id,
            network_isolated=bool(policies.get("dockerNetworkNone", True)),
            conn=conn,
        )
        conn.execute(
            """INSERT INTO sandbox_runs(id,user_id,exercise_id,source_sha256,evaluation_json,created_at)
               VALUES(?,?,?,?,?,?)""",
            (result["id"], user["id"], payload.exercise_id, result["sha256"], json.dumps(result, ensure_ascii=False), result["timestamp"]),
        )
        if result["executed_count"]:
            conn.execute("UPDATE ai_service_units SET requests = requests + 1 WHERE id='svc-docker'")
    track_event(
        user["id"],
        None,
        "sandbox_evaluated",
        {"run_id": result["id"], "exercise_id": payload.exercise_id, "passed_count": result["passed_count"], "language": payload.language, "execution_status": result["execution_status"]},
    )
    return result


@router.post("/sessions/{session_id}/submissions", status_code=status.HTTP_201_CREATED)
def create_submission(session_id: str, payload: SubmissionIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Tiếp nhận mã nguồn và chấm điểm tự động trong sandbox."""
    session_owned(session_id, user["id"])
    with db() as conn:
        policies = assert_sandbox_enabled_for_exercise(conn, user, payload.exercise_id, session_id=session_id)
        existing = conn.execute("SELECT * FROM submissions WHERE idempotency_key=?", (payload.idempotency_key,)).fetchone()
        if existing:
            if existing["learning_session_id"] != session_id or existing["source_sha256"] != sha256(payload.code):
                raise HTTPException(status_code=409, detail="Idempotency key đã được dùng cho lần nộp khác.")
            return _submission_response(existing)
        
        submission_id = uid()
        evaluation = evaluate_sandbox_detailed(
            payload.code, "python", payload.exercise_id,
            network_isolated=bool(policies.get("dockerNetworkNone", True)), conn=conn,
        )
        passed_count = evaluation["passed_count"]
        sub_status = evaluation["status"]
        timestamp = now_utc()
        submission_no = conn.execute(
            "SELECT COUNT(*) AS c FROM submissions WHERE learning_session_id=?", (session_id,),
        ).fetchone()["c"] + 1
        
        conn.execute(
            """INSERT INTO submissions(id, learning_session_id, source_code, source_sha256, submission_no, idempotency_key, status, passed_count, total_count, created_at, evaluation_json)
               VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (submission_id, session_id, payload.code, sha256(payload.code), submission_no, payload.idempotency_key, sub_status, passed_count, evaluation["total_count"], timestamp, json.dumps(evaluation, ensure_ascii=False)),
        )
        for index, case in enumerate(evaluation["test_cases"], 1):
            conn.execute(
                "INSERT INTO test_results(id, submission_id, sequence_no, status, safe_message, duration_ms) VALUES(?,?,?,?,?,?)",
                (uid(), submission_id, index, case["status"], (case.get("failure_reason") or case["title"])[:4000], case["duration_ms"]),
            )
        if evaluation["executed_count"]:
            conn.execute("UPDATE ai_service_units SET requests = requests + 1 WHERE id='svc-docker'")
        submission = conn.execute("SELECT * FROM submissions WHERE id=?", (submission_id,)).fetchone()
        
    track_event(user["id"], session_id, "submission_queued", {"submission_no": submission_no, "code_bytes": len(payload.code.encode("utf-8"))})
    track_event(user["id"], session_id, "submission_finished", {"status": submission["status"], "passed_count": submission["passed_count"], "duration_ms": evaluation["execution_time_ms"], "execution_status": evaluation["execution_status"]})
    return _submission_response(submission)


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
    return {"submission": _submission_response(submission), "results": [row_dict(item) for item in results]}


@router.post("/sessions/{session_id}/complete")
def complete_session(session_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Hoàn thành phiên học và tạo Bằng chứng tự sửa lỗi (Evidence)."""
    session_owned(session_id, user["id"])
    timestamp = now_utc()
    with db() as conn:
        passed_submissions = conn.execute(
            "SELECT * FROM submissions WHERE learning_session_id=? AND status='passed' AND total_count>0 AND passed_count=total_count ORDER BY created_at DESC",
            (session_id,),
        ).fetchall()
        final_submission = next((row for row in passed_submissions if _verified_pass(row)), None)
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
            raise HTTPException(status_code=409, detail="Cần một bài nộp có đầy đủ test thực thi đạt trong Docker trước khi hoàn thành.")
            
        existing = conn.execute("SELECT * FROM evidence WHERE learning_session_id=?", (session_id,)).fetchone()
        if existing:
            return {"evidence": row_dict(existing), "session_status": "completed"}
            
        passed_count = final_submission["passed_count"]
        payload = f"{session_id}|{first_submission['source_sha256']}|{final_submission['source_sha256']}|{hints}|{passed_count}|{final_submission['evaluation_json']}"
        evidence_id = uid()
        conn.execute(
            """INSERT INTO evidence(id, learning_session_id, first_submission_id, final_submission_id, hint_count, passed_count, evidence_sha256, completed_at)
               VALUES(?,?,?,?,?,?,?,?)""",
            (evidence_id, session_id, first_submission["id"], final_submission["id"], hints, passed_count, sha256(payload), timestamp),
        )
        conn.execute("UPDATE learning_sessions SET status='completed', current_step_no=6, completed_at=? WHERE id=?", (timestamp, session_id))
        evidence = conn.execute("SELECT * FROM evidence WHERE id=?", (evidence_id,)).fetchone()
        
    track_event(user["id"], session_id, "lesson_completed", {"hint_count": hints, "final_submission_id": final_submission["id"], "runner": "docker-python-v1"})
    return {"evidence": row_dict(evidence), "session_status": "completed"}


@router.get("/sessions/{session_id}/evidence")
def get_session_evidence(session_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Xem bằng chứng học tập (Chỉ học viên sở hữu hoặc Giảng viên khi đã được cấp quyền)."""
    with db() as conn:
        session = conn.execute("SELECT * FROM learning_sessions WHERE id=?", (session_id,)).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên học")
        allowed = (user["id"] == session["user_id"])
        if user.get("role") in ("instructor", "admin", "org_admin") and session["teacher_visibility"]:
            allowed = True
        if not allowed:
            log_audit(user["id"], "read_evidence", "learning_evidence", session_id, "deny", "consent_or_scope")
            raise HTTPException(status_code=403, detail="Evidence chưa được chia sẻ hoặc ngoài phạm vi")
        
        evidence = conn.execute("SELECT * FROM evidence WHERE learning_session_id=?", (session_id,)).fetchone()
        first = conn.execute("SELECT source_code, source_sha256, passed_count, evaluation_json FROM submissions WHERE id=?", (evidence["first_submission_id"],)).fetchone() if evidence else None
        final = conn.execute("SELECT source_code, source_sha256, passed_count, evaluation_json FROM submissions WHERE id=?", (evidence["final_submission_id"],)).fetchone() if evidence else None
        terms = conn.execute("SELECT term_text FROM term_selections WHERE learning_session_id=?", (session_id,)).fetchall()
        
    if user.get("role") in ("instructor", "org_admin"):
        track_event(user["id"], session_id, "instructor_evidence_viewed", {"organization_id": session["organization_id"]})
    return {
        "evidence": row_dict(evidence),
        "first_submission": ({**dict(first), "evaluation": _evaluation(first)} if first else None),
        "final_submission": ({**dict(final), "evaluation": _evaluation(final)} if final else None),
        "terms": [row_dict(term) for term in terms],
    }
