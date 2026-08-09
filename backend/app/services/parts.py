"""Real parts with real prices, stored in the database.

Ahmed's build guides need a shopping list, not invented part numbers. A node's four mod
slots map onto rows here, so a guide can say "Brembo NAO ceramic pads, $71.35" instead of
hallucinating a catalogue.

Parts live in the same store as everything else, so they query through Supabase when it
is configured and the JSON file otherwise. They are keyed by generation slug because
fitment is generation-specific — the whole reason the graph is keyed that way.

Seeded from `data/parts.json` by `scripts/seed_parts.py`. That file is the editable
source; the table is what gets read.
"""

from __future__ import annotations

from app.models.schemas import MOD_SLOTS
from app.repositories import store


def for_car(car_id: str) -> dict[str, list[dict]]:
    """Every part for a generation, grouped by slot. Empty dict if uncurated."""
    rows = store.find("parts", carId=car_id)
    if not rows:
        return {}

    grouped: dict[str, list[dict]] = {}
    for row in rows:
        grouped.setdefault(row["slot"], []).append(row)

    for slot in grouped:
        grouped[slot].sort(key=lambda p: (p.get("category") or "", p["name"]))
    return grouped


def for_slot(car_id: str, slot: str) -> list[dict]:
    rows = store.find("parts", carId=car_id, slot=slot)
    return sorted(rows, key=lambda p: (p.get("category") or "", p["name"]))


def by_category(car_id: str, slot: str) -> dict[str, list[dict]]:
    """Parts grouped by sub-category — timing, crankshaft, oil, pads, muffler.

    Ahmed's guides read better ordered by subsystem than as one flat list.
    """
    grouped: dict[str, list[dict]] = {}
    for part in for_slot(car_id, slot):
        grouped.setdefault(part.get("category") or "other", []).append(part)
    return grouped


def estimate(car_id: str, mods: dict[str, str]) -> dict:
    """Candidate parts and a price range for a build's filled slots.

    A range, not a total: we cannot know which specific part someone buys, so quoting one
    number would be a guess dressed as a fact. `low` sums the cheapest option per filled
    slot, `high` the dearest.
    """
    catalogue = for_car(car_id)
    if not catalogue:
        return {"carId": car_id, "curated": False, "slots": {}, "low": 0.0, "high": 0.0}

    slots: dict[str, list[dict]] = {}
    low = high = 0.0

    for slot in MOD_SLOTS:
        if not str(mods.get(slot, "")).strip():
            continue
        candidates = catalogue.get(slot, [])
        if not candidates:
            continue
        slots[slot] = candidates
        prices = [p["price"] for p in candidates if p.get("price") is not None]
        if prices:
            low += min(prices)
            high += max(prices)

    return {
        "carId": car_id,
        "curated": True,
        "slots": slots,
        "low": round(low, 2),
        "high": round(high, 2),
        "currency": "USD",
    }
