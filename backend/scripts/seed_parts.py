"""Load data/parts.json into the parts and part_prices tables.

    python scripts/seed_parts.py

Writes through whichever store is configured, so this seeds Supabase when
SUPABASE_URL is set and the local JSON database otherwise. Re-running replaces the
catalogue for the cars in the file and leaves other cars alone — parts are reference
data, so a reseed should not wipe a car someone else curated.

Each part gets one `part_prices` row, stamped with the date the file says the prices were
captured. The `price` column on the part is kept in step for exact-match comparison;
`part_prices` preserves the dated value for future historical price selection.

data/parts.json is the editable source; the tables are what the API reads.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.repositories import store  # noqa: E402

SOURCE = Path(__file__).resolve().parent.parent / "data" / "parts.json"
DEFAULT_CAPTURED_AT = "2026-08-08T00:00:00Z"


def part_id(car_id: str, slot: str, name: str) -> str:
    """Deterministic id, so reseeding updates a part rather than duplicating it."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:60]
    return f"{car_id}-{slot}-{slug}"


def price_id(part: str) -> str:
    """One row per (part, capture run). Deterministic for the same reason."""
    return f"pp-{part}"


def main() -> None:
    raw = json.loads(SOURCE.read_text(encoding="utf-8"))
    captured_at = raw.get("_capturedAt") or DEFAULT_CAPTURED_AT
    catalogue = {car: slots for car, slots in raw.items() if not car.startswith("_")}

    written = priced = 0
    for car_id, slots in catalogue.items():
        # Clear this car's rows first, so a part removed from the file actually
        # disappears rather than lingering from a previous run. Prices go with them.
        for existing in store.find("parts", carId=car_id):
            for price in store.find("part_prices", partId=existing["id"]):
                store.delete("part_prices", price["id"])
            store.delete("parts", existing["id"])

        for slot, items in slots.items():
            for item in items:
                pid = part_id(car_id, slot, item["name"])
                store.put(
                    "parts",
                    pid,
                    {
                        "id": pid,
                        "carId": car_id,
                        "slot": slot,
                        "name": item["name"],
                        "brand": item.get("brand") or "",
                        "sku": item.get("sku"),
                        "category": item.get("category"),
                        "subcategory": item.get("subcategory") or item.get("category") or "",
                        "partType": item.get("partType", "primary"),
                        "price": item.get("price"),
                        "currency": item.get("currency", "USD"),
                        "sourceUrl": item.get("sourceUrl"),
                        "metadata": item.get("metadata") or {},
                    },
                )
                written += 1

                if item.get("price") is None:
                    continue
                store.put(
                    "part_prices",
                    price_id(pid),
                    {
                        "id": price_id(pid),
                        "partId": pid,
                        "amount": item["price"],
                        "currency": item.get("currency", "USD"),
                        "source": item.get("sourceUrl") or "data/parts.json",
                        "capturedAt": captured_at,
                    },
                )
                priced += 1

        by_slot = {slot: len(items) for slot, items in slots.items()}
        total = sum(by_slot.values())
        prices = [i["price"] for items in slots.values() for i in items if i.get("price")]
        print(f"{car_id}: {total} parts {by_slot}")
        if prices:
            print(f"   ${min(prices):.2f} – ${max(prices):.2f}")

    print(
        f"\nWrote {written} parts and {priced} prices (captured {captured_at}) "
        f"via the {'supabase' if _is_supabase() else 'json'} store."
    )


def _is_supabase() -> bool:
    from app.core.config import settings

    return settings.use_supabase


if __name__ == "__main__":
    main()
