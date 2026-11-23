from __future__ import annotations

import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user, session_owned
from app.core.database import db, row_dict
from app.core.security import uid
from app.core.timezone import now_utc
from app.schemas.submission import AIInteractionIn, SocraticChatIn
from app.services.ai_tutor import ask_socratic_with_policy
from app.services.analytics import track_event
from app.services.gemini_client import record_ai_usage

router = APIRouter(tags=["AI Tutor"])


@router.post("/ai/socratic-chat")
def socratic_chat(
    payload: SocraticChatIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Chat hỏi đáp Socratic AI Tutor trực tiếp trên LearningWorkspace, áp dụng Guardrail của Admin và Gemini API."""
    strict_refuse = True
    with db() as conn:
        svc = conn.execute("SELECT active FROM ai_service_units WHERE id='svc-socratic'").fetchone()
        if svc and not svc["active"]:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Dịch vụ Socratic AI Tutor hiện đang tạm dừng bởi Quản trị viên.",
            )
        pol = conn.execute("SELECT value_json FROM system_settings WHERE key='policies'").fetchone()
        if pol:
            try:
                pol_data = json.loads(pol["value_json"])
                strict_refuse = bool(pol_data.get("guardrailRefuseAnswer", True))
            except Exception:
                strict_refuse = True

    res = ask_socratic_with_policy(
        payload.message,
        payload.code_context,
        strict_refuse=strict_refuse,
        workspace_context=payload.workspace_context.model_dump() if payload.workspace_context else None,
        history=[h.model_dump() for h in payload.history],
        hint_level=payload.hint_level,
    )

    in_tok = int(res.pop("input_tokens", 0) or 0)
    out_tok = int(res.pop("output_tokens", 0) or 0)
    with db() as conn:
        record_ai_usage(conn, "svc-socratic", in_tok or 420, out_tok or 180)
        conn.commit()

    track_event(
        user["id"],
        payload.session_id,
        "socratic_chat",
        {"policy_decision": res["policy_decision"], "model": res.get("model_id")},
    )
    return res


@router.post("/sessions/{session_id}/ai-interactions")
def create_ai_interaction(
    session_id: str,
    payload: AIInteractionIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Tương tác hỏi đáp Socratic AI Tutor theo nguyên tắc sư phạm (không leak giải pháp)."""
    session_owned(session_id, user["id"])
    message_lower = payload.message.lower()
    unsafe_request = any(
        word in message_lower
        for word in ["đáp án hoàn chỉnh", "complete solution", "write the code", "lời giải"]
    )
    if unsafe_request:
        policy = "refuse_answer"
        answer = "Mình không đưa lời giải hoàn chỉnh. Hãy nhìn ca chuỗi rỗng và xác định điều kiện cần đặt trước history.append(page)."
    else:
        policy = "question"
        answer = "Khi page là chuỗi rỗng, dòng nào vẫn làm thay đổi history? Hãy đối chiếu với source đã pin trước khi mở gợi ý."

    interaction_id = uid()
    timestamp = now_utc()
    citations = json.dumps([{"source_version": "source-version-python312-deque", "label": "Python 3.12"}])
    
    with db() as conn:
        conn.execute(
            """INSERT INTO ai_interactions(id, learning_session_id, submission_id, user_message, assistant_message, policy_decision, model_id, prompt_version, citation_json, latency_ms, created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (interaction_id, session_id, payload.submission_id, payload.message, answer, policy, "codemind-local-hint", "socratic-v1", citations, 40, timestamp),
        )
        interaction = conn.execute(
            "SELECT id, assistant_message, policy_decision, model_id, prompt_version, citation_json, latency_ms FROM ai_interactions WHERE id=?",
            (interaction_id,),
        ).fetchone()

    if policy == "refuse_answer":
        track_event(user["id"], session_id, "ai_answer_refused", {"policy_version": "socratic-v1", "model_id": "codemind-local-hint"})
    return row_dict(interaction) or {}


@router.post("/ai-interactions/{interaction_id}/hints/{level}/open")
def open_hint(
    interaction_id: str,
    level: int,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Mở gợi ý Socratic theo thang 3 cấp độ (Level 1 -> 2 -> 3)."""
    if level not in (1, 2, 3):
        raise HTTPException(status_code=422, detail="Hint level phải từ 1 đến 3")
        
    hint_text = {
        1: "Khi page là chuỗi rỗng, dòng nào vẫn thay đổi history?",
        2: "maxlen chỉ giới hạn số phần tử. Điều kiện kiểm tra nên đặt trước history.append(page).",
        3: "Nếu page rỗng, trả lại history hiện tại; chỉ append khi đầu vào hợp lệ.",
    }[level]

    with db() as conn:
        interaction = conn.execute("SELECT * FROM ai_interactions WHERE id=?", (interaction_id,)).fetchone()
        if not interaction:
            raise HTTPException(status_code=404, detail="Không tìm thấy tương tác AI")
        owner = conn.execute("SELECT user_id FROM learning_sessions WHERE id=?", (interaction["learning_session_id"],)).fetchone()
        if not owner or owner["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Không có quyền mở hint")
            
        previous = conn.execute("SELECT MAX(level) max_level FROM ai_hints WHERE ai_interaction_id=?", (interaction_id,)).fetchone()["max_level"]
        if previous is not None and level > previous + 1:
            raise HTTPException(status_code=409, detail="Hint phải mở tuần tự từ mức 1 đến 3")
            
        existing = conn.execute("SELECT * FROM ai_hints WHERE ai_interaction_id=? AND level=?", (interaction_id, level)).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO ai_hints(id, ai_interaction_id, level, hint_text, opened_at, policy_passed) VALUES(?,?,?,?,?,?)",
                (uid(), interaction_id, level, hint_text, now_utc(), 1),
            )
        hint = conn.execute("SELECT level, hint_text, opened_at, policy_passed FROM ai_hints WHERE ai_interaction_id=? AND level=?", (interaction_id, level)).fetchone()
        session_id = interaction["learning_session_id"]

    track_event(user["id"], session_id, "hint_opened", {"level": level, "previous_fail_count": 1})
    return row_dict(hint) or {}
