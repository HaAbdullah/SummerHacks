"""Thin client for the chat-completion call that powers the node AI chatbox.

Talks to OpenAI's REST API directly over httpx (already a dependency) instead of pulling
in the openai SDK for one call site. Model defaults to gpt-4o-mini — cheap per call, but
still a competent generalist that knows car modding well from training data; that's the
right trade for a chat sidebar, not a reasoning-heavy flagship model.
"""

from __future__ import annotations

import httpx

from app.core.config import settings

_ENDPOINT = "https://api.openai.com/v1/chat/completions"


class LLMError(RuntimeError):
    """Raised on any failure to get a usable completion. Callers decide the fallback."""


def chat(
    messages: list[dict[str, str]],
    *,
    json_mode: bool = False,
    max_tokens: int = 500,
    temperature: float = 0.4,
) -> str:
    """One-shot chat completion. Raises LLMError — never returns a half-formed answer."""
    if not settings.ai_api_key.strip():
        raise LLMError("AI_API_KEY is not configured")

    payload: dict[str, object] = {
        "model": settings.ai_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    try:
        resp = httpx.post(
            _ENDPOINT,
            headers={
                "Authorization": f"Bearer {settings.ai_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30.0,
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise LLMError(str(exc)) from exc

    data = resp.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMError(f"Unexpected response shape: {data}") from exc

    if not content or not content.strip():
        raise LLMError("Empty completion")
    return content.strip()
