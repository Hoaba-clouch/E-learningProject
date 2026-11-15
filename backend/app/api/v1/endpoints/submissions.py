from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user, log_audit, session_owned
from app.core.database import get_db
from app.core.security import sha256, uid
from app.models.learning import LearningSession, TermSelection
from app.models.submission import AIHint, AIInteraction, Evidence, Submission, TestResult
from app.models.user import StudentProfile
from app.schemas.submission import SubmissionIn
from app.services.analytics import track_event
from app.services.code_evaluator import evaluate_code

router = APIRouter(tags=["Submissions & Evaluation"])


@router.post("/sessions/{session_id}/submissions", status_code=status.HTTP_201_CREATED)
def create_submission(
    session_id: str,
    payload: SubmissionIn,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Tiếp nhận mã nguồn và chấm điểm tự động trong sandbox."""
    session_owned(session_id, user["id"], db=db)

    existing = db.scalar(select(Submission).where(Submission.idempotency_key == payload.idempotency_key))
    if existing:
        return {
            "id": existing.id,
            "status": existing.status,
            "passed_count": existing.passed_count,
            "total_count": existing.total_count,
        }

    submission_count = db.scalar(
        select(func.count(Submission.id)).where(Submission.learning_session_id == session_id)
    ) or 0
    submission_no = int(submission_count) + 1

    submission_id = uid()
    passed_count, results = evaluate_code(payload.code)
    sub_status = "passed" if passed_count == 5 else "failed"
    now = datetime.now(timezone.utc)

    submission = Submission(
        id=submission_id,
        learning_session_id=session_id,
        exercise_id=payload.exercise_id,
        programming_language="python",
        source_code=payload.code,
        source_sha256=sha256(payload.code),
        submission_no=submission_no,
        idempotency_key=payload.idempotency_key,
        status=sub_status,
        passed_count=passed_count,
        total_count=5,
        score=float(passed_count * 20),
        duration_ms=8,
        created_at=now,
    )
    db.add(submission)
    db.flush()

    for index, (result_status, message, duration) in enumerate(results, 1):
        db.add(
            TestResult(
                id=uid(),
                submission_id=submission_id,
                sequence_no=index,
                status=result_status,
                safe_message=message,
                duration_ms=int(duration),
            )
        )

    track_event(
        user["id"],
        session_id,
        "submission_queued",
        {"submission_no": submission_no, "code_bytes": len(payload.code.encode("utf-8"))},
        db=db,
    )
    track_event(
        user["id"],
        session_id,
        "submission_finished",
        {"status": submission.status, "passed_count": submission.passed_count, "duration_ms": 8},
        db=db,
    )
    return {
        "id": submission.id,
        "status": submission.status,
        "passed_count": submission.passed_count,
        "total_count": submission.total_count,
    }


@router.get("/submissions/{submission_id}")
def get_submission(
    submission_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Xem chi tiết bài nộp và kết quả các test cases."""
    submission = db.get(Submission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài nộp")

    if submission.learning_session_id:
        session = db.get(LearningSession, submission.learning_session_id)
        if session and user["id"] != session.user_id:
            raise HTTPException(status_code=403, detail="Không có quyền xem bài nộp")

    results = db.scalars(
        select(TestResult)
        .where(TestResult.submission_id == submission_id)
        .order_by(TestResult.sequence_no)
    ).all()
    return {
        "submission": submission.to_dict(),
        "results": [
            {
                "sequence_no": r.sequence_no,
                "status": r.status,
                "safe_message": r.safe_message,
                "duration_ms": r.duration_ms,
            }
            for r in results
        ],
    }


@router.post("/sessions/{session_id}/complete")
def complete_session(
    session_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Hoàn thành phiên học và tạo Bằng chứng tự sửa lỗi (Evidence)."""
    session_owned(session_id, user["id"], db=db)

    final_submission = db.scalar(
        select(Submission)
        .where(
            Submission.learning_session_id == session_id,
            Submission.passed_count == Submission.total_count,
        )
        .order_by(Submission.created_at.desc())
    )
    first_submission = db.scalar(
        select(Submission)
        .where(Submission.learning_session_id == session_id)
        .order_by(Submission.created_at.asc())
    )
    if not final_submission or not first_submission:
        raise HTTPException(status_code=409, detail="Cần có bài nộp đạt 5/5 trước khi hoàn thành")

    existing = db.scalar(select(Evidence).where(Evidence.learning_session_id == session_id))
    if existing:
        return {"evidence": existing.to_dict(), "session_status": "completed"}

    hints = int(
        db.scalar(
            select(func.count(AIHint.id))
            .join(AIInteraction, AIInteraction.id == AIHint.ai_interaction_id)
            .where(AIInteraction.learning_session_id == session_id)
        )
        or 0
    )
    submission_total = int(
        db.scalar(select(func.count(Submission.id)).where(Submission.learning_session_id == session_id)) or 0
    )

    now = datetime.now(timezone.utc)
    payload = f"{session_id}|{first_submission.source_sha256}|{final_submission.source_sha256}|{hints}|5"
    evidence = Evidence(
        id=uid(),
        learning_session_id=session_id,
        first_submission_id=first_submission.id,
        final_submission_id=final_submission.id,
        hint_count=hints,
        passed_count=5,
        evidence_sha256=sha256(payload),
        completed_at=now,
    )
    db.add(evidence)

    learning_session = db.get(LearningSession, session_id)
    if learning_session:
        learning_session.status = "completed"
        learning_session.current_step_no = 6
        learning_session.completed_at = now
        learning_session.updated_at = now

    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user["id"]))
    if profile:
        profile.exp_points += 50
        profile.updated_at = now

    db.flush()
    track_event(
        user["id"],
        session_id,
        "lesson_completed",
        {"duration_sec": 180, "hint_count": hints, "submission_count": submission_total},
        db=db,
    )
    track_event(
        user["id"],
        session_id,
        "self_correction_achieved",
        {"fail_count": max(0, submission_total - 1), "hint_count": hints},
        db=db,
    )
    return {"evidence": evidence.to_dict(), "session_status": "completed"}


@router.get("/sessions/{session_id}/evidence")
def get_session_evidence(
    session_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Xem bằng chứng học tập (Chỉ học viên sở hữu hoặc Giảng viên khi đã được cấp quyền)."""
    session = db.get(LearningSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên học")

    allowed = user["id"] == session.user_id
    if user.get("role") in ("instructor", "admin", "org_admin") and session.teacher_visibility:
        allowed = True
    if not allowed:
        log_audit(user["id"], "read_evidence", "learning_evidence", session_id, "deny", "consent_or_scope")
        raise HTTPException(status_code=403, detail="Evidence chưa được chia sẻ hoặc ngoài phạm vi")

    evidence = db.scalar(select(Evidence).where(Evidence.learning_session_id == session_id))
    first = db.get(Submission, evidence.first_submission_id) if evidence else None
    final = db.get(Submission, evidence.final_submission_id) if evidence else None
    terms = db.scalars(select(TermSelection).where(TermSelection.learning_session_id == session_id)).all()

    if user.get("role") in ("instructor", "admin", "org_admin"):
        track_event(
            user["id"],
            session_id,
            "instructor_evidence_viewed",
            {"organization_id": session.organization_id},
            db=db,
        )

    return {
        "evidence": evidence.to_dict() if evidence else None,
        "first_submission": (
            {"source_code": first.source_code, "passed_count": first.passed_count} if first else None
        ),
        "final_submission": (
            {"source_code": final.source_code, "passed_count": final.passed_count} if final else None
        ),
        "terms": [{"term_text": t.term_text} for t in terms],
    }
