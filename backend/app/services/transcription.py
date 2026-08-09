"""Convert uploaded media to text.

Every community post ends up as text, whatever was uploaded — so search, stats and
Ahmed's AI only ever handle one type. An image caption, a voice transcript and a typed
note are all just `body` by the time they are stored.

Right now this is a stub: it returns a placeholder and marks the post `transcribed:
False`, so the frontend shows a processing state rather than pretending a real caption
exists. Wiring a vision/speech model in means replacing the two functions below and
nothing else — no route, schema or service changes.
"""

from __future__ import annotations

from app.models.schemas import PostKind

NEEDS_TRANSCRIPTION: tuple[PostKind, ...] = ("image", "sketch", "voice", "video", "blueprint")


def describe(kind: PostKind, title: str, media_url: str | None) -> tuple[str, bool]:
    """Return (body_text, transcribed).

    `transcribed=False` means the text is a placeholder and a real model has not run.
    Callers store it as-is; the frontend renders it as pending.
    """
    if kind == "text":
        return "", True

    if not media_url:
        return "", False

    label = title.strip() or kind
    if kind == "voice":
        return f"[Voice note pending transcription: {label}]", False
    if kind == "video":
        return f"[Video pending transcription: {label}]", False
    return f"[{kind.title()} pending description: {label}]", False


def resolve_body(
    kind: PostKind, title: str, body: str, media_url: str | None
) -> tuple[str, bool]:
    """Use the author's own words when given; otherwise transcribe the media."""
    if body.strip():
        return body.strip(), True
    return describe(kind, title, media_url)
