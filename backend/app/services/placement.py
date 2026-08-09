"""Work out where a new build belongs in the DAG.

The graph is LAYERED: each level introduces exactly one mod slot, always in the same
order.

    level 0   root, stock, no mods
    level 1   engine
    level 2   exhaust
    level 3   wheels
    level 4   brakes

So a node differs from its parent in exactly one slot, and which slot is fixed by its
depth. Walking down a branch reads as one decision per step — engine, then exhaust, then
wheels, then brakes — instead of a jumble of changes at every hop.

A build's own slot is the DEEPEST slot it fills. Its parent is the node carrying the same
mods minus that slot. If a build skips a slot (engine and brakes, no exhaust or wheels)
its parent is simply the nearest shallower node that matches — levels may skip, but the
order never reverses.

Merges are the one exception: passing two parentIds explicitly creates a fusion, which by
definition draws from two branches and cannot sit on a single layer.
"""

from __future__ import annotations

from app.models.schemas import MOD_SLOTS, Mods

# The layer order. Index in this tuple IS the node's level.
SLOT_ORDER = MOD_SLOTS


def _filled(mods: dict | Mods) -> dict[str, str]:
    if isinstance(mods, Mods):
        return {k: v.lower() for k, v in mods.filled().items()}
    return {
        slot: str(value).strip().lower()
        for slot, value in (mods or {}).items()
        if str(value).strip()
    }


def slot_for(mods: dict | Mods) -> str | None:
    """The slot a build introduces — the deepest one it fills. None for a stock build."""
    filled = _filled(mods)
    for slot in reversed(SLOT_ORDER):
        if slot in filled:
            return slot
    return None


def level_for(mods: dict | Mods) -> int:
    """0 for stock, else 1-4 by which slot the build introduces."""
    slot = slot_for(mods)
    return SLOT_ORDER.index(slot) + 1 if slot else 0


def _ancestors(node_id: str, by_id: dict[str, dict]) -> set[str]:
    out: set[str] = set()
    stack = list(by_id.get(node_id, {}).get("parentIds", []))
    while stack:
        current = stack.pop()
        if current in out:
            continue
        out.add(current)
        stack.extend(by_id.get(current, {}).get("parentIds", []))
    return out


def _depth(node_id: str, by_id: dict[str, dict]) -> int:
    seen: set[str] = set()

    def walk(nid: str) -> int:
        if nid in seen:
            return 0
        seen.add(nid)
        node = by_id.get(nid)
        if not node or not node.get("parentIds"):
            return 0
        return 1 + max(walk(pid) for pid in node["parentIds"])

    return walk(node_id)


def find_parents(new_mods: Mods, nodes: list[dict]) -> list[str]:
    """Return parent ids for a build with these mods, keeping the layer order intact."""
    if not nodes:
        return []

    roots = [n["id"] for n in nodes if not n.get("parentIds")]
    target = _filled(new_mods)

    if not target:
        return roots[:1]

    own_slot = slot_for(new_mods)
    own_level = SLOT_ORDER.index(own_slot)

    # Everything this build carries from shallower layers. Its parent must match this
    # exactly — that is what makes the new node a one-slot step down.
    inherited = {
        slot: value
        for slot, value in target.items()
        if SLOT_ORDER.index(slot) < own_level
    }

    # Walk back through the layers: prefer a parent carrying every inherited mod, then
    # settle for progressively shallower ancestors if that node was never created.
    for cutoff in range(own_level, -1, -1):
        wanted = {
            slot: value
            for slot, value in inherited.items()
            if SLOT_ORDER.index(slot) < cutoff
        }
        matches = [
            n["id"]
            for n in nodes
            if _filled(n.get("mods", {})) == wanted and n["id"] not in roots
        ]
        if matches:
            by_id = {n["id"]: n for n in nodes}
            matches.sort(key=lambda nid: (-_depth(nid, by_id), nid))
            return matches[:1]

    return roots[:1]


def common_ancestor(a_id: str, b_id: str, nodes: list[dict]) -> str | None:
    """Deepest node that is an ancestor of both — used by the compare endpoint."""
    by_id = {n["id"]: n for n in nodes}
    a_anc = _ancestors(a_id, by_id) | {a_id}
    b_anc = _ancestors(b_id, by_id) | {b_id}
    shared = a_anc & b_anc
    if not shared:
        return None
    return max(shared, key=lambda nid: _depth(nid, by_id))
