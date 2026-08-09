"""Work out where a new build belongs in the DAG.

This is the hard part of createNode. The user contributes "K24 turbo swap" and should not
have to understand the graph — the server finds the parent.

The rule: a build's parent is the existing node it most closely extends. A fork keeps
most of its parent's mods and changes one — so a candidate is scored as

    (slots carried over unchanged) - (slots that contradict the parent)

Requiring identical values in every shared slot would be wrong: changing the brakes on a
turbo build still makes it a child of the turbo build, not a sibling of the root.

A candidate must score above zero — at least one mod carried over, and more kept than
changed. Ties are broken by the deeper node, so a build lands at the end of the branch it
continues rather than up near the root.

If two branches tie and neither is an ancestor of the other, the new build genuinely
combines them: it gets BOTH as parents, which is a merge.
"""

from __future__ import annotations

from app.models.schemas import Mods


def _filled(mods: dict | Mods) -> dict[str, str]:
    if isinstance(mods, Mods):
        return {k: v.lower() for k, v in mods.filled().items()}
    return {
        slot: str(value).strip().lower()
        for slot, value in (mods or {}).items()
        if str(value).strip()
    }


def _depth(node_id: str, by_id: dict[str, dict]) -> int:
    """Longest path back to a root. Guarded against cycles."""
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


def find_parents(new_mods: Mods, nodes: list[dict]) -> list[str]:
    """Return the parent ids for a build with these mods.

    Empty list means it belongs at the root — only when no node exists at all.
    """
    if not nodes:
        return []

    by_id = {n["id"]: n for n in nodes}
    target = _filled(new_mods)

    if not target:
        # No mods described: hang it off the root rather than guessing.
        roots = [n["id"] for n in nodes if not n.get("parentIds")]
        return roots[:1]

    candidates: list[tuple[int, int, int, str]] = []
    for node in nodes:
        node_mods = _filled(node.get("mods", {}))
        if not node_mods:
            continue

        kept = sum(1 for slot, value in node_mods.items() if target.get(slot) == value)
        changed = sum(
            1
            for slot, value in node_mods.items()
            if slot in target and target[slot] != value
        )

        # Nothing carried over, or more rewritten than kept — a different build, not an
        # extension of this one.
        if kept == 0 or changed > kept:
            continue
        candidates.append((kept, -changed, _depth(node["id"], by_id), node["id"]))

    if not candidates:
        roots = [n["id"] for n in nodes if not n.get("parentIds")]
        return roots[:1]

    # Most carried over wins, then fewest contradicted, then the deeper node.
    candidates.sort(key=lambda c: (-c[0], -c[1], -c[2], c[3]))
    best_rank = candidates[0][:2]
    best = [(c[0], c[2], c[3]) for c in candidates if c[:2] == best_rank]

    if len(best) == 1:
        return [best[0][2]]

    # Several equally-good parents. Keep only those that are not ancestors of each
    # other — a node and its own ancestor is not a merge, it is one lineage.
    chosen: list[str] = []
    for _, _, node_id in best:
        if any(node_id in _ancestors(other, by_id) for other in chosen):
            continue
        chosen = [c for c in chosen if c not in _ancestors(node_id, by_id)]
        chosen.append(node_id)

    # Two distinct branches combined == a merge. Cap at two to keep lineage readable.
    return chosen[:2] if chosen else [best[0][2]]


def common_ancestor(a_id: str, b_id: str, nodes: list[dict]) -> str | None:
    """Deepest node that is an ancestor of both — used by the compare endpoint."""
    by_id = {n["id"]: n for n in nodes}
    a_anc = _ancestors(a_id, by_id) | {a_id}
    b_anc = _ancestors(b_id, by_id) | {b_id}
    shared = a_anc & b_anc
    if not shared:
        return None
    return max(shared, key=lambda nid: _depth(nid, by_id))
