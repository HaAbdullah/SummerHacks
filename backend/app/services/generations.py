"""Car generations — the unit a build graph actually hangs off.

Mods are generation-specific: a 2015 Corolla and a 2022 Corolla take different parts, so
"Toyota Corolla" is too coarse to be a build root. "Toyota Corolla E210 (2020–2025)" is
the right unit.

No free API carries this. vPIC has no generation concept at all, API Ninjas paywalls it
at $99/month, and CarAPI's free tier is 2020 Ford and Toyota only. So `data/generations.
json` is hand-curated — around 40 rows, which took under an hour and has no rate limit,
no key, and no uptime risk.

Cars outside that file still work: they fall back to one open-ended "All years"
generation flagged `curated: false`, so the frontend can label it honestly rather than
implying generation data exists.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "generations.json"

FALLBACK_GENERATION = "All years"


@lru_cache(maxsize=1)
def _table() -> dict[str, dict[str, list[dict]]]:
    raw = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return {make: models for make, models in raw.items() if not make.startswith("_")}


def slug(make: str, model: str, generation: str) -> str:
    """Stable id for a generation — this is the carId a build graph is keyed by."""
    import re

    joined = f"{make} {model} {generation}"
    return re.sub(r"[^a-z0-9]+", "-", joined.lower()).strip("-")


def _fallback(make: str, model: str) -> dict:
    return {
        "generation": FALLBACK_GENERATION,
        "yearStart": 1981,
        "yearEnd": None,
        "heroImage": None,
        "curated": False,
    }


def _decorate(make: str, model: str, gen: dict, curated: bool) -> dict:
    year_end = gen.get("yearEnd")
    span = f"{gen['yearStart']}–{year_end}" if year_end else f"{gen['yearStart']}–present"
    return {
        "id": slug(make, model, gen["generation"]),
        "make": make,
        "model": model,
        "generation": gen["generation"],
        "yearStart": gen["yearStart"],
        "yearEnd": year_end,
        "years": span,
        "label": f"{make} {model} · {gen['generation']} ({span})",
        "heroImage": gen.get("heroImage"),
        "curated": curated,
    }


def for_model(make: str, model: str) -> list[dict]:
    """Every generation of a model, newest first. Never empty."""
    models = _table().get(make.strip().lower(), {})
    found = models.get(model.strip().lower())

    if not found:
        return [_decorate(make.title(), model.title(), _fallback(make, model), False)]

    pretty_make, pretty_model = _pretty(make, model)
    return [_decorate(pretty_make, pretty_model, gen, True) for gen in found]


def covering(make: str, model: str, year: int) -> dict | None:
    """The one generation that covers a year, or None if no generation does."""
    for gen in for_model(make, model):
        if year < gen["yearStart"]:
            continue
        if gen["yearEnd"] is None or year <= gen["yearEnd"]:
            return gen
    return None


def by_id(car_id: str) -> dict | None:
    """Reverse a generation id back to its record — used when opening a graph."""
    for make, models in _table().items():
        for model, gens in models.items():
            pretty_make, pretty_model = _pretty(make, model)
            for gen in gens:
                if slug(make, model, gen["generation"]) == car_id:
                    return _decorate(pretty_make, pretty_model, gen, True)
    return None


def has_model(make: str, model: str) -> bool:
    return model.strip().lower() in _table().get(make.strip().lower(), {})


def curated_models(make: str) -> list[str]:
    models = _table().get(make.strip().lower(), {})
    return [_pretty(make, m)[1] for m in models]


def curated_makes() -> list[str]:
    return sorted(_table())


# vPIC and the curated file disagree on casing and hyphens ("MX-5" vs "mx-5"), so model
# names are prettified from the key rather than stored twice.
_MODEL_CASING = {
    "mx-5": "MX-5",
    "rx-7": "RX-7",
    "gti": "GTI",
    "wrx": "WRX",
    "brz": "BRZ",
    "s2000": "S2000",
    "370z": "370Z",
    "m3": "M3",
    "3-series": "3 Series",
    "golf gti": "Golf GTI",
    "86": "86",
}

_MAKE_CASING = {"bmw": "BMW", "volkswagen": "Volkswagen"}


def _pretty(make: str, model: str) -> tuple[str, str]:
    m, mo = make.strip().lower(), model.strip().lower()
    return _MAKE_CASING.get(m, m.title()), _MODEL_CASING.get(mo, mo.title())
