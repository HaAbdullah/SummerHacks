"""File uploads for community contributions.

This is the path the hackathon's core requirement runs through: a photo of an engine bay,
a sketch, a voice clip — one moment of physical human input becoming part of the shared
artifact. Everything else in the app is scaffolding underneath it.

Files go to Supabase Storage and only the URL is stored on the post. With no Supabase
configured, uploads are written under `data/uploads/` and served by the API, so the whole
flow can be built and demoed before credentials exist.
"""

from __future__ import annotations

import logging
import re
import uuid
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"

# A voice note or a phone photo is comfortably under this; a long video is not. The cap
# exists so one upload cannot exhaust the dyno's memory.
MAX_BYTES = 25 * 1024 * 1024

CONTENT_TYPES = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav",
    ".webm": "audio/webm", ".ogg": "audio/ogg",
    ".mp4": "video/mp4", ".mov": "video/quicktime",
    ".pdf": "application/pdf",
}

ALLOWED = set(CONTENT_TYPES)


class UploadError(Exception):
    """Raised for a file we will not accept. The message is shown to the user."""


def _safe_name(filename: str) -> tuple[str, str]:
    """Return (stem, suffix), stripped of anything that could escape the bucket."""
    name = Path(filename or "upload").name
    suffix = Path(name).suffix.lower()
    stem = re.sub(r"[^a-z0-9._-]+", "-", Path(name).stem.lower()).strip("-") or "upload"
    return stem[:40], suffix


def validate(filename: str, size: int) -> str:
    """Check a file before reading it. Returns the extension."""
    _, suffix = _safe_name(filename)

    if suffix not in ALLOWED:
        raise UploadError(
            f"'{suffix or 'no extension'}' is not a supported file type. "
            f"Accepted: {', '.join(sorted(ALLOWED))}"
        )
    if size > MAX_BYTES:
        raise UploadError(
            f"File is {size // 1024 // 1024}MB. The limit is {MAX_BYTES // 1024 // 1024}MB."
        )
    return suffix


def store(node_id: str, filename: str, data: bytes) -> dict:
    """Save a file and return {url, storagePath, contentType}."""
    stem, suffix = _safe_name(filename)
    path = f"{node_id}/{uuid.uuid4().hex[:12]}-{stem}{suffix}"
    content_type = CONTENT_TYPES.get(suffix, "application/octet-stream")

    if settings.use_supabase:
        url = _to_supabase(path, data, content_type)
    else:
        url = _to_disk(path, data)

    return {"url": url, "storagePath": path, "contentType": content_type}


def signed_upload(node_id: str, filename: str) -> dict:
    """Issue a one-off URL the browser uploads to directly.

    Needed on serverless hosts, where the request body is capped around 4.5MB — a voice
    clip or a phone video would be rejected before reaching us. Sending the file straight
    to Supabase also means it never occupies API memory, which is better everywhere, not
    just on Vercel.

    Flow: call this → PUT the file to `uploadUrl` → POST the post with `mediaUrl`.
    """
    if not settings.use_supabase:
        raise UploadError(
            "Direct upload needs Supabase Storage. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_KEY, or POST the file to /posts/upload instead."
        )

    stem, suffix = _safe_name(filename)
    if suffix not in ALLOWED:
        raise UploadError(
            f"'{suffix or 'no extension'}' is not a supported file type. "
            f"Accepted: {', '.join(sorted(ALLOWED))}"
        )

    from supabase import create_client

    path = f"{node_id}/{uuid.uuid4().hex[:12]}-{stem}{suffix}"
    client = create_client(settings.supabase_url, settings.supabase_service_key)
    bucket = client.storage.from_(settings.supabase_bucket)
    signed = bucket.create_signed_upload_url(path)

    return {
        "uploadUrl": signed["signed_url"],
        "token": signed.get("token"),
        "storagePath": path,
        # Where the file will live once the PUT succeeds — send this back as mediaUrl.
        "mediaUrl": bucket.get_public_url(path),
        "contentType": CONTENT_TYPES.get(suffix, "application/octet-stream"),
        "maxBytes": MAX_BYTES,
    }


def _to_supabase(path: str, data: bytes, content_type: str) -> str:
    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    bucket = client.storage.from_(settings.supabase_bucket)
    bucket.upload(path, data, {"content-type": content_type, "upsert": "true"})
    return bucket.get_public_url(path)


def _to_disk(path: str, data: bytes) -> str:
    """Local fallback so uploads work before Supabase exists.

    Files land under data/uploads/ and are served by the API's /media mount. They do not
    survive a redeploy on an ephemeral host — which is exactly why Supabase Storage is
    the real answer.

    Returns an absolute URL so the Next.js frontend (different origin) can load the
    image without rewriting. Relative `/media/...` would resolve against localhost:3000.
    """
    target = UPLOAD_DIR / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    # Absolute API origin — relative `/media/...` would resolve against Next.js (:3000).
    return f"http://localhost:{settings.port}/media/{path}"
