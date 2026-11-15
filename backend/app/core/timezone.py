from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Trả về datetime aware chuẩn UTC (datetime.now(timezone.utc)) theo chuẩn H4."""
    return datetime.now(timezone.utc)


def now_utc_dt() -> datetime:
    """Alias tương thích cho utc_now(), trả về datetime có tzinfo=timezone.utc."""
    return utc_now()


def ensure_utc(value: datetime | str | None) -> datetime | None:
    """Chuẩn hóa datetime hoặc chuỗi ISO-8601 về datetime aware ở múi giờ UTC."""
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text.endswith("Z"):
            text = f"{text[:-1]}+00:00"
        dt = datetime.fromisoformat(text)
    elif isinstance(value, datetime):
        dt = value
    else:
        raise TypeError(f"Unsupported timestamp value: {type(value)!r}")

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def to_utc_iso(value: datetime | str | None) -> str | None:
    """Định dạng timestamp thành chuỗi ISO-8601 UTC kết thúc bằng 'Z' (chuẩn H4)."""
    dt = ensure_utc(value)
    if dt is None:
        return None
    return dt.isoformat(timespec="microseconds").replace("+00:00", "Z")


def now_utc() -> str:
    """Trả về chuỗi thời gian UTC ISO-8601 hiện tại kết thúc bằng 'Z'."""
    iso_val = to_utc_iso(utc_now())
    assert iso_val is not None
    return iso_val
