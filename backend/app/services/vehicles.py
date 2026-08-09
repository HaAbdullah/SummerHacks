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
import json
import logging
import re
from pathlib import Path

import httpx

from app.services import generations

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

# Models for these are prefetched at startup so a bare "mustang" - no make typed - can
# still be resolved. Searching all 12,300 makes per keystroke is not an option.
PREFETCH_MAKES = (
    "toyota", "honda", "ford", "chevrolet", "nissan", "subaru",
    "mazda", "volkswagen", "bmw", "mercedes-benz", "hyundai", "kia",
    "porsche", "audi", "lexus", "jeep", "dodge", "tesla",
    "acura", "infiniti", "mitsubishi", "volvo", "cadillac", "gmc",
)

# What people type vs what vPIC calls it.
MAKE_ALIASES = {
    "chevy": "chevrolet",
    "vw": "volkswagen",
    "mercedes": "mercedes-benz",
    "benz": "mercedes-benz",
    "bimmer": "bmw",
    "beemer": "bmw",
}

# vPIC lists the MX-5 without ever using the name "Miata", so a search for it finds
# nothing at all unless we translate.
MODEL_ALIASES = {
    "miata": "mx-5",
    "vette": "corvette",
    "stang": "mustang",
}

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

SNAPSHOT = Path(__file__).resolve().parent.parent.parent / "data" / "vpic_cache.json"


def load_snapshot() -> bool:
    """Load the committed vPIC snapshot. Returns False if it is missing.

    Reading 261KB off disk takes milliseconds; fetching the same data from vPIC takes
    ~6.4s. That difference is dead weight on every cold start, and on a serverless host
    there is no warm process at all — it would be paid on every request.

    Rebuild with `python scripts/build_vpic_cache.py`.
    """
    global _makes, _models
    if not SNAPSHOT.exists():
        return False

    data = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    _makes = data.get("makes", [])
    _models = data.get("models", {})
    logger.info(
        "vPIC snapshot loaded: %d makes, %d model lists (fetched %s)",
        len(_makes), len(_models), data.get("fetchedAt", "unknown"),
    )
    return bool(_makes)


async def warm_cache() -> None:
    """Prepare the catalogue. Snapshot first, network only as a fallback."""
    global _makes

    if load_snapshot():
        return

    logger.warning("no vPIC snapshot at %s; falling back to a live fetch", SNAPSHOT)
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

    def without(i: int) -> str:
        return " ".join(tokens[:i] + tokens[i + 1 :])

    # Pass 1: consumer brands only. Without this, "mustang" matches the make "Mustang
    # Trailers" and the Ford Mustang is never found - same for "challenger" and "golf".
    for i, token in enumerate(tokens):
        if len(token) < 2:
            continue
        canonical = MAKE_ALIASES.get(token, token)
        if canonical in CONSUMER_BRANDS:
            return _pretty(known.get(canonical, canonical)), without(i)
        matches = [b for b in CONSUMER_BRANDS if b.startswith(canonical)]
        if matches:
            best = min(matches, key=len)
            return _pretty(known.get(best, best)), without(i)

    # Pass 2: any make in vPIC, but only on an exact match, so a partial token can never
    # be captured by an obscure trailer manufacturer.
    for i, token in enumerate(tokens):
        if len(token) >= 2 and token in known:
            return _pretty(known[token]), without(i)

    return None, lowered


def _rank_models(models: list[str], needle: str) -> list[str]:
    # vPIC model lists are littered with commercial and fleet entries like "'34" and
    # "A8513". Anything not starting with a letter goes last, so a bare make query leads
    # with cars people recognise.
    # Browsing a whole make: alphabetical is what people expect. Fleet and commercial
    # codes ("A8513", "'34") go last; the 4-digit floor keeps legitimately numeric names
    # like BMW 335 and Mazda 626 out of it.
    if not needle:
        def is_junk(model: str) -> int:
            if not model[:1].isalpha():
                return 1
            return 1 if re.fullmatch(r"[A-Za-z]{1,2}\d{3,}\w*", model) else 0

        return sorted(models, key=lambda m: (is_junk(m), m.lower()))

    return [m for _, m in sorted(_score(models, needle))]


def _score(models: list[str], needle: str) -> list[tuple[tuple, str]]:
    """(sort key, model) for every model matching `needle`. Sortable across makes."""
    def is_junk(model: str) -> int:
        if not model[:1].isalpha():
            return 1
        return 1 if re.fullmatch(r"[A-Za-z]{1,2}\d{3,}\w*", model) else 0

    needle = MODEL_ALIASES.get(needle, needle)
    parts = needle.split()

    def tier(model: str) -> int | None:
        m = model.lower()
        if m.startswith(needle):
            return 0
        if needle in m:
            return 1
        if len(parts) > 1 and all(p in m for p in parts):
            return 2
        return None

    out = []
    for model in models:
        t = tier(model)
        if t is not None:
            # Shortest match first within a tier, so "M3" beats "M30".
            out.append(((t, is_junk(model), len(model), model.lower()), model))
    return out


# --- public API ------------------------------------------------------------------

def _build_counts() -> dict[str, int]:
    """How many builds each generation has. Empty dict if storage is unavailable."""
    try:
        from app.repositories import store

        counts: dict[str, int] = {}
        for node in store.all_of("nodes"):
            counts[node["carId"]] = counts.get(node["carId"], 0) + 1
        return counts
    except Exception:  # noqa: BLE001 - search must not fail because storage hiccuped
        return {}


def _results_for(make: str, model: str, year: int | None) -> list[dict]:
    """One result per generation — the unit a build graph hangs off.

    A typed year narrows to the single generation covering it, so "2018 toyota corolla"
    resolves straight to E170 rather than making the user pick. With no year, every
    generation is offered, because a 2015 and a 2022 Corolla take different parts and
    guessing would send someone to the wrong build.

    Generations that already have builds rank first. Someone searching "civic" almost
    always wants the generation the community is actually working on, not simply the
    newest one — and it means a search result is never a dead end when a populated
    sibling exists.
    """
    gens = generations.for_model(make, model)

    if year is not None:
        match = generations.covering(make, model, year)
        # A year outside every known generation still deserves a result rather than
        # silence — fall back to the model's full list.
        gens = [match] if match else gens

    counts = _build_counts()
    results = [
        {**gen, "matchedYear": year, "buildCount": counts.get(gen["id"], 0)}
        for gen in gens
    ]

    # An explicit year is the user being specific — never reorder that.
    if year is None:
        results.sort(key=lambda r: -r["buildCount"])
    return results


async def search(query: str, limit: int = 8) -> list[dict]:
    """Turn whatever the user typed into clickable generation results.

    Handles "2018 toyota corolla", "toyota corolla", "corolla", "toyota", and any order
    of those. Each result is a generation with its own `id` — that id is the carId the
    graph endpoints take.
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
        # Curated models are merged in so a car we have generations for is always
        # findable, even if vPIC spells it differently or is unreachable.
        models = sorted({*models, *generations.curated_models(make)})
        ranked = _rank_models(models, needle) if models else []
        # An exact model name wins outright. Otherwise "2018 toyota corolla" pads its
        # results with Corolla Cross and Corolla iM, which are different cars.
        exact = [m for m in ranked if m.lower() == needle]
        if exact:
            ranked = exact

        if ranked:
            out: list[dict] = []
            for model in ranked:
                out.extend(_results_for(make, model, year))
                if len(out) >= limit:
                    break
            return out[:limit]
        if not needle:
            return []
        # The make matched but led nowhere. vPIC contains a make literally named "GTI",
        # so "golf gti" gets its model token eaten and returns nothing. Fall back to
        # treating the whole phrase as a model.
        needle = rest.lower().strip()

    # No usable make. Search the prefetched popular makes for a matching model, so a
    # bare "mustang" still resolves.
    if len(needle) < 2:
        return []

    # Scored across every cached make, then sorted globally - iterating the dict would
    # rank by whichever network call finished first, which is not deterministic.
    scored: list[tuple[tuple, str, str]] = []
    for cached_make in PREFETCH_MAKES:
        pool = sorted({*_models.get(cached_make, []), *generations.curated_models(cached_make)})
        for key, model in _score(pool, needle):
            scored.append((key, cached_make, model))
    # Curated makes that are not in the prefetch list (BMW M3, Mazda MX-5).
    for curated_make in generations.curated_makes():
        if curated_make in PREFETCH_MAKES:
            continue
        for key, model in _score(generations.curated_models(curated_make), needle):
            scored.append((key, curated_make, model))

    scored.sort(key=lambda row: row[0])

    out = []
    seen: set[str] = set()
    for _, mk, model in scored:
        for result in _results_for(_pretty(mk), model, year):
            if result["id"] in seen:
                continue
            seen.add(result["id"])
            out.append(result)
        if len(out) >= limit:
            break
    return out[:limit]


def cache_status() -> dict:
    return {
        "makes_cached": len(_makes),
        "model_lists_cached": len(_models),
        "warmed": bool(_makes),
    }
