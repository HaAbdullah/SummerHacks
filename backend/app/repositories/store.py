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
import os
import threading
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DATA_DIR / "db.json"

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


def _load() -> dict[str, dict[str, Any]]:
    global _db
    if _db is not None:
        return _db

    if DB_PATH.exists():
        raw = json.loads(DB_PATH.read_text(encoding="utf-8"))
        _db = {key: raw.get(key, {}) for key in EMPTY}
    else:
        _db = {key: {} for key in EMPTY}
    return _db


def _flush() -> None:
    """Atomic write: never leave a half-written db.json behind."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = DB_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(_load(), indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, DB_PATH)


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
