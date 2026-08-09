"""The two endpoints Ahmed's workflow calls.

Both return structured data only. No model is invoked here — the diff is arithmetic and
the build payload is assembly. Ahmed's layer adds the language on top.

That split is deliberate: the diff is testable without an API key, it cannot report a
change that did not happen, and it still renders if the AI call fails mid-demo.
"""

from __future__ import annotations

from app.models.schemas import (
    MOD_SLOTS,
    BuildModPayload,
    Car,
    CompareResponse,
    ModChange,
    Mods,
    Node,
)
from app.repositories import store
from app.services import community_service, parts, placement


def compare(from_id: str, to_id: str) -> CompareResponse | None:
    """getCompareNode. Per-slot diff across the four mods."""
    a = store.get("nodes", from_id)
    b = store.get("nodes", to_id)
    if a is None or b is None:
        return None

    a_mods = Mods(**(a.get("mods") or {}))
    b_mods = Mods(**(b.get("mods") or {}))

    changes: list[ModChange] = []
    for slot in MOD_SLOTS:
        before = getattr(a_mods, slot).strip()
        after = getattr(b_mods, slot).strip()

        if before == after:
            status = "unchanged"
        elif not before:
            status = "added"
        elif not after:
            status = "removed"
        else:
            status = "modified"

        changes.append(ModChange(slot=slot, status=status, before=before, after=after))

    nodes = store.find("nodes", carId=a["carId"])

    return CompareResponse(
        carId=a["carId"],
        fromNodeId=from_id,
        toNodeId=to_id,
        fromTitle=a["title"],
        toTitle=b["title"],
        changes=changes,
        changedCount=sum(1 for c in changes if c.status != "unchanged"),
        commonAncestorId=placement.common_ancestor(from_id, to_id, nodes),
    )


def build_payload(node_id: str) -> BuildModPayload | None:
    """getBuildModAI. Everything needed to write a build guide, in one call."""
    node = store.get("nodes", node_id)
    if node is None:
        return None

    car = store.get("cars", node["carId"])
    if car is None:
        return None

    nodes = store.find("nodes", carId=node["carId"])
    by_id = {n["id"]: n for n in nodes}

    # Root → this node. Following the first parent keeps the guide a readable sequence;
    # a merge's second lineage would make the steps ambiguous.
    lineage: list[dict] = []
    seen: set[str] = set()
    current: dict | None = node
    while current and current["id"] not in seen:
        seen.add(current["id"])
        lineage.append(current)
        parents = current.get("parentIds") or []
        current = by_id.get(parents[0]) if parents else None
    lineage.reverse()

    posts = community_service.posts_for(node_id)

    return BuildModPayload(
        nodeId=node_id,
        carId=node["carId"],
        car=Car(**car),
        title=node["title"],
        summary=node.get("summary", ""),
        mods=Mods(**(node.get("mods") or {})),
        attributes=node.get("attributes", []),
        lineage=[Node(**n) for n in lineage],
        communityText=[p.body for p in posts if p.body.strip()],
        modCount=Mods(**(node.get("mods") or {})).count(),
        postCount=len(posts),
        parts=parts.estimate(node["carId"], node.get("mods") or {}),
    )
