"""Storage layer. Services import `store` from here and never care which backend runs.

Two implementations behind one interface:

  store.py           JSON file at data/db.json — no setup, works offline
  supabase_store.py  Supabase Postgres — survives restarts and deploys

Supabase is used when SUPABASE_URL and SUPABASE_SERVICE_KEY are set, JSON otherwise. That
means the demo runs with no credentials, and switching is an env change rather than a code
change. `settings.storage_backend` reports which one is live — `/api/health` surfaces it,
so nobody has to guess where their data went.
"""

from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

if settings.use_supabase:
    from app.repositories import supabase_store as store  # noqa: F401

    logger.info("storage: Supabase Postgres (%s)", settings.supabase_url)
else:
    from app.repositories import store  # noqa: F401

    logger.info("storage: local JSON (data/db.json) — set SUPABASE_URL to switch")

__all__ = ["store"]
