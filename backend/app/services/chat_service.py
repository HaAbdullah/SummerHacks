"""Node AI chatbox — the one place an actual model gets called for a live answer.

Context comes straight from `ai_service.build_payload`: the node's mod info (all four
slots) plus every transcribed community note on it, already assembled for Ahmed's build
guide. Reusing it here means the chatbox and the build guide never disagree about what
"this node" contains.

No server-side session — the frontend's own thread is the history, sent back on each
call and trimmed to the last few turns. If the model call fails (no key, network, rate
limit), every function here still returns something useful instead of a 500, so the UI
never shows a dead chatbox.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from app.models.schemas import (
    AskAiRequest,
    BuildModPayload,
    ChatMessage,
    PromptSuggestion,
    PromptSuggestionsResponse,
)
from app.services import ai_service, llm

logger = logging.getLogger(__name__)

_AI_AVATAR = "#0071e3"
_USER_AVATAR = "#1d1d1f"
_MAX_HISTORY_TURNS = 8
_MAX_NOTES_IN_PROMPT = 25

_SYSTEM_PROMPT = """You are the BuildaMod AI, a sharp and practical car-modding assistant \
embedded in a community build tree for the {make} {model} ({generation}, {year_range}).

You're answering questions about ONE specific build node in that tree:

Title: {title}
Summary: {summary}
Mods on this build:
{mods_block}{parts_block}

Community notes on this exact build (real posts from people who actually built it):
{notes_block}

Answer like an experienced, technically fluent car modder: concrete part types, install \
gotchas, fitment/clearance issues, tuning tradeoffs, realistic cost and difficulty. Ground \
your answer in the community notes above when they're relevant — say so explicitly (e.g. \
"one builder noted…"). If the notes don't cover something, say that plainly rather than \
inventing a note that doesn't exist. Keep answers tight: 2-5 sentences unless a list is \
clearly the right shape. If a question is unsafe or illegal (defeating emissions/safety \
systems, road-illegal exhaust bypass), explain why rather than just refusing outright."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _stamp() -> int:
    return int(datetime.now().timestamp() * 1000) % 1_000_000


def _mods_block(payload: BuildModPayload) -> str:
    filled = payload.mods.filled()
    if not filled:
        return "- (stock — no mods recorded on this build)"
    return "\n".join(f"- {slot}: {value}" for slot, value in filled.items())


def _parts_block(payload: BuildModPayload) -> str:
    parts = payload.parts or {}
    if not parts.get("curated"):
        return ""
    low, high = parts.get("low", 0), parts.get("high", 0)
    return f"\nReal parts pricing on file for this build's slots: ${low:.0f}-${high:.0f} USD."


def _notes_block(payload: BuildModPayload) -> str:
    notes = payload.communityText[:_MAX_NOTES_IN_PROMPT]
    if not notes:
        return "(no community notes on this build yet)"
    return "\n".join(f"- {n}" for n in notes)


def _system_prompt(payload: BuildModPayload) -> str:
    car = payload.car
    return _SYSTEM_PROMPT.format(
        make=car.make,
        model=car.model,
        generation=car.generation,
        year_range=car.yearRange,
        title=payload.title,
        summary=payload.summary or "—",
        mods_block=_mods_block(payload),
        parts_block=_parts_block(payload),
        notes_block=_notes_block(payload),
    )


def _fallback_answer(payload: BuildModPayload) -> str:
    """Used when the model call fails outright — still grounded, just not generated."""
    filled = payload.mods.filled()
    bits = []
    if filled:
        highlight = ", ".join(f"{slot}: {value}" for slot, value in list(filled.items())[:2])
        bits.append(f"On record for **{payload.title}** — {highlight}.")
    if payload.communityText:
        bits.append(f"One community note: \"{payload.communityText[0][:160]}\"")
    bits.append("(AI model unreachable right now — try again in a moment for a full answer.)")
    return " ".join(bits)


# --- chat --------------------------------------------------------------------------

def ask(node_id: str, req: AskAiRequest) -> list[ChatMessage] | None:
    """Answer one question about a node, grounded in its mods and community notes."""
    payload = ai_service.build_payload(node_id)
    if payload is None:
        return None

    question = req.question.strip()
    messages = [{"role": "system", "content": _system_prompt(payload)}]
    for turn in req.history[-_MAX_HISTORY_TURNS:]:
        messages.append({"role": "user" if turn.role == "user" else "assistant", "content": turn.body})
    messages.append({"role": "user", "content": question})

    try:
        answer = llm.chat(messages, max_tokens=500)
    except llm.LLMError as exc:
        logger.warning("chat completion failed for node %s: %s", node_id, exc)
        answer = _fallback_answer(payload)

    now = _now()
    user_msg = ChatMessage(
        id=f"chat-u-{node_id}-{_stamp()}",
        nodeId=node_id,
        role="user",
        author=req.author,
        avatarColor=_USER_AVATAR,
        body=question,
        createdAt=now,
    )
    ai_msg = ChatMessage(
        id=f"chat-a-{node_id}-{_stamp()}",
        nodeId=node_id,
        role="ai",
        author="BuildaMod AI",
        avatarColor=_AI_AVATAR,
        body=answer,
        createdAt=_now(),
    )
    return [user_msg, ai_msg]


# --- suggested prompts ---------------------------------------------------------------

def _heuristic_suggestions(payload: BuildModPayload) -> list[str]:
    """No-model fallback: still references real note content and real mod slots."""
    qs: list[str] = []
    for note in payload.communityText[:2]:
        snippet = note.strip().split(".")[0][:70].strip()
        if snippet:
            qs.append(f'Can you say more about "{snippet}"?')

    filled = payload.mods.filled()
    if filled:
        slot, value = next(iter(filled.items()))
        qs.append(f"What should I watch out for on the {slot} ({value[:40]})?")
    else:
        qs.append(f"What's a good first mod for {payload.title}?")

    qs.append(f"What's a realistic budget and timeline for {payload.title}?")
    return qs[:4]


def _generate_suggestions(payload: BuildModPayload) -> list[str] | None:
    """Ask the model for questions grounded in this node's actual community notes."""
    notes = payload.communityText[:_MAX_NOTES_IN_PROMPT]
    prompt = (
        f"Build: {payload.title}. Filled mod slots: {json.dumps(payload.mods.filled())}.\n\n"
        "Community notes on this exact build:\n"
        + ("\n".join(f"- {n}" for n in notes) if notes else "(none yet)")
        + "\n\nWrite exactly 4 short questions (max 12 words each) a builder could ask an AI "
        "chatbox about this build. Ground at least 2 of them in a specific detail from the "
        "community notes above — quote or paraphrase the detail, don't just say 'the notes'. "
        "If there are no notes, write general questions about the mods and build instead. "
        'Respond as JSON only: {"questions": ["...", "...", "...", "..."]}'
    )
    try:
        raw = llm.chat(
            [
                {
                    "role": "system",
                    "content": "You write short, concrete suggested questions for a car-modding chatbox.",
                },
                {"role": "user", "content": prompt},
            ],
            json_mode=True,
            max_tokens=220,
            temperature=0.6,
        )
        questions = json.loads(raw).get("questions", [])
        return [q.strip() for q in questions if isinstance(q, str) and q.strip()][:4] or None
    except (llm.LLMError, json.JSONDecodeError, AttributeError) as exc:
        logger.warning("suggestion generation failed for node %s: %s", payload.nodeId, exc)
        return None


def suggestions(node_id: str) -> PromptSuggestionsResponse | None:
    """getPromptSuggestions. Auto-generated, grounded in this node's community notes."""
    payload = ai_service.build_payload(node_id)
    if payload is None:
        return None

    questions = _generate_suggestions(payload) or _heuristic_suggestions(payload)
    return PromptSuggestionsResponse(
        nodeId=node_id,
        suggestions=[
            PromptSuggestion(id=f"sugg-{node_id}-{i}", prompt=q) for i, q in enumerate(questions)
        ],
    )
