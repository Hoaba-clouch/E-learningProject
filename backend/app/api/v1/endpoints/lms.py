from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user, require_role, session_owned
from app.core.database import get_db
from app.core.security import uid
from app.models.course import Lesson, LessonSource, LessonStep, Source, SourceVersion
from app.models.learning import ConceptAnswer, LearningSession, StepAttempt, TermSelection
from app.models.submission import Evidence
from app.models.user import Consent
from app.schemas.lms import ConceptAnswersIn, ProgressIn, SessionStartIn, TermsIn
from app.services.analytics import track_event

router = APIRouter(tags=["LMS & Learning Sessions"])


@router.get("/lessons/{slug}")
def get_lesson(
    slug: str,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Lấy nội dung bài học và tài liệu chuẩn đính kèm."""
    lesson = db.scalar(
        select(Lesson)
        .where(Lesson.slug == slug, Lesson.status == "published")
        .order_by(Lesson.version.desc())
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học")

    steps = db.scalars(
        select(LessonStep)
        .where(LessonStep.lesson_id == lesson.id)
        .order_by(LessonStep.sequence_no)
    ).all()
    sources = db.execute(
        select(
            Source.id.label("source_id"),
            Source.canonical_url,
            Source.publisher,
            Source.trust_status,
            SourceVersion.id.label("source_version_id"),
            SourceVersion.version_label,
            SourceVersion.content_text,
            SourceVersion.content_sha256,
            SourceVersion.availability_status,
        )
        .select_from(LessonSource)
        .join(SourceVersion, SourceVersion.id == LessonSource.source_version_id)
        .join(Source, Source.id == SourceVersion.source_id)
        .where(LessonSource.lesson_id == lesson.id)
        .order_by(LessonSource.display_order)
    ).mappings().all()

    track_event(
        user["id"],
        None,
        "lesson_viewed",
        {"lesson_id": lesson.id, "version": lesson.version},
        db=db,
    )
    return {
        "lesson": lesson.to_dict(),
        "steps": [
            {
                "sequence_no": s.sequence_no,
                "step_type": s.step_type,
                "title": s.title,
                "completion_rule": s.completion_rule,
            }
            for s in steps
        ],
        "sources": [dict(item) for item in sources],
    }


@router.post("/learning-sessions", status_code=status.HTTP_201_CREATED)
def create_learning_session(
    payload: SessionStartIn,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Khởi tạo phiên học tập cho sinh viên."""
    require_role(user, "student")
    lesson = db.scalar(select(Lesson).where(Lesson.id == payload.lesson_id, Lesson.status == "published"))
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson chưa được publish")

    consent = db.scalar(
        select(Consent).where(Consent.user_id == user["id"], Consent.purpose == "academic_integrity")
    )
    if not consent or not consent.granted:
        raise HTTPException(status_code=409, detail="Cần cam kết trung thực trước khi bắt đầu")

    visibility = db.scalar(
        select(Consent).where(Consent.user_id == user["id"], Consent.purpose == "teacher_visibility")
    )
    session_id = uid()
    now = datetime.now(timezone.utc)
    org_id = payload.organization_id or user.get("organization_id") or "org-demo-codemind"

    learning_session = LearningSession(
        id=session_id,
        user_id=user["id"],
        lesson_id=lesson.id,
        organization_id=org_id,
        status="in_progress",
        current_step_no=1,
        progress_version=1,
        teacher_visibility=int(bool(visibility and visibility.granted)),
        started_at=now,
        updated_at=now,
    )
    db.add(learning_session)
    db.flush()

    first_step = db.scalar(
        select(LessonStep).where(LessonStep.lesson_id == lesson.id, LessonStep.sequence_no == 1)
    )
    if first_step:
        db.add(
            StepAttempt(
                id=uid(),
                learning_session_id=session_id,
                lesson_step_id=first_step.id,
                attempt_no=1,
                status="started",
            )
        )

    db.flush()
    track_event(
        user["id"],
        session_id,
        "learning_session_started",
        {"lesson_id": lesson.id, "org_present": bool(org_id)},
        db=db,
    )
    return learning_session.to_dict()


@router.get("/learning-sessions/{session_id}")
def get_learning_session(
    session_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Lấy chi tiết phiên học tập."""
    session = session_owned(session_id, user["id"], db=db)
    attempts = db.scalars(
        select(StepAttempt)
        .where(StepAttempt.learning_session_id == session_id)
        .order_by(StepAttempt.id)
    ).all()
    terms = db.scalars(
        select(TermSelection).where(TermSelection.learning_session_id == session_id)
    ).all()
    concept = db.scalar(
        select(ConceptAnswer)
        .where(ConceptAnswer.learning_session_id == session_id)
        .order_by(ConceptAnswer.id.desc())
    )
    evidence = db.scalar(select(Evidence).where(Evidence.learning_session_id == session_id))
    return {
        "session": session,
        "attempts": [a.to_dict() for a in attempts],
        "terms": [{"term_text": t.term_text, "context_excerpt": t.context_excerpt} for t in terms],
        "concept": concept.to_dict() if concept else None,
        "evidence": evidence.to_dict() if evidence else None,
    }


@router.patch("/learning-sessions/{session_id}/progress")
def update_progress(
    session_id: str,
    payload: ProgressIn,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Cập nhật tiến trình bước học tập."""
    session_owned(session_id, user["id"], db=db)
    learning_session = db.get(LearningSession, session_id)
    assert learning_session is not None

    if learning_session.progress_version != payload.progress_version:
        raise HTTPException(status_code=409, detail="Progress version đã thay đổi, hãy tải lại phiên học")
    if payload.target_step > learning_session.current_step_no + 1:
        raise HTTPException(status_code=422, detail="Chưa hoàn thành bước trước đó")

    now = datetime.now(timezone.utc)
    learning_session.current_step_no = payload.target_step
    learning_session.progress_version += 1
    learning_session.updated_at = now

    step = db.scalar(
        select(LessonStep).where(
            LessonStep.lesson_id == learning_session.lesson_id,
            LessonStep.sequence_no == payload.target_step,
        )
    )
    if step:
        max_attempt = db.scalar(
            select(func.max(StepAttempt.attempt_no)).where(
                StepAttempt.learning_session_id == session_id,
                StepAttempt.lesson_step_id == step.id,
            )
        )
        next_attempt = (max_attempt + 1) if max_attempt is not None else 1
        db.add(
            StepAttempt(
                id=uid(),
                learning_session_id=session_id,
                lesson_step_id=step.id,
                attempt_no=next_attempt,
                status="passed" if payload.target_step > 1 else "started",
                completed_at=now if payload.target_step > 1 else None,
            )
        )

    db.flush()
    track_event(user["id"], session_id, "step_advanced", {"target_step": payload.target_step}, db=db)
    return learning_session.to_dict()


@router.post("/sessions/{session_id}/terms", status_code=status.HTTP_201_CREATED)
def select_terms(
    session_id: str,
    payload: TermsIn,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Lưu từ khóa thuật ngữ chuẩn từ documentation."""
    session_owned(session_id, user["id"], db=db)
    normalized = {term.strip().lower() for term in payload.terms if term.strip()}
    if not normalized or "maxlen" not in normalized:
        raise HTTPException(status_code=422, detail="Hãy chọn thuật ngữ có trong source đã pin")

    source = db.get(SourceVersion, payload.source_version_id)
    if not source or any(term not in source.content_text.lower() for term in normalized):
        raise HTTPException(status_code=422, detail="Thuật ngữ không có trong source version")

    now = datetime.now(timezone.utc)
    for term in sorted(normalized):
        existing = db.scalar(
            select(TermSelection).where(
                TermSelection.learning_session_id == session_id,
                TermSelection.term_normalized == term,
            )
        )
        if existing:
            existing.source_version_id = payload.source_version_id
            existing.term_text = term
            existing.context_excerpt = "maxlen chỉ giữ tối đa số phần tử được cấu hình."
        else:
            db.add(
                TermSelection(
                    id=uid(),
                    learning_session_id=session_id,
                    source_version_id=payload.source_version_id,
                    term_text=term,
                    term_normalized=term,
                    context_excerpt="maxlen chỉ giữ tối đa số phần tử được cấu hình.",
                    created_at=now,
                )
            )
    db.flush()

    saved = db.scalars(
        select(TermSelection).where(TermSelection.learning_session_id == session_id)
    ).all()
    track_event(user["id"], session_id, "term_selected", {"term_count": len(saved)}, db=db)
    return {
        "terms": [
            {"term_text": item.term_text, "context_excerpt": item.context_excerpt}
            for item in saved
        ]
    }


@router.post("/sessions/{session_id}/concept-answers")
def submit_concept_answers(
    session_id: str,
    payload: ConceptAnswersIn,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Chấm điểm câu hỏi khái niệm (Concept check)."""
    session_owned(session_id, user["id"], db=db)
    selected = payload.answers[0].selected_option if payload.answers else ""
    correct = selected == "kiểm tra page → trước append"

    db.add(
        ConceptAnswer(
            id=uid(),
            learning_session_id=session_id,
            relation_key="input_guard",
            selected_option=selected,
            is_correct=int(correct),
            rule_version="deque-v1",
            answered_at=datetime.now(timezone.utc),
        )
    )
    track_event(user["id"], session_id, "concept_check_submitted", {"score": 1 if correct else 0}, db=db)
    db.commit()

    if not correct:
        raise HTTPException(status_code=422, detail="Hãy nối bước kiểm tra page trước append")
    return {
        "score": 1,
        "correct": True,
        "feedback": "Đúng: input guard phải chạy trước history.append(page).",
    }
