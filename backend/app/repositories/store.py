"""JSON-file persistence — the only place that touches storage.

Services call this; nothing else reads or writes the file. Swapping this module for
Postgres later changes no service and no route.

Everything lives in one document under `data/db.json`, one id-keyed map per collection.
The collection names match the Postgres table names one for one — see COLLECTIONS below.

Writes are atomic (temp file + replace) so an interrupted save cannot leave a truncated
database behind — which on a demo day matters more than write speed.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from pathlib import Path
from typing import Any

import httpx

from app.core.config import settings

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DATA_DIR / "db.json"

# Committed fallback. db.json is gitignored (it is live data), so a fresh checkout — or a
# serverless deploy, where the filesystem is read-only and nothing was ever written —
# would otherwise start completely empty. Loading this means the site is at least
# browsable without Supabase; writes still fail, loudly.
SNAPSHOT_PATH = DATA_DIR / "seed_snapshot.json"

# Upstash Redis REST — see settings.use_remote_json. One key holds the whole document,
# same shape as db.json. This is a durability layer under the local file, not a second
# store: local disk stays the fast path, Upstash is what survives a restart.
UPSTASH_KEY = "modbranch:db.json"

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_db: dict[str, dict[str, Any]] | None = None

# Parent-first, so the same order can be reused by the Supabase store's insert sequence.
COLLECTIONS = (
    "cars",
    "nodes",
    "posts",
    "replies",
    # Build-comparison reference data and historical output.
    "parts",
    "part_prices",
    "modifications",
    "node_modifications",
    "modification_parts",
    "modification_dependencies",
    "service_tasks",
    "modification_tasks",
    "task_dependencies",
    "build_estimate_runs",
)

EMPTY: dict[str, dict[str, Any]] = {name: {} for name in COLLECTIONS}


def _remote_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {settings.upstash_redis_rest_token}"}


def _remote_pull() -> dict[str, dict[str, Any]] | None:
    """Fetch the last-written document from Upstash. None if unset, empty, or unreachable
    — callers fall back to the local file/snapshot rather than erroring, since a stale
    read is better than a crashed boot."""
    try:
        resp = httpx.get(
            f"{settings.upstash_redis_rest_url.rstrip('/')}/get/{UPSTASH_KEY}",
            headers=_remote_headers(),
            timeout=5,
        )
        resp.raise_for_status()
        result = resp.json().get("result")
    except Exception:
        logger.warning("could not reach Upstash for db.json — falling back", exc_info=True)
        return None
    if not result:
        return None
    raw = json.loads(result)
    return {key: raw.get(key, {}) for key in EMPTY}


def _remote_push(payload: str) -> None:
    resp = httpx.post(
        f"{settings.upstash_redis_rest_url.rstrip('/')}/set/{UPSTASH_KEY}",
        headers=_remote_headers(),
        content=payload,
        timeout=5,
    )
    resp.raise_for_status()


def _load() -> dict[str, dict[str, Any]]:
    global _db
    if _db is not None:
        return _db

    if settings.use_remote_json:
        remote = _remote_pull()
        if remote is not None:
            _db = remote
            logger.info("loaded db.json from Upstash")
            return _db

    source = DB_PATH if DB_PATH.exists() else SNAPSHOT_PATH
    if source.exists():
        raw = json.loads(source.read_text(encoding="utf-8"))
        _db = {key: raw.get(key, {}) for key in EMPTY}
        if source is SNAPSHOT_PATH:
            logger.info("loaded committed snapshot (%s) — no db.json present", source.name)
    else:
        _db = {key: {} for key in EMPTY}
    return _db


class ReadOnlyStorage(RuntimeError):
    """Raised when a write is attempted against storage that cannot actually persist it."""


def _flush() -> None:
    """Atomic local write, plus a push to Upstash when configured — that's the copy that
    survives a restart, since Render's free plan resets local disk on sleep/wake."""
    data = _load()
    payload = json.dumps(data, indent=2) + "\n"

    local_error: OSError | None = None
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        tmp = DB_PATH.with_suffix(".json.tmp")
        tmp.write_text(payload, encoding="utf-8")
        os.replace(tmp, DB_PATH)
    except OSError as exc:
        local_error = exc

    if settings.use_remote_json:
        try:
            _remote_push(payload)
        except Exception as exc:
            # Fail loud: silently accepting the local-only write here would recreate the
            # exact "looks saved, vanishes on restart" bug this layer exists to fix.
            raise ReadOnlyStorage(
                "Could not save to Upstash, so this change was not durably persisted. "
                "Check UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN — see "
                "backend/DEPLOY.md."
            ) from exc
    elif local_error is not None:
        # Serverless filesystems are read-only. Fail with something a human can act on
        # rather than a generic 500 twenty minutes into debugging.
        raise ReadOnlyStorage(
            "Storage is read-only, so this change was not saved. Configure Supabase "
            "(SUPABASE_URL and SUPABASE_SERVICE_KEY) or Upstash "
            "(UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) to enable writes — "
            "see backend/DEPLOY.md."
        ) from local_error


# --- generic collection access -----------------------------------------------------

def all_of(collection: str) -> list[dict]:
    return list(_load()[collection].values())


def get(collection: str, item_id: str) -> dict | None:
    return _load()[collection].get(item_id)


def put(collection: str, item_id: str, value: dict) -> dict:
    with _lock:
        _load()[collection][item_id] = value
        _flush()
    return value


def delete(collection: str, item_id: str) -> bool:
    """Remove one item. Returns False if it was not there."""
    with _lock:
        existed = _load()[collection].pop(item_id, None) is not None
        if existed:
            _flush()
    return existed


def find(collection: str, **match: Any) -> list[dict]:
    return [
        item
        for item in all_of(collection)
        if all(item.get(key) == value for key, value in match.items())
    ]


def find_one(collection: str, **match: Any) -> dict | None:
    results = find(collection, **match)
    return results[0] if results else None


def reset(seed: dict[str, dict[str, Any]] | None = None) -> None:
    """Replace the whole database. Used by the seeder and by tests."""
    global _db
    with _lock:
        _db = {key: dict((seed or {}).get(key, {})) for key in EMPTY}
        _flush()
