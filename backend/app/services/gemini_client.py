from __future__ import annotations

import json
import re
import threading
import time
from typing import Any
import urllib.error
import urllib.request

from app.core.config import (
    GEMINI_API_KEYS,
    GEMINI_FALLBACK_MODEL,
    GEMINI_FALLBACK_MODELS,
    GEMINI_MODEL,
    GEMINI_TIMEOUT_SEC,
)

_LOCK = threading.Lock()
_RR_INDEX = 0
_KEY_COOLDOWN_UNTIL: dict[str, float] = {}
_COOLDOWN_SECONDS = 65.0
_MODEL_COOLDOWN_UNTIL: dict[str, float] = {}
_MODEL_COOLDOWN_SECONDS = 45.0

_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


def _next_available_keys(max_attempts: int = 4) -> list[str]:
    """Lấy tối đa `max_attempts` API key khả dụng theo cơ chế xoay vòng (round-robin + cooldown)."""
    global _RR_INDEX
    if not GEMINI_API_KEYS:
        return []
    now = time.monotonic()
    total = len(GEMINI_API_KEYS)
    with _LOCK:
        start = _RR_INDEX % total
        _RR_INDEX = (_RR_INDEX + 1) % total
        healthy: list[str] = []
        cooling: list[str] = []
        for offset in range(total):
            key = GEMINI_API_KEYS[(start + offset) % total]
            if _KEY_COOLDOWN_UNTIL.get(key, 0.0) <= now:
                healthy.append(key)
            else:
                cooling.append(key)
    ordered = healthy + cooling
    return ordered[: max(1, min(max_attempts, len(ordered)))]


def _mark_key_cooldown(api_key: str, seconds: float = _COOLDOWN_SECONDS) -> None:
    with _LOCK:
        _KEY_COOLDOWN_UNTIL[api_key] = time.monotonic() + seconds


def _mark_model_cooldown(model_name: str, seconds: float = _MODEL_COOLDOWN_SECONDS) -> None:
    with _LOCK:
        _MODEL_COOLDOWN_UNTIL[model_name] = time.monotonic() + seconds


def _ordered_models() -> list[str]:
    """Lấy danh sách model ưu tiên: model chính -> danh sách dự phòng, đẩy model đang cooldown xuống cuối."""
    raw = [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]
    dedup: list[str] = []
    for m in raw:
        cm = str(m or "").strip()
        if cm and cm not in dedup:
            dedup.append(cm)
    if not dedup and GEMINI_FALLBACK_MODEL:
        dedup = [GEMINI_FALLBACK_MODEL]
    now = time.monotonic()
    with _LOCK:
        healthy = [m for m in dedup if _MODEL_COOLDOWN_UNTIL.get(m, 0.0) <= now]
        cooling = [m for m in dedup if _MODEL_COOLDOWN_UNTIL.get(m, 0.0) > now]
    return healthy + cooling


def _build_gemini_contents(
    prompt: str,
    history: list[dict[str, str]] | None = None,
) -> list[dict[str, Any]]:
    """Chuyển lịch sử hội thoại thành mảng contents luân phiên user/model hợp lệ cho Gemini."""
    contents: list[dict[str, Any]] = []
    if history:
        for turn in history[-8:]:
            if not isinstance(turn, dict):
                continue
            txt = str(turn.get("text") or turn.get("content") or "").strip()
            if not txt:
                continue
            raw_role = str(turn.get("role") or turn.get("from") or "user").strip().lower()
            gemini_role = "model" if raw_role in ("assistant", "mentor", "model", "ai") else "user"
            if not contents and gemini_role == "model":
                continue
            if contents and contents[-1]["role"] == gemini_role:
                contents[-1]["parts"][0]["text"] += f"\n\n{txt}"
            else:
                contents.append({"role": gemini_role, "parts": [{"text": txt}]})

    clean_prompt = prompt.strip()
    if contents and contents[-1]["role"] == "user":
        contents[-1]["parts"][0]["text"] += f"\n\n{clean_prompt}"
    else:
        contents.append({"role": "user", "parts": [{"text": clean_prompt}]})
    return contents


def call_gemini(
    prompt: str,
    system_instruction: str = "",
    temperature: float = 0.4,
    max_output_tokens: int = 512,
    response_mime_type: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any] | None:
    """
    Gọi Google Gemini REST API với xoay vòng key tự động & fallback model an toàn.
    Trả về {"text", "model", "input_tokens", "output_tokens"} hoặc None khi không khả dụng.
    """
    keys = _next_available_keys(max_attempts=4)
    if not keys:
        return None

    models = _ordered_models()
    contents = _build_gemini_contents(prompt, history)
    sys_inst = system_instruction.strip()

    for model_name in models:
        is_lite = "lite" in model_name.lower()
        gen_config: dict[str, Any] = {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens if is_lite else max(max_output_tokens, 1536),
        }
        if not is_lite:
            gen_config["thinkingConfig"] = {"thinkingBudget": 256}
        if response_mime_type:
            gen_config["responseMimeType"] = response_mime_type

        body: dict[str, Any] = {
            "contents": contents,
            "generationConfig": gen_config,
        }
        if sys_inst:
            body["systemInstruction"] = {"parts": [{"text": sys_inst}]}

        payload_bytes = json.dumps(body, ensure_ascii=False).encode("utf-8")

        for api_key in keys:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            req = urllib.request.Request(
                url,
                data=payload_bytes,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=GEMINI_TIMEOUT_SEC) as resp:
                    raw = resp.read().decode("utf-8")
                    data = json.loads(raw)
                candidates = data.get("candidates") or []
                if not candidates:
                    continue
                parts = (candidates[0].get("content") or {}).get("parts") or []
                text = "".join(
                    str(p.get("text") or "") for p in parts if not p.get("thought")
                ).strip()
                if not text:
                    continue
                usage = data.get("usageMetadata") or {}
                in_tok = int(usage.get("promptTokenCount") or 0)
                out_tok = int(usage.get("candidatesTokenCount") or 0)
                return {
                    "text": text,
                    "model": model_name,
                    "input_tokens": in_tok,
                    "output_tokens": out_tok,
                }
            except urllib.error.HTTPError as exc:
                if exc.code in (401, 403, 429):
                    _mark_key_cooldown(api_key, _COOLDOWN_SECONDS)
                    continue
                if exc.code == 404:
                    _mark_model_cooldown(model_name, 300.0)
                    break
                if exc.code == 503:
                    _mark_model_cooldown(model_name, _MODEL_COOLDOWN_SECONDS)
                    break
                continue
            except Exception as exc:
                if isinstance(exc, TimeoutError) or "timed out" in str(exc).lower():
                    _mark_model_cooldown(model_name, _MODEL_COOLDOWN_SECONDS)
                    break
                continue

    return None


def generate_text(
    prompt: str,
    system_instruction: str = "",
    temperature: float = 0.4,
    max_output_tokens: int = 512,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any] | None:
    return call_gemini(
        prompt=prompt,
        system_instruction=system_instruction,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        history=history,
    )


def generate_json(
    prompt: str,
    system_instruction: str = "",
    temperature: float = 0.25,
    max_output_tokens: int = 768,
) -> tuple[dict[str, Any] | list[Any], dict[str, Any]] | None:
    res = call_gemini(
        prompt=prompt,
        system_instruction=system_instruction,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        response_mime_type="application/json",
    )
    if not res:
        return None
    cleaned = _FENCE_RE.sub("", res["text"]).strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, (dict, list)):
            return parsed, res
    except Exception:
        m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
        if m:
            try:
                parsed = json.loads(m.group(1))
                if isinstance(parsed, (dict, list)):
                    return parsed, res
            except Exception:
                return None
    return None


def record_ai_usage(
    conn: Any,
    service_id: str,
    input_tokens: int,
    output_tokens: int,
) -> None:
    """Ghi nhận lượt gọi & token thực tế từ Gemini vào bảng ai_service_units trong MySQL."""
    in_t = max(0, int(input_tokens or 0))
    out_t = max(0, int(output_tokens or 0))
    added_cost = round(in_t * 0.0000001 + out_t * 0.0000004, 5)
    try:
        conn.execute(
            """UPDATE ai_service_units
               SET requests = requests + 1,
                   input_tokens = input_tokens + ?,
                   output_tokens = output_tokens + ?,
                   estimated_cost = ROUND(estimated_cost + ?, 4)
               WHERE id = ?""",
            (in_t, out_t, added_cost, service_id),
        )
    except Exception:
        pass
