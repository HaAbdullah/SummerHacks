"""Refresh the committed read-only fallback.

    python scripts/snapshot.py

data/db.json is gitignored because it is live data. data/seed_snapshot.json is committed,
and the JSON store falls back to it when db.json is absent — a fresh checkout, or a
serverless deploy where nothing was ever written.

That fallback is what lets the site deploy and be browsable before Supabase exists.
Writes still fail with a 503 pointing at DEPLOY.md, because a read-only filesystem cannot
persist them.

Run this after reseeding, so the committed fallback matches the seed.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
LIVE, SNAPSHOT = DATA / "db.json", DATA / "seed_snapshot.json"

if not LIVE.exists():
    sys.exit("No data/db.json — run scripts/seed.py and scripts/seed_parts.py first.")

shutil.copyfile(LIVE, SNAPSHOT)
counts = {k: len(v) for k, v in json.loads(SNAPSHOT.read_text(encoding="utf-8")).items()}
print(f"Wrote {SNAPSHOT.name} ({SNAPSHOT.stat().st_size // 1024}KB)")
print(f"  {counts}")
