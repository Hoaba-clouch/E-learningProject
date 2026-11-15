from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user, session_owned
from app.core.database import get_db
from app.core.security import uid
from app.models.learning import LearningSession
from app.models.submission import AIHint, AIInteraction
from app.schemas.submission import AIInteractionIn
from app.services.analytics import track_event

router = APIRouter(tags=["AI Tutor"])


@router.post("/sessions/{session_id}/ai-interactions")
def create_ai_interaction(
    session_id: str,
    payload: AIInteractionIn,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Tương tác hỏi đáp Socratic AI Tutor theo nguyên tắc sư phạm (không leak giải pháp)."""
    session_owned(session_id, user["id"], db=db)

    message_lower = payload.message.lower()
    unsafe_request = any(
        word in message_lower
        for word in ["đáp án hoàn chỉnh", "complete solution", "write the code", "lời giải"]
    )
    if unsafe_request:
        policy = "refuse_answer"
        answer = (
            "Mình không đưa lời giải hoàn chỉnh. Hãy nhìn ca chuỗi rỗng và xác định điều kiện cần đặt "
            "trước history.append(page)."
        )
    else:
        policy = "question"
        answer = (
            "Khi page là chuỗi rỗng, dòng nào vẫn làm thay đổi history? "
            "Hãy đối chiếu với source đã pin trước khi mở gợi ý."
        )

    interaction_id = uid()
    citations = json.dumps([{"source_version": "source-version-python312-deque", "label": "Python 3.12"}])
    interaction = AIInteraction(
        id=interaction_id,
        learning_session_id=session_id,
        submission_id=payload.submission_id,
        user_message=payload.message,
        assistant_message=answer,
        policy_decision=policy,
        model_id="codemind-local-hint",
        prompt_version="socratic-v1",
        citation_json=citations,
        latency_ms=40,
        created_at=datetime.now(timezone.utc),
    )
    db.add(interaction)
    db.flush()

    if policy == "refuse_answer":
        track_event(
            user["id"],
            session_id,
            "ai_answer_refused",
            {"policy_version": "socratic-v1", "model_id": "codemind-local-hint"},
            db=db,
        )

    return {
        "id": interaction.id,
        "assistant_message": interaction.assistant_message,
        "policy_decision": interaction.policy_decision,
        "model_id": interaction.model_id,
        "prompt_version": interaction.prompt_version,
        "citation_json": interaction.citation_json,
        "latency_ms": interaction.latency_ms,
    }


@router.post("/ai-interactions/{interaction_id}/hints/{level}/open")
def open_hint(
    interaction_id: str,
    level: int,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Mở gợi ý Socratic theo thang 3 cấp độ (Level 1 -> 2 -> 3)."""
    if level not in (1, 2, 3):
        raise HTTPException(status_code=422, detail="Hint level phải từ 1 đến 3")

    hint_text = {
        1: "Khi page là chuỗi rỗng, dòng nào vẫn thay đổi history?",
        2: "maxlen chỉ giới hạn số phần tử. Điều kiện kiểm tra nên đặt trước history.append(page).",
        3: "Nếu page rỗng, trả lại history hiện tại; chỉ append khi đầu vào hợp lệ.",
    }[level]

    interaction = db.get(AIInteraction, interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Không tìm thấy tương tác AI")

    owner = db.get(LearningSession, interaction.learning_session_id)
    if not owner or owner.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Không có quyền mở hint")

    previous = db.scalar(select(func.max(AIHint.level)).where(AIHint.ai_interaction_id == interaction_id))
    if previous is not None and level > previous + 1:
        raise HTTPException(status_code=409, detail="Hint phải mở tuần tự từ mức 1 đến 3")

    existing = db.scalar(
        select(AIHint).where(AIHint.ai_interaction_id == interaction_id, AIHint.level == level)
    )
    if not existing:
        existing = AIHint(
            id=uid(),
            ai_interaction_id=interaction_id,
            level=level,
            hint_text=hint_text,
            opened_at=datetime.now(timezone.utc),
            policy_passed=1,
        )
        db.add(existing)
        db.flush()

    track_event(
        user["id"],
        interaction.learning_session_id,
        "hint_opened",
        {"level": level, "previous_fail_count": 1},
        db=db,
    )
    serialized = existing.to_dict()
    return {
        "level": serialized["level"],
        "hint_text": serialized["hint_text"],
        "opened_at": serialized["opened_at"],
        "policy_passed": serialized["policy_passed"],
    }
