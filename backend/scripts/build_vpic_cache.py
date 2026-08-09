"""Snapshot the vPIC catalogue into data/vpic_cache.json.

Run at build time, not at boot. Fetching 12,321 makes plus 24 model lists takes ~6.4s,
which is dead weight on every cold start — and on a serverless host there IS no warm
process, so it would happen on every request.

    python scripts/build_vpic_cache.py

Re-run occasionally to pick up new model years. The file is committed, so a deploy never
depends on vPIC being reachable.
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402

from app.services.vehicles import PREFETCH_MAKES, TIMEOUT, VPIC_BASE  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "data" / "vpic_cache.json"


async def fetch_makes(client: httpx.AsyncClient) -> list[str]:
    resp = await client.get(f"{VPIC_BASE}/getallmakes", params={"format": "json"})
    resp.raise_for_status()
    results = resp.json().get("Results", [])
    return sorted({r["Make_Name"].strip() for r in results if r.get("Make_Name")})


async def fetch_models(client: httpx.AsyncClient, make: str) -> tuple[str, list[str]]:
    try:
        resp = await client.get(
            f"{VPIC_BASE}/GetModelsForMake/{make}", params={"format": "json"}
        )
        resp.raise_for_status()
        results = resp.json().get("Results", [])
    except Exception as exc:  # noqa: BLE001
        print(f"  ! {make}: {exc}")
        return make, []
    return make, sorted({r["Model_Name"].strip() for r in results if r.get("Model_Name")})


async def main() -> None:
    started = time.time()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        makes = await fetch_makes(client)
        pairs = await asyncio.gather(
            *(fetch_models(client, make) for make in PREFETCH_MAKES)
        )

    payload = {
        "makes": makes,
        "models": {make: models for make, models in pairs},
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")

    size_kb = OUT.stat().st_size // 1024
    total_models = sum(len(m) for m in payload["models"].values())
    print(f"Wrote {OUT} ({size_kb}KB) in {time.time() - started:.1f}s")
    print(f"  {len(makes)} makes, {total_models} models across {len(payload['models'])} makes")


if __name__ == "__main__":
    asyncio.run(main())
