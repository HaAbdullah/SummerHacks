"""Supabase Postgres implementation of the repository interface.

Same six functions as the JSON store, so no service or route knows which one is running.
`repositories/__init__.py` picks between them on whether SUPABASE_URL is configured.

The only real work here is naming: the API speaks camelCase (`parentIds`, `createdAt`)
because the frontend does, and Postgres columns are snake_case. Translation happens at
this boundary and nowhere else — services never see a snake_case key.
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

TABLES = ("cars", "nodes", "posts", "replies")

# camelCase in the API  ->  snake_case in Postgres. Anything absent is identical in both.
FIELD_MAP: dict[str, dict[str, str]] = {
    "cars": {
        "yearStart": "year_start",
        "yearEnd": "year_end",
        "yearRange": "year_range",
        "heroImage": "hero_image",
        "rootNodeId": "root_node_id",
    },
    "nodes": {
        "carId": "car_id",
        "parentIds": "parent_ids",
        "heroImage": "hero_image",
        "createdBy": "created_by",
        "createdAt": "created_at",
        "isRoot": "is_root",
    },
    "posts": {
        "nodeId": "node_id",
        "avatarColor": "avatar_color",
        "mediaUrl": "media_url",
        "storagePath": "storage_path",
        "durationSec": "duration_sec",
        "createdAt": "created_at",
        "canvasX": "canvas_x",
        "canvasY": "canvas_y",
        "canvasW": "canvas_w",
        "canvasH": "canvas_h",
    },
    "replies": {
        "postId": "post_id",
        "avatarColor": "avatar_color",
        "createdAt": "created_at",
    },
}

# Columns the API does not carry: replyCount is derived per request, so persisting it
# would let a stale count outlive the replies it counted.
DROP_ON_WRITE = {"replyCount"}

_client = None


def _db():
    global _client
    if _client is None:
        from supabase import create_client

        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client


def _to_db(collection: str, data: dict) -> dict:
    mapping = FIELD_MAP.get(collection, {})
    return {
        mapping.get(key, key): value
        for key, value in data.items()
        if key not in DROP_ON_WRITE
    }


def _from_db(collection: str, row: dict) -> dict:
    reverse = {v: k for k, v in FIELD_MAP.get(collection, {}).items()}
    return {reverse.get(key, key): value for key, value in row.items()}


# --- the repository interface -----------------------------------------------------

def all_of(collection: str) -> list[dict]:
    rows = _db().table(collection).select("*").execute().data or []
    return [_from_db(collection, row) for row in rows]


def get(collection: str, item_id: str) -> dict | None:
    rows = (
        _db().table(collection).select("*").eq("id", item_id).limit(1).execute().data
    ) or []
    return _from_db(collection, rows[0]) if rows else None


def put(collection: str, item_id: str, value: dict) -> dict:
    payload = _to_db(collection, {**value, "id": item_id})
    _db().table(collection).upsert(payload).execute()
    return value


def find(collection: str, **match: Any) -> list[dict]:
    query = _db().table(collection).select("*")
    mapping = FIELD_MAP.get(collection, {})
    for key, expected in match.items():
        query = query.eq(mapping.get(key, key), expected)
    return [_from_db(collection, row) for row in query.execute().data or []]


def find_one(collection: str, **match: Any) -> dict | None:
    results = find(collection, **match)
    return results[0] if results else None


def reset(seed: dict[str, dict[str, Any]] | None = None) -> None:
    """Replace everything. Used by the seeder.

    Deleted child-first so foreign keys hold, then inserted parent-first for the same
    reason — a node cannot reference a car that has not been written yet.
    """
    client = _db()

    for table in reversed(TABLES):
        client.table(table).delete().neq("id", "").execute()

    if not seed:
        return

    for table in TABLES:
        rows = list((seed.get(table) or {}).values())
        if rows:
            client.table(table).insert([_to_db(table, row) for row in rows]).execute()
            logger.info("seeded %d rows into %s", len(rows), table)
