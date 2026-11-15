from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, PlainSerializer, WithJsonSchema

from app.core.timezone import ensure_utc, to_utc_iso


def _validate_utc_datetime(value: datetime | str | None) -> datetime | None:
    if value is None or value == "":
        return None
    return ensure_utc(value)


def _serialize_utc_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return to_utc_iso(value)


UTCDatetime = Annotated[
    datetime,
    BeforeValidator(_validate_utc_datetime),
    PlainSerializer(_serialize_utc_datetime, return_type=str, when_used="json"),
    WithJsonSchema({"type": "string", "format": "date-time"}),
]


class UTCSchema(BaseModel):
    """Base Pydantic v2 schema chuẩn H4 tự động chuẩn hóa và serialize UTC ISO-8601 ('Z')."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
