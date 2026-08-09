"""Real parts with real prices, per generation and mod slot.

Ahmed's build guides need a shopping list, not invented part numbers. This turns a node's
four mod slots into candidate parts with prices, so a guide can say "Brembo NAO ceramic
pads, $71.35" instead of hallucinating a catalogue.

Parts are curated per generation because fitment is generation-specific — the whole
reason the graph is keyed that way.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.models.schemas import MOD_SLOTS

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "parts.json"


@lru_cache(maxsize=1)
def _table() -> dict[str, dict[str, list[dict]]]:
    raw = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return {car: slots for car, slots in raw.items() if not car.startswith("_")}


def for_car(car_id: str) -> dict[str, list[dict]]:
    """Every part we know for a generation, grouped by slot. Empty if uncurated."""
    return _table().get(car_id, {})


def for_slot(car_id: str, slot: str) -> list[dict]:
    return _table().get(car_id, {}).get(slot, [])


def estimate(car_id: str, mods: dict[str, str]) -> dict:
    """Candidate parts and a price range for a build's filled slots.

    The range is deliberately a range, not a total: we cannot know which specific part
    someone will buy, so quoting one number would be a guess dressed as a fact. `low` is
    the cheapest part per filled slot, `high` the dearest.
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
        prices = [p["price"] for p in candidates]
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
