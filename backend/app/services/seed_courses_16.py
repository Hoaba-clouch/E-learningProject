from __future__ import annotations
import json
import os
from typing import Any

_COURSES_CACHE: list[dict[str, Any]] | None = None

def build_all_16_courses_seed() -> list[dict[str, Any]]:
    global _COURSES_CACHE
    if _COURSES_CACHE is not None:
        return _COURSES_CACHE
    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "courses_16.json")
    with open(json_path, "r", encoding="utf-8") as f:
        _COURSES_CACHE = json.load(f)
    return _COURSES_CACHE
