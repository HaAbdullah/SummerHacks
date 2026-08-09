"""Graph (DAG) and node business logic. Routes call this; it calls the repository."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from app.models.schemas import (
    Car,
    CreateNodeRequest,
    Graph,
    Mods,
    Node,
    NodeDetail,
    NodeStats,
    Stats,
)
from app.repositories import store
from app.services import placement, tagging


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40] or "build"


def car_id_for(make: str, model: str) -> str:
    return slugify(f"{make} {model}")


# --- graphs ------------------------------------------------------------------------

def get_or_create_graph(make: str, model: str, year_range: str = "—") -> Graph:
    """getDAG. Creates the car and its stock root on first request.

    The frontend only ever calls this — there is no separate "create" call to forget.
    """
    car_id = car_id_for(make, model)
    car = store.get("cars", car_id)

    if car is None:
        car = _create_graph(car_id, make, model, year_range)

    return Graph(car=Car(**car), nodes=_nodes_for(car_id))


def _create_graph(car_id: str, make: str, model: str, year_range: str) -> dict:
    """createDAG. Every car starts with one stock root — the trunk builds grow from."""
    root_id = f"{car_id}-root"
    car = {
        "id": car_id,
        "make": make.strip().title(),
        "model": model.strip().title(),
        "yearRange": year_range,
        "rootNodeId": root_id,
    }
    store.put("cars", car_id, car)

    root = Node(
        id=root_id,
        carId=car_id,
        title=f"Stock {car['model']}",
        parentIds=[],
        attributes=[],
        mods=Mods(),
        summary="Factory baseline. The trunk everything grows from.",
        createdBy="modbranch",
        createdAt=_now(),
        isRoot=True,
        stats=NodeStats(heat=1.0, contributors=1, notes=0, forks=0),
    )
    store.put("nodes", root_id, root.model_dump())
    return car


def _nodes_for(car_id: str) -> list[Node]:
    raw = store.find("nodes", carId=car_id)
    raw.sort(key=lambda n: n["createdAt"])
    return [Node(**n) for n in raw]


def list_cars() -> list[Car]:
    return [Car(**c) for c in store.all_of("cars")]


def get_car(car_id: str) -> Car | None:
    car = store.get("cars", car_id)
    return Car(**car) if car else None


# --- nodes -------------------------------------------------------------------------

def get_node(node_id: str) -> NodeDetail | None:
    raw = store.get("nodes", node_id)
    if raw is None:
        return None

    siblings = store.find("nodes", carId=raw["carId"])
    child_ids = [n["id"] for n in siblings if node_id in n.get("parentIds", [])]

    from app.services import community_service

    return NodeDetail(
        **raw,
        childIds=child_ids,
        posts=community_service.posts_for(node_id),
    )


def create_node(car_id: str, req: CreateNodeRequest) -> Node | None:
    """createNode. Places the build in the graph when no parents are given."""
    if store.get("cars", car_id) is None:
        return None

    existing = store.find("nodes", carId=car_id)

    parent_ids = req.parentIds
    if parent_ids is None:
        parent_ids = placement.find_parents(req.mods, existing)
    else:
        known = {n["id"] for n in existing}
        parent_ids = [p for p in parent_ids if p in known]

    node_id = f"{car_id}-{slugify(req.title)}-{int(datetime.now().timestamp() * 1000) % 100000}"

    node = Node(
        id=node_id,
        carId=car_id,
        title=req.title.strip(),
        parentIds=parent_ids,
        # Tags always come from the four slots, so the filter panel cannot drift out of
        # sync with the mods. A caller-supplied list is merged in, never substituted.
        attributes=sorted(set(tagging.tags_for(req.mods)) | set(req.attributes)),
        mods=req.mods,
        summary=req.summary.strip(),
        heroImage=req.heroImage,
        createdBy=req.createdBy,
        createdAt=_now(),
        isRoot=not parent_ids,
        stats=NodeStats(
            forks=0,
            notes=0,
            contributors=1,
            heat=0.7 if len(parent_ids) > 1 else 0.45,
        ),
    )
    store.put("nodes", node_id, node.model_dump())

    for parent_id in parent_ids:
        parent = store.get("nodes", parent_id)
        if parent:
            parent["stats"]["forks"] = parent["stats"].get("forks", 0) + 1
            store.put("nodes", parent_id, parent)

    return node


def bump_note_count(node_id: str, delta: int = 1) -> None:
    node = store.get("nodes", node_id)
    if node:
        node["stats"]["notes"] = max(0, node["stats"].get("notes", 0) + delta)
        store.put("nodes", node_id, node)


# --- stats -------------------------------------------------------------------------

def get_stats(car_id: str) -> Stats | None:
    """getStats. Every number is counted from stored records — nothing is invented."""
    if store.get("cars", car_id) is None:
        return None

    nodes = store.find("nodes", carId=car_id)
    node_ids = {n["id"] for n in nodes}
    posts = [p for p in store.all_of("posts") if p["nodeId"] in node_ids]
    post_ids = {p["id"] for p in posts}
    replies = [r for r in store.all_of("replies") if r["postId"] in post_ids]

    mods_by_slot: dict[str, int] = {}
    for node in nodes:
        for slot, value in (node.get("mods") or {}).items():
            if str(value).strip():
                mods_by_slot[slot] = mods_by_slot.get(slot, 0) + 1

    posts_by_kind: dict[str, int] = {}
    for post in posts:
        posts_by_kind[post["kind"]] = posts_by_kind.get(post["kind"], 0) + 1

    people = (
        {n["createdBy"] for n in nodes}
        | {p["author"] for p in posts}
        | {r["author"] for r in replies}
    )

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    recent: set[str] = set()
    for record, who in (
        *((n, n["createdBy"]) for n in nodes),
        *((p, p["author"]) for p in posts),
        *((r, r["author"]) for r in replies),
    ):
        if _parse(record["createdAt"]) >= cutoff:
            recent.add(who)

    hottest = max(nodes, key=lambda n: n["stats"].get("heat", 0), default=None)

    return Stats(
        carId=car_id,
        builds=len(nodes),
        mods=sum(mods_by_slot.values()),
        contributors=len(people),
        active24h=len(recent),
        posts=len(posts),
        replies=len(replies),
        merges=sum(1 for n in nodes if len(n.get("parentIds", [])) > 1),
        modsBySlot=mods_by_slot,
        postsByKind=posts_by_kind,
        deepestChain=_deepest(nodes),
        hottestNodeId=hottest["id"] if hottest else "",
    )


def _parse(iso: str) -> datetime:
    parsed = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _deepest(nodes: list[dict]) -> int:
    by_id = {n["id"]: n for n in nodes}
    best = 0
    for node in nodes:
        seen: set[str] = set()

        def walk(nid: str) -> int:
            if nid in seen:
                return 0
            seen.add(nid)
            parents = by_id.get(nid, {}).get("parentIds", [])
            return 1 + max((walk(p) for p in parents), default=0) if parents else 0

        best = max(best, walk(node["id"]))
    return best
