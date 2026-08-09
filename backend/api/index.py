"""Vercel serverless entrypoint.

Vercel runs Python as functions, not a long-lived server, so there is no startup hook —
`load_snapshot()` runs at import instead. That is only cheap because the vPIC catalogue
is a committed 261KB file rather than a 6.4s network fetch; see
`scripts/build_vpic_cache.py`.

Local development still uses `uvicorn app.main:app`, which goes through the normal
lifespan path. Both end up with the same warmed catalogue.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402
from app.services import vehicles  # noqa: E402

vehicles.load_snapshot()

# Vercel's Python runtime looks for `app`.
__all__ = ["app"]
