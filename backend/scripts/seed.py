"""Seed the demo build graphs.

    python scripts/seed.py

Content lives in scripts/seed_data.py. This file turns it into stored records and
validates the result, so malformed demo data fails here rather than in the frontend.

Writes through whichever store is configured — Supabase when SUPABASE_URL is set, the
local JSON file otherwise.
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models.schemas import CommunityPost, Mods, Node, NodeStats, Reply  # noqa: E402
from app.repositories import store  # noqa: E402
from app.services import community_service, placement, tagging  # noqa: E402
from scripts.seed_data import ALL_CARS, CASTS, SYSTEM_AUTHOR  # noqa: E402

NOW = datetime.now(timezone.utc)

# Reference data this script does not own. Carried across a demo-content reseed.
PRESERVED = (
    "parts",
    "part_prices",
    "modifications",
    "modification_parts",
    "modification_dependencies",
    "service_tasks",
    "modification_tasks",
    "task_dependencies",
)


def ago(hours: float) -> str:
    return (NOW - timedelta(hours=hours)).isoformat().replace("+00:00", "Z")


def cast_for(car_id: str):
    """Map a role placeholder to a handle for this car.

    Node authorship uses the role's primary handle so "who built this" stays consistent
    down a branch. Posts spread across the wider cast, seeded by the post id, so a node
    reads as several people talking rather than one person narrating.
    """
    cast = CASTS[car_id]
    primaries = {k: v for k, v in cast.items() if k != "extras"}
    everyone = list(primaries.values()) + cast["extras"]

    def primary(role: str) -> str:
        return primaries.get(role, role)

    def contributor(role: str, seed: str) -> str:
        if role == SYSTEM_AUTHOR:
            return SYSTEM_AUTHOR
        # Deterministic, so reseeding does not reshuffle who said what.
        h = 0
        for char in f"{role}:{seed}":
            h = (h * 33 + ord(char)) & 0xFFFFFFFF
        # Weighted, not uniform: the person who built a node posts on it most, but the
        # rest of the cast has to appear often enough that a node reads as a
        # conversation rather than a monologue. Roughly 40/60.
        return primary(role) if h % 5 < 2 else everyone[h % len(everyone)]

    return primary, contributor


def build_car(spec: dict) -> tuple[dict, dict, dict, dict]:
    """Turn one car spec into (car, nodes, posts, replies) keyed by id."""
    car_id = spec["id"]
    primary, contributor = cast_for(car_id)
    # Every level-1 node hangs off the root, so the first node's parent is it.
    root_id = spec["nodes"][0][2][0]

    car = {
        "id": car_id,
        "make": spec["make"],
        "model": spec["model"],
        "generation": spec["generation"],
        "yearStart": spec["yearStart"],
        "yearEnd": spec["yearEnd"],
        "yearRange": spec["yearRange"],
        "heroImage": None,
        "rootNodeId": root_id,
    }

    nodes: dict[str, dict] = {}

    root_mods = Mods()
    nodes[root_id] = Node(
        id=root_id, carId=car_id, title=spec["rootTitle"], parentIds=[],
        attributes=[], mods=root_mods,
        summary="Factory baseline. The trunk everything grows from.",
        heroImage=f"https://picsum.photos/seed/{root_id}-hero/1000/560",
        createdBy=SYSTEM_AUTHOR, createdAt=ago(760), isRoot=True,
        slot=None, level=0,
        stats=NodeStats(forks=0, notes=0, contributors=1, heat=1.0),
    ).model_dump()

    for node_id, title, parents, summary, author, hours, heat, mods in spec["nodes"]:
        mod_obj = Mods(**mods)
        nodes[node_id] = Node(
            id=node_id, carId=car_id, title=title, parentIds=parents,
            attributes=tagging.tags_for(mod_obj), mods=mod_obj, summary=summary,
            heroImage=f"https://picsum.photos/seed/{node_id}-hero/1000/560",
            createdBy=primary(author), createdAt=ago(hours), isRoot=False,
            slot=placement.slot_for(mod_obj), level=placement.level_for(mod_obj),
            stats=NodeStats(forks=0, notes=0, contributors=1, heat=heat),
        ).model_dump()

    posts: dict[str, dict] = {}
    for node_id, entries in spec["posts"].items():
        for index, (author, kind, title, body, hours, opts) in enumerate(entries):
            post_id = f"p-{node_id}-{index}"
            x, y, w, h = community_service._canvas_defaults(kind, post_id)
            # A pinned author overrides the cast spread. Before/after recordings claim
            # to be the same person's car, so they must carry the same handle.
            who = opts.get("as") or contributor(author, post_id)
            posts[post_id] = CommunityPost(
                id=post_id, nodeId=node_id, author=who,
                avatarColor=community_service._avatar_color(who),
                kind=kind, title=title, body=body,
                mediaUrl=(
                    # Real committed audio wins over a placeholder image: these are the
                    # clips a judge will actually press play on.
                    f"/audio/{opts['audio']}" if opts.get("audio")
                    else f"https://picsum.photos/seed/{post_id}/800/500"
                    if opts.get("media") else None
                ),
                durationSec=opts.get("duration"),
                transcribed=opts.get("transcribed", True),
                createdAt=ago(hours),
                canvasX=x, canvasY=y, canvasW=w, canvasH=h,
            ).model_dump()

    replies: dict[str, dict] = {}
    for index, (node_id, post_index, author, body, hours) in enumerate(spec["replies"]):
        reply_id = f"r-{node_id}-{post_index}-{index}"
        who = contributor(author, reply_id)  # replies stay spread across the cast
        replies[reply_id] = Reply(
            id=reply_id, postId=f"p-{node_id}-{post_index}", author=who,
            avatarColor=community_service._avatar_color(who),
            body=body, createdAt=ago(hours),
        ).model_dump()

    return car, nodes, posts, replies


def main() -> None:
    cars: dict[str, dict] = {}
    nodes: dict[str, dict] = {}
    posts: dict[str, dict] = {}
    replies: dict[str, dict] = {}

    for spec in ALL_CARS:
        car, car_nodes, car_posts, car_replies = build_car(spec)
        cars[car["id"]] = car
        nodes.update(car_nodes)
        posts.update(car_posts)
        replies.update(car_replies)

    # Derive counts rather than hand-writing them, so stats always agree with the data.
    for post in posts.values():
        nodes[post["nodeId"]]["stats"]["notes"] += 1
    for node in nodes.values():
        for parent_id in node["parentIds"]:
            nodes[parent_id]["stats"]["forks"] += 1
        people = {node["createdBy"]} | {
            p["author"] for p in posts.values() if p["nodeId"] == node["id"]
        }
        node["stats"]["contributors"] = len(people)

    validate(cars, nodes, posts, replies)

    # Reference catalogue data is curated by separate seeders, so content reseeds carry
    # it across untouched. Node links and historical comparison runs are intentionally
    # not preserved because they can point at nodes replaced by this reset.
    preserved = {
        collection: {row["id"]: row for row in store.all_of(collection)}
        for collection in PRESERVED
    }

    store.reset({
        "cars": cars, "nodes": nodes, "posts": posts, "replies": replies, **preserved,
    })

    print(f"Seeded {len(cars)} cars, {len(nodes)} nodes, {len(posts)} posts, "
          f"{len(replies)} replies")
    for car_id in cars:
        car_nodes = [n for n in nodes.values() if n["carId"] == car_id]
        car_posts = [p for p in posts.values() if p["nodeId"] in {n["id"] for n in car_nodes}]
        merges = [n["id"] for n in car_nodes if len(n["parentIds"]) > 1]
        voice = sum(1 for p in car_posts if p["kind"] == "voice")
        print(f"  {car_id:32} {len(car_nodes):2} nodes  {len(car_posts):2} posts  "
              f"{voice} voice  merge: {merges}")
    kept = {name: len(rows) for name, rows in preserved.items() if rows}
    if kept:
        print(f"  (kept {kept} — rerun seed_parts.py to refresh parts and prices)")


def validate(cars: dict, nodes: dict, posts: dict, replies: dict) -> None:
    """Fail loudly on bad demo data — the frontend and Ahmed both build against this."""
    for node in nodes.values():
        assert node["carId"] in cars, f"{node['id']} references unknown car"
        for parent_id in node["parentIds"]:
            assert parent_id in nodes, f"{node['id']} has unknown parent {parent_id}"
        assert set(node["mods"]) == {"engine", "exhaust", "wheels", "brakes"}, (
            f"{node['id']} has non-canonical mod slots"
        )

        # The layer invariant: a single-parent node adds exactly one slot and repeats the
        # rest verbatim. Merges are exempt — they draw from two branches.
        if len(node["parentIds"]) != 1:
            continue
        parent = nodes[node["parentIds"][0]]
        mine = {s: v for s, v in node["mods"].items() if v.strip()}
        theirs = {s: v for s, v in parent["mods"].items() if v.strip()}
        added = set(mine) - set(theirs)
        assert len(added) == 1, (
            f"{node['id']} adds {sorted(added) or 'nothing'} to {parent['id']} — "
            "each level must introduce exactly one slot"
        )
        assert {s: v for s, v in mine.items() if s in theirs} == theirs, (
            f"{node['id']} rewrote a slot it inherited from {parent['id']}"
        )
        assert node["slot"] == added.pop(), f"{node['id']} slot disagrees with its mods"

    for post in posts.values():
        assert post["nodeId"] in nodes, f"post {post['id']} on unknown node"
    for reply in replies.values():
        assert reply["postId"] in posts, f"reply {reply['id']} on unknown post {reply['postId']}"

    # Every node needs posts — a node that opens empty looks broken to a judge.
    posted = {p["nodeId"] for p in posts.values()}
    bare = sorted(set(nodes) - posted)
    assert not bare, f"nodes with no posts: {bare}"

    for car_id in cars:
        car_nodes = [n for n in nodes.values() if n["carId"] == car_id]
        assert any(len(n["parentIds"]) > 1 for n in car_nodes), f"{car_id} has no merge"
        levels = {n["level"] for n in car_nodes}
        assert levels == {0, 1, 2, 3, 4}, f"{car_id} missing layers: {sorted(levels)}"
        car_posts = [p for p in posts.values() if p["nodeId"] in {n["id"] for n in car_nodes}]
        assert any(p["kind"] == "voice" for p in car_posts), f"{car_id} has no voice note"


if __name__ == "__main__":
    main()
