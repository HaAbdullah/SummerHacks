"""Community posts and replies.

A post is whatever someone contributed — a photo, a sketch, a voice note, or typed text.
Whatever the kind, it is stored with a text `body`, so search, stats and the AI only ever
handle text. See transcription.py.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.models.schemas import CommunityPost, CreatePostRequest, CreateReplyRequest, Reply
from app.repositories import store
from app.services import transcription

# Deterministic per-author colour so the same person looks the same everywhere.
_AVATAR_HUES = (24, 200, 140, 320, 40, 180)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _avatar_color(name: str) -> str:
    h = 0
    for char in name:
        h = (h * 31 + ord(char)) & 0xFFFFFFFF
    return f"hsl({_AVATAR_HUES[h % len(_AVATAR_HUES)]} 45% 42%)"


def _canvas_defaults(kind: str, seed: str) -> tuple[float, float, float, float]:
    """Freeform board position. Hashed from the id so a post does not move on reload."""
    h = 0
    for char in seed:
        h = (h * 33 + ord(char)) & 0xFFFFFFFF
    is_media = kind in ("image", "sketch", "video", "blueprint")
    return (
        80 + (h % 14) * 72,
        80 + ((h >> 4) % 10) * 64,
        280 if is_media else (240 if kind == "voice" else 220),
        180 if is_media else (96 if kind == "voice" else 120),
    )


# --- posts -------------------------------------------------------------------------

def _hydrate(raw: dict) -> CommunityPost:
    """Build a post from storage, with its reply count counted fresh.

    replyCount is derived, so a stale stored value is always overwritten rather than
    trusted.
    """
    return CommunityPost(**{**raw, "replyCount": _reply_count(raw["id"])})


def posts_for(node_id: str) -> list[CommunityPost]:
    raw = store.find("posts", nodeId=node_id)
    raw.sort(key=lambda p: p["createdAt"], reverse=True)
    return [_hydrate(p) for p in raw]


def get_post(post_id: str) -> CommunityPost | None:
    raw = store.get("posts", post_id)
    if raw is None:
        return None
    return _hydrate(raw)


def create_post(node_id: str, req: CreatePostRequest) -> CommunityPost | None:
    if store.get("nodes", node_id) is None:
        return None

    post_id = f"post-{node_id}-{int(datetime.now().timestamp() * 1000) % 1000000}"
    body, transcribed = transcription.resolve_body(
        req.kind, req.title, req.body, req.mediaUrl
    )
    x, y, w, h = _canvas_defaults(req.kind, post_id)

    post = CommunityPost(
        id=post_id,
        nodeId=node_id,
        author=req.author,
        avatarColor=_avatar_color(req.author),
        kind=req.kind,
        title=req.title.strip(),
        body=body,
        mediaUrl=req.mediaUrl,
        storagePath=req.storagePath,
        durationSec=req.durationSec,
        transcribed=transcribed,
        createdAt=_now(),
        canvasX=req.canvasX if req.canvasX is not None else x,
        canvasY=req.canvasY if req.canvasY is not None else y,
        canvasW=req.canvasW if req.canvasW is not None else w,
        canvasH=req.canvasH if req.canvasH is not None else h,
    )
    store.put("posts", post_id, post.model_dump())

    from app.services import graph_service

    graph_service.bump_note_count(node_id, 1)
    return post


def move_post(post_id: str, x: float, y: float, w: float | None, h: float | None):
    raw = store.get("posts", post_id)
    if raw is None:
        return None
    raw["canvasX"], raw["canvasY"] = x, y
    if w is not None:
        raw["canvasW"] = w
    if h is not None:
        raw["canvasH"] = h
    store.put("posts", post_id, raw)
    return _hydrate(raw)


# --- replies -----------------------------------------------------------------------

def _reply_count(post_id: str) -> int:
    return len(store.find("replies", postId=post_id))


def replies_for(post_id: str) -> list[Reply]:
    raw = store.find("replies", postId=post_id)
    raw.sort(key=lambda r: r["createdAt"])
    return [Reply(**r) for r in raw]


def create_reply(post_id: str, req: CreateReplyRequest) -> Reply | None:
    if store.get("posts", post_id) is None:
        return None

    reply_id = f"reply-{post_id}-{int(datetime.now().timestamp() * 1000) % 1000000}"
    # Same rule as posts: the author's own words if given, otherwise a transcription
    # placeholder — a media reply is never stored as a bare, unsearchable blob.
    body, _ = transcription.resolve_body(req.kind, "", req.body, req.mediaUrl)
    reply = Reply(
        id=reply_id,
        postId=post_id,
        author=req.author,
        avatarColor=_avatar_color(req.author),
        kind=req.kind,
        body=body,
        mediaUrl=req.mediaUrl,
        storagePath=req.storagePath,
        durationSec=req.durationSec,
        createdAt=_now(),
    )
    store.put("replies", reply_id, reply.model_dump())
    return reply
