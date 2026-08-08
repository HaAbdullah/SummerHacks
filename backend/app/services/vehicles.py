"""Vehicle lookup backed by NHTSA vPIC.

vPIC is free, needs no key, and covers every vehicle sold in the US since 1981. Two of
its traits drive this design:

1. `getallmakes` returns ~12,300 makes (610KB), most of them trailer and RV
   manufacturers. It is useless as a raw list, so it is fetched once at startup and
   filtered in memory with real consumer brands ranked above the noise.
2. Latency is inconsistent - multi-second responses are common. Nothing here may sit on
   a per-keystroke path uncached.

Every network call degrades instead of raising. If vPIC is unreachable the search box
still returns something, because a third-party outage must not take the site down.
"""

from __future__ import annotations

import asyncio
import logging
import re

import httpx

logger = logging.getLogger(__name__)

VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles"
TIMEOUT = httpx.Timeout(8.0, connect=4.0)

# vPIC covers 1981 onward.
YEAR_RE = re.compile(r"\b(19[8-9]\d|20[0-2]\d)\b")

# Ranked above vPIC's long tail of trailer and RV manufacturers.
CONSUMER_BRANDS = (
    "acura", "alfa romeo", "aston martin", "audi", "bentley", "bmw", "buick",
    "cadillac", "chevrolet", "chrysler", "dodge", "ferrari", "fiat", "ford",
    "genesis", "gmc", "honda", "hyundai", "infiniti", "jaguar", "jeep", "kia",
    "lamborghini", "land rover", "lexus", "lincoln", "lotus", "maserati", "mazda",
    "mclaren", "mercedes-benz", "mini", "mitsubishi", "nissan", "polestar",
    "pontiac", "porsche", "ram", "rivian", "rolls-royce", "saab", "saturn",
    "scion", "subaru", "suzuki", "tesla", "toyota", "volkswagen", "volvo",
)

# Makes whose name is two words. Checked before single tokens so "land rover" is not
# matched as "land", leaving "rover" to look like a model.
MULTIWORD_BRANDS = tuple(b for b in CONSUMER_BRANDS if " " in b or "-" in b)

# Models for these are prefetched at startup so a bare "corolla" - no make typed - can
# still be resolved. Searching all 12,300 makes per keystroke is not an option.
PREFETCH_MAKES = (
    "toyota", "honda", "ford", "chevrolet", "nissan", "subaru",
    "mazda", "volkswagen", "bmw", "mercedes-benz", "hyundai", "kia",
)

# vPIC stores makes upper-case. Title-casing reads better, except for these.
ACRONYM_BRANDS = {"bmw", "gmc", "mini", "ram", "kia"}

_makes: list[str] = []
_models: dict[str, list[str]] = {}


def _pretty(make: str) -> str:
    lowered = make.lower()
    if lowered in ACRONYM_BRANDS:
        return make.upper()
    return make.title()


# --- startup ---------------------------------------------------------------------

async def warm_cache() -> None:
    """Load the make list and the popular makes' models. Never fatal."""
    global _makes
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(f"{VPIC_BASE}/getallmakes", params={"format": "json"})
            resp.raise_for_status()
            results = resp.json().get("Results", [])
        _makes = sorted({r["Make_Name"].strip() for r in results if r.get("Make_Name")})
        logger.info("vPIC makes cached: %d", len(_makes))
    except Exception as exc:  # noqa: BLE001 - degrading is the point
        logger.warning("vPIC unreachable at startup (%s); using consumer brand list", exc)
        _makes = sorted(b.title() for b in CONSUMER_BRANDS)

    await asyncio.gather(*(_load_models(make) for make in PREFETCH_MAKES))
    logger.info("model lists cached for %d makes", len(_models))


async def _load_models(make: str) -> list[str]:
    """Fetch and cache one make's models. Returns [] rather than raising."""
    key = make.strip().lower()
    if key in _models:
        return _models[key]

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(
                f"{VPIC_BASE}/GetModelsForMake/{key}", params={"format": "json"}
            )
            resp.raise_for_status()
            results = resp.json().get("Results", [])
    except Exception as exc:  # noqa: BLE001
        logger.warning("vPIC model lookup failed for %s: %s", make, exc)
        return []

    models = sorted({r["Model_Name"].strip() for r in results if r.get("Model_Name")})
    _models[key] = models
    return models


# --- query parsing ---------------------------------------------------------------

def _split_year(query: str) -> tuple[int | None, str]:
    """Pull the year out first - it is the one unambiguous token."""
    match = YEAR_RE.search(query)
    if not match:
        return None, query.strip()
    rest = (query[: match.start()] + " " + query[match.end() :]).strip()
    return int(match.group(1)), rest


def _split_make(text: str) -> tuple[str | None, str]:
    """Find a make anywhere in the text. Returns (make, leftover)."""
    lowered = text.lower().strip()
    if not lowered:
        return None, ""

    for brand in MULTIWORD_BRANDS:
        if brand in lowered:
            return _pretty(brand), lowered.replace(brand, " ", 1).strip()

    known = {m.lower(): m for m in (_makes or [b.title() for b in CONSUMER_BRANDS])}
    tokens = [t for t in re.split(r"[\s,]+", lowered) if t]

    for i, token in enumerate(tokens):
        if len(token) < 2:
            continue
        # Exact make wins; otherwise the shortest make this token is a prefix of, so
        # "ford" matches FORD rather than FORD MOTOR COMPANY OF CANADA.
        if token in known:
            hit = known[token]
        else:
            candidates = [m for m in known.values() if m.lower().startswith(token)]
            consumer = [m for m in candidates if m.lower() in CONSUMER_BRANDS]
            pool = consumer or candidates
            hit = min(pool, key=len) if pool else None
        if hit:
            return _pretty(hit), " ".join(tokens[:i] + tokens[i + 1 :])

    return None, lowered


def _rank_models(models: list[str], needle: str) -> list[str]:
    # vPIC model lists are littered with commercial and fleet entries like "'34" and
    # "A8513". Anything not starting with a letter goes last, so a bare make query leads
    # with cars people recognise.
    def is_junk(model: str) -> int:
        # Fleet and commercial codes: "A8513", "'34", "1500 Foldaway". The 4-digit floor
        # keeps legitimately numeric names like BMW 335 and Mazda 626 out of it.
        if not model[:1].isalpha():
            return 1
        return 1 if re.fullmatch(r"[A-Za-z]{1,2}\d{3,}\w*", model) else 0

    # Browsing a whole make: alphabetical is what people expect.
    if not needle:
        return sorted(models, key=lambda m: (is_junk(m), m.lower()))

    # Narrowing: shortest match first, so "Corolla" beats "Corolla Cross".
    def best_first(model: str) -> tuple[int, int, str]:
        return (is_junk(model), len(model), model.lower())

    prefix = [m for m in models if m.lower().startswith(needle)]
    contains = [m for m in models if needle in m.lower() and m not in prefix]
    return sorted(prefix, key=best_first) + sorted(contains, key=best_first)


# --- public API ------------------------------------------------------------------

def _result(make: str, model: str, year: int | None) -> dict:
    return {
        # Stable, URL-safe key for React lists and for routing to the build later.
        "id": re.sub(r"[^a-z0-9]+", "-", f"{make} {model} {year or ''}".lower()).strip("-"),
        "label": f"{year} {make} {model}" if year else f"{make} {model}",
        "make": make,
        "model": model,
        "year": year,
    }


async def search(query: str, limit: int = 8) -> list[dict]:
    """Turn whatever the user typed into clickable vehicle results.

    Handles "2018 toyota corolla", "toyota corolla", "corolla", "toyota", and any order
    of those. `year` is null when the user has not typed one - the frontend should ask
    rather than guessing, since mods differ sharply between model years.
    """
    query = query.strip()
    if len(query) < 2:
        return []

    year, rest = _split_year(query)
    make, leftover = _split_make(rest)
    needle = leftover.lower().strip()

    # A make was typed: search within its models.
    if make:
        models = await _load_models(make)
        if not models:
            return [_result(make, "", year)] if not needle else []
        return [_result(make, m, year) for m in _rank_models(models, needle)[:limit]]

    # No make typed. Search the prefetched popular makes for a matching model, so a bare
    # "corolla" still resolves.
    if not needle:
        return []

    results: list[dict] = []
    for cached_make, models in _models.items():
        for model in _rank_models(models, needle):
            if model.lower().startswith(needle):
                results.append(_result(_pretty(cached_make), model, year))
        if len(results) >= limit:
            break

    return results[:limit]


def cache_status() -> dict:
    return {
        "makes_cached": len(_makes),
        "model_lists_cached": len(_models),
        "warmed": bool(_makes),
    }
