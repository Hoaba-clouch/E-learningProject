from __future__ import annotations

from datetime import datetime, timezone

def now_utc() -> str:
    """Trả về thời gian UTC ISO-8601 chuẩn kết thúc bằng +00:00 hoặc Z."""
    return datetime.now(timezone.utc).isoformat()

def now_utc_dt() -> datetime:
    """Trả về đối tượng datetime có tzinfo UTC."""
    return datetime.now(timezone.utc)
