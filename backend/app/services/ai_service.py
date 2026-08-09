"""Existing node build-payload assembly.

The agentic comparison workflow lives separately in ``agentic_compare`` so replacing
POST /ai/compare cannot affect graph, node, community, or build-payload behavior.
"""

from __future__ import annotations

from app.models.schemas import (
    BuildModPayload,
    Car,
    Mods,
    Node,
)
from app.repositories import store
from app.services import community_service, parts


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
