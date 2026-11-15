from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Text, TypeDecorator
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.timezone import ensure_utc, to_utc_iso


class UTCDateTime(TypeDecorator[datetime]):
    """TypeDecorator cho SQLite giúp lưu chuỗi ISO-8601 UTC ('Z') và đọc lại thành datetime aware UTC."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: datetime | str | None, dialect: Dialect) -> str | None:
        if value is None or value == "":
            return None
        return to_utc_iso(value)

    def process_result_value(self, value: datetime | str | None, dialect: Dialect) -> datetime | None:
        if value is None or value == "":
            return None
        return ensure_utc(value)


H4DateTime = DateTime(timezone=True).with_variant(UTCDateTime(), "sqlite")


def utc_now_default() -> datetime:
    """Default factory chuẩn H4 sử dụng datetime.now(timezone.utc)."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Base declarative class cho toàn bộ mô hình SQLAlchemy CodeMind Campus."""

    def to_dict(self, exclude: set[str] | None = None) -> dict[str, Any]:
        """Serialize ORM instance sang dict JSON-safe với mọi timestamp UTC ISO-8601 ('Z')."""
        skip = exclude or set()
        result: dict[str, Any] = {}
        for column in self.__table__.columns:
            key = column.name
            if key in skip:
                continue
            value = getattr(self, key)
            if isinstance(value, datetime):
                result[key] = to_utc_iso(value)
            else:
                result[key] = value
        return result


class TimestampMixin:
    """Mixin chuẩn H4 cung cấp created_at và updated_at dùng DateTime(timezone=True) và datetime.now(timezone.utc)."""

    created_at: Mapped[datetime] = mapped_column(
        H4DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        H4DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
