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
from app.services import generations, placement, tagging


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40] or "build"


def car_id_for(make: str, model: str, generation: str | None = None) -> str:
    """A graph is keyed by GENERATION, not model — mods are generation-specific."""
    if generation:
        return generations.slug(make, model, generation)
    return slugify(f"{make} {model}")


# --- graphs ------------------------------------------------------------------------

def get_or_create_graph(
    make: str, model: str, generation: str | None = None, year: int | None = None
) -> Graph:
    """getDAG. Creates the car and its stock root on first request.

    The frontend only ever calls this — there is no separate "create" call to forget.

    Resolution order: an explicit generation wins; a year picks the generation covering
    it; otherwise the newest generation is used, since that is what people are most
    likely modding.
    """
    record = _resolve(make, model, generation, year)
    car_id = record["id"]

    car = store.get("cars", car_id)
    if car is None:
        car = _create_graph(car_id, record)

    return Graph(car=Car(**car), nodes=_nodes_for(car_id))


def _resolve(
    make: str, model: str, generation: str | None, year: int | None
) -> dict:
    options = generations.for_model(make, model)

    if generation:
        for option in options:
            if option["generation"].lower() == generation.strip().lower():
                return option
        # An unknown generation name is still usable — the user may be modding something
        # we have not curated, and refusing would just block them.
        return {
            **options[0],
            "id": generations.slug(make, model, generation),
            "generation": generation,
            "years": generation,
            "curated": False,
        }

    if year is not None:
        covering = generations.covering(make, model, year)
        if covering:
            return covering

    return options[0]


def get_or_create_by_car_id(car_id: str) -> Graph | None:
    """Open a graph straight from a search result's id."""
    car = store.get("cars", car_id)
    if car is not None:
        return Graph(car=Car(**car), nodes=_nodes_for(car_id))

    record = generations.by_id(car_id)
    if record is None:
        return None

    created = _create_graph(car_id, record)
    return Graph(car=Car(**created), nodes=_nodes_for(car_id))


def _create_graph(car_id: str, record: dict) -> dict:
    """Register a car shell without a root node.

    The first user to open an empty garage is prompted to plant the first node —
    we do not silently invent a stock root for them.
    """
    car = {
        "id": car_id,
        "make": record["make"],
        "model": record["model"],
        "generation": record["generation"],
        "yearStart": record["yearStart"],
        "yearEnd": record["yearEnd"],
        "yearRange": record["years"],
        "heroImage": record.get("heroImage"),
        "rootNodeId": "",
    }
    store.put("cars", car_id, car)
    return car


def _nodes_for(car_id: str) -> list[Node]:
    raw = store.find("nodes", carId=car_id)
    raw.sort(key=lambda n: n["createdAt"])
    return [Node(**n) for n in raw]


def raw_nodes(car_id: str) -> list[dict]:
    """Stored node dicts, for callers that only need to count over them."""
    return store.find("nodes", carId=car_id)


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
    car = store.get("cars", car_id)
    if car is None:
        return None

    existing = store.find("nodes", carId=car_id)

    parent_ids = req.parentIds
    if parent_ids is None:
        parent_ids = placement.find_parents(req.mods, existing)
    else:
        known = {n["id"] for n in existing}
        parent_ids = [p for p in parent_ids if p in known]

    # Explicit empty parentIds = plant a root (first build on this car).
    # Only one root is allowed — further empty plants attach to the existing root.
    existing_roots = [n for n in existing if not (n.get("parentIds") or [])]
    if not parent_ids and existing_roots:
        parent_ids = [existing_roots[0]["id"]]

    is_root = not parent_ids
    node_id = (
        f"{car_id}-root"
        if is_root
        else f"{car_id}-{slugify(req.title)}-{int(datetime.now().timestamp() * 1000) % 100000}"
    )

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
        isRoot=is_root,
        slot=placement.slot_for(req.mods),
        level=placement.level_for(req.mods) if not is_root else 0,
        stats=NodeStats(
            forks=0,
            notes=0,
            contributors=1,
            heat=1.0 if is_root else (0.7 if len(parent_ids) > 1 else 0.45),
        ),
    )
    store.put("nodes", node_id, node.model_dump())

    if is_root:
        car["rootNodeId"] = node_id
        store.put("cars", car_id, car)

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

    # Two different 24h numbers, both wanted: how many PEOPLE showed up, and how many
    # THINGS happened. A single person posting five times is 1 and 5.
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    recent: set[str] = set()
    recent_actions = 0
    for record, who in (
        *((n, n["createdBy"]) for n in nodes),
        *((p, p["author"]) for p in posts),
        *((r, r["author"]) for r in replies),
    ):
        if _parse(record["createdAt"]) >= cutoff:
            recent.add(who)
            recent_actions += 1

    hottest = max(nodes, key=lambda n: n["stats"].get("heat", 0), default=None)

    return Stats(
        carId=car_id,
        builds=len(nodes),
        mods=sum(mods_by_slot.values()),
        contributors=len(people),
        active24h=len(recent),
        contributions24h=recent_actions,
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
