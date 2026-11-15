from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.database import db_session
from app.core.security import uid
from app.models.audit import AnalyticsEvent


def track_event(
    user_id: str | None,
    session_id: str | None,
    event_name: str,
    properties: dict[str, Any],
    db: Session | None = None,
) -> None:
    """Ghi nhận log sự kiện học tập vào bảng analytics_events với timestamp UTC (H4)."""
    event = AnalyticsEvent(
        id=uid(),
        user_id=user_id,
        session_id=session_id,
        event_name=event_name,
        properties=json.dumps(properties),
        occurred_at=datetime.now(timezone.utc),
    )
    if db is not None:
        db.add(event)
        return
    with db_session() as own_session:
        own_session.add(event)
