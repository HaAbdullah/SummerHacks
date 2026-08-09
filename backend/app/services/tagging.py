"""Derive filter tags from the four mod slots.

The frontend filter panel reads `node.attributes` — a flat list of tag ids. Those tags
are not a separate vocabulary: every one is produced from a mod slot's free text here,
so the four slots stay the single source of truth.

Free text is what people actually write ("K24 swap, Garrett GT2871R"), so matching is by
keyword. A build with no recognised keyword in a slot still gets the slot's `-other` tag,
which keeps it reachable in the filter panel instead of invisible.
"""

from __future__ import annotations

from app.models.schemas import MOD_SLOTS, Mods

# tag id -> keywords that imply it. Order matters only for readability.
TAG_KEYWORDS: dict[str, dict[str, tuple[str, ...]]] = {
    "engine": {
        "engine-stock": ("stock", "oem", "factory", "untouched"),
        "engine-boltons": ("intake", "bolt-on", "bolt on", "header", "tune", "ecu", "cam"),
        "engine-turbo": ("turbo", "boost", "psi", "garrett", "snail"),
        "engine-supercharger": ("supercharg", "blower", "whipple"),
        "engine-swap": ("swap", "k24", "k20", "2jz", "1uz", "ls", "built block", "forged"),
    },
    "exhaust": {
        "exhaust-stock": ("stock", "oem", "factory"),
        "exhaust-quiet": ("resonat", "quiet", "muffled", "silenc"),
        "exhaust-catback": ("catback", "cat-back", "axleback", "axle-back"),
        "exhaust-straight": ("straight", "catless", "decat", "open", "downpipe", "header"),
    },
    "wheels": {
        "wheels-stock": ("stock", "oem", "factory", "steel"),
        "wheels-allterrain": ("all-terrain", "all terrain", "off-road", "offroad", "mud", "gravel"),
        "wheels-lightweight": ("forged", "lightweight", "flow-form", "flow form"),
        "wheels-track": ("semi-slick", "slick", "track", "r-comp", "cup"),
        "wheels-big": ("18in", "19in", "20in", "18\"", "19\"", "20\""),
    },
    "brakes": {
        "brakes-stock": ("stock", "oem", "factory"),
        "brakes-pads": ("pad", "line", "fluid", "stainless"),
        "brakes-slotted": ("slot", "drill", "vented"),
        "brakes-bbk": ("big brake", "bbk", "4-pot", "6-pot", "brembo", "caliper", "mm rotor"),
    },
}


def tags_for(mods: Mods) -> list[str]:
    """Flat tag list for one build, derived from its four slots."""
    out: list[str] = []
    for slot in MOD_SLOTS:
        value = getattr(mods, slot).strip().lower()
        if not value:
            continue
        matched = [
            tag
            for tag, keywords in TAG_KEYWORDS[slot].items()
            if any(kw in value for kw in keywords)
        ]
        # Something is written here but no keyword matched — keep it filterable.
        out.extend(matched or [f"{slot}-other"])
    return sorted(dict.fromkeys(out))


SLOT_LABELS = {
    "engine": "Engine",
    "exhaust": "Exhaust",
    "wheels": "Wheels",
    "brakes": "Brakes",
}

TAG_LABELS = {
    "engine-stock": "Stock",
    "engine-boltons": "Bolt-ons",
    "engine-turbo": "Turbo",
    "engine-supercharger": "Supercharged",
    "engine-swap": "Engine swap",
    "engine-other": "Other",
    "exhaust-stock": "Stock",
    "exhaust-quiet": "Quiet / resonated",
    "exhaust-catback": "Cat-back",
    "exhaust-straight": "Straight pipe",
    "exhaust-other": "Other",
    "wheels-stock": "Stock",
    "wheels-allterrain": "All-terrain",
    "wheels-lightweight": "Lightweight",
    "wheels-track": "Track",
    "wheels-big": "18in+",
    "wheels-other": "Other",
    "brakes-stock": "Stock",
    "brakes-pads": "Pads & lines",
    "brakes-slotted": "Slotted / drilled",
    "brakes-bbk": "Big brake kit",
    "brakes-other": "Other",
}


def attribute_groups(nodes: list[dict] | None = None) -> list[dict]:
    """The filter panel's groups — exactly the four slots, in layer order.

    Pass the car's nodes to get counts and to drop tags nothing uses, so the panel never
    offers a filter that returns an empty graph. Omit them for the full vocabulary.
    """
    counts: dict[str, int] = {}
    if nodes is not None:
        for node in nodes:
            for tag in node.get("attributes", []):
                counts[tag] = counts.get(tag, 0) + 1

    groups = []
    for level, slot in enumerate(MOD_SLOTS, start=1):
        options = []
        for tag in list(TAG_KEYWORDS[slot]) + [f"{slot}-other"]:
            count = counts.get(tag, 0)
            if nodes is not None and count == 0:
                continue
            option = {"id": tag, "label": TAG_LABELS.get(tag, tag)}
            if nodes is not None:
                option["count"] = count
            options.append(option)

        groups.append(
            {
                "id": slot,
                "label": SLOT_LABELS[slot],
                # The layer this slot occupies in the graph.
                "level": level,
                "options": options,
            }
        )
    return groups
