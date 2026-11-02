from __future__ import annotations

import json
from app.core.database import db
from app.core.security import uid
from app.core.timezone import now_utc

def track_event(user_id: str | None, session_id: str | None, event_name: str, properties: dict) -> None:
    """Ghi nhận log sự kiện học tập vào bảng analytics_events."""
    with db() as conn:
        conn.execute(
            "INSERT INTO analytics_events(id,user_id,session_id,event_name,properties,occurred_at) VALUES(?,?,?,?,?,?)",
            (uid(), user_id, session_id, event_name, json.dumps(properties), now_utc()),
        )
