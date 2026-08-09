"""Seed a demo Corolla graph with community posts.

Run from the backend directory:

    python scripts/seed.py

Writes data/db.json. Scope is four mod slots only — engine, exhaust, wheels, brakes.
Nothing here describes wraps, interior or suspension.
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models.schemas import CommunityPost, Mods, Node, NodeStats, Reply  # noqa: E402
from app.repositories import store  # noqa: E402
from app.services import community_service, tagging  # noqa: E402

CAR_ID = "toyota-corolla"
NOW = datetime.now(timezone.utc)


def ago(hours: float) -> str:
    return (NOW - timedelta(hours=hours)).isoformat().replace("+00:00", "Z")


def node(
    node_id: str,
    title: str,
    parents: list[str],
    summary: str,
    author: str,
    hours: float,
    *,
    heat: float = 0.45,
    **mods: str,
) -> dict:
    mod_obj = Mods(**mods)
    return Node(
        id=node_id,
        carId=CAR_ID,
        title=title,
        parentIds=parents,
        attributes=tagging.tags_for(mod_obj),
        mods=mod_obj,
        summary=summary,
        heroImage=f"https://picsum.photos/seed/{node_id}-hero/1000/560",
        createdBy=author,
        createdAt=ago(hours),
        isRoot=not parents,
        stats=NodeStats(forks=0, notes=0, contributors=1, heat=heat),
    ).model_dump()


NODES = [
    node("n-root", "Stock Corolla", [], "Factory baseline. The trunk everything grows from.",
         "modbranch", 720, heat=1.0),

    # --- engine-led branch ---
    node("n-boltons", "Bolt-Ons", ["n-root"],
         "Intake, header and a conservative tune. The cheapest real power.",
         "ahmed", 600, heat=0.72,
         engine="Cold air intake, 4-2-1 header, ECU tune",
         exhaust="High-flow cat, resonated catback"),
    node("n-turbo", "Turbo Build", ["n-boltons"],
         "GT2860 at 8psi on the stock bottom end. Daily-able.",
         "ahmed", 480, heat=0.9,
         engine="2ZR-FE, Garrett GT2860 turbo, 8psi, front-mount intercooler",
         exhaust="3in downpipe, catless, 3in catback",
         brakes="Slotted front rotors, performance pads"),
    node("n-built", "Big Turbo, Built Block", ["n-turbo"],
         "Forged internals, GT3071R at 18psi. Track weapon.",
         "ahmed", 300, heat=0.85,
         engine="Built bottom end, forged rods and pistons, GT3071R at 18psi",
         exhaust="3.5in turbo-back, straight through",
         wheels="17in lightweight forged, 235/40 semi-slick",
         brakes="4-pot front calipers, 320mm rotors"),

    # --- wheels/brakes-led branch ---
    node("n-trail", "Trail Spec", ["n-root"],
         "All-terrain rubber and heavy-duty pads. Gravel-ready on a budget.",
         "kshitij", 560, heat=0.68,
         wheels="16in steel, 215/65 all-terrain",
         brakes="Heavy-duty pads, stainless lines"),
    node("n-gravel", "Gravel Brakes", ["n-trail"],
         "Rally pads and a hydraulic handbrake. Stops on loose surface.",
         "shoaib", 400, heat=0.6,
         wheels="16in steel, 215/65 all-terrain, +30mm spacers",
         brakes="Vented front discs, rally pads, hydraulic handbrake",
         exhaust="High-clearance mid-pipe"),

    # --- quiet daily ---
    node("n-quiet", "Quiet Daily", ["n-root"],
         "Resonated everything. Power without the drone.",
         "abdullah", 520, heat=0.5,
         exhaust="Fully resonated catback, stock tips",
         wheels="17in cast, 215/45",
         brakes="OEM+ pads, stainless lines"),

    # --- THE MERGE: two parents ---
    node("n-rally", "Turbo Rally Build", ["n-built", "n-gravel"],
         "Fusion: built turbo motor on gravel suspension geometry. Detuned for reliability.",
         "kshitij", 96, heat=0.95,
         engine="Built bottom end, forged rods and pistons, GT3071R at 14psi for reliability",
         exhaust="3.5in high-clearance turbo-back",
         wheels="16in gravel-spec, 215/65 all-terrain",
         brakes="4-pot front, rally pads, hydraulic handbrake"),
]


def post(
    post_id: str, node_id: str, author: str, kind: str, title: str, body: str,
    hours: float, *, media: bool = False, duration: int | None = None,
    transcribed: bool = True,
) -> dict:
    x, y, w, h = community_service._canvas_defaults(kind, post_id)
    return CommunityPost(
        id=post_id, nodeId=node_id, author=author,
        avatarColor=community_service._avatar_color(author),
        kind=kind, title=title, body=body,
        mediaUrl=f"https://picsum.photos/seed/{post_id}/800/500" if media else None,
        durationSec=duration, transcribed=transcribed, createdAt=ago(hours),
        canvasX=x, canvasY=y, canvasW=w, canvasH=h,
    ).model_dump()


POSTS = [
    # The Corolla revving voice note.
    post("post-rev-1", "n-turbo", "ahmed", "voice",
         "Corolla revving — 8psi spool",
         "Transcript: cold start, then three pulls to redline. You can hear the turbo "
         "spool come in around 3200rpm and the blow-off between shifts. No rattle on "
         "overrun, so the wastegate is holding.",
         hours=470, duration=27),
    post("post-rev-2", "n-built", "ahmed", "voice",
         "Corolla revving — big turbo, 18psi",
         "Transcript: much later spool than the GT2860, nothing until about 4000rpm, "
         "then it comes in hard. Straight-through exhaust is loud enough that the "
         "intake noise disappears above 5000.",
         hours=290, duration=34),

    post("post-turbo-1", "n-turbo", "shoaib", "text",
         "Boost ceiling on a stock block",
         "8psi has held up for 20k miles on mine. Everyone I know who pushed past 10 on "
         "a stock bottom end lost ringlands within a season. Not worth it — build the "
         "block first.",
         hours=460),
    post("post-turbo-2", "n-turbo", "ahmed", "image",
         "Intercooler piping routing",
         "Piping runs behind the bumper support rather than through it — no cutting, and "
         "it comes out again in twenty minutes if you need to go back to stock.",
         hours=450, media=True),
    post("post-turbo-3", "n-turbo", "kshitij", "sketch",
         "Downpipe clearance sketch",
         "Sketch showing where the 3in downpipe fouls the steering rack. Needs a dimple "
         "or you will feel it through the wheel at idle.",
         hours=440, media=True),

    post("post-trail-1", "n-trail", "kshitij", "text",
         "Cheapest way to real sidewall",
         "215/65 on a 16in steel wheel is the cheapest way to get sidewall on this "
         "chassis. Whole setup was under $600 used, and the steels bend instead of "
         "cracking when you hit something.",
         hours=550),
    post("post-trail-2", "n-trail", "shoaib", "image",
         "Spacer fitment at full lock",
         "+30mm spacers, no rubbing at full lock after rolling the front lip. Photo is "
         "at full steering deflection.",
         hours=540, media=True),

    post("post-gravel-1", "n-gravel", "shoaib", "voice",
         "Handbrake feel after the swap",
         "Transcript: walking through the hydraulic handbrake install and how much lever "
         "travel there is before it bites. Much shorter throw than the cable setup.",
         hours=390, duration=41),

    # Recent activity, so active24h is a real non-zero number on the dashboard.
    post("post-rally-1", "n-rally", "kshitij", "text",
         "Why 14psi instead of 18",
         "Dropped from 18 to 14psi for gravel. Losing about 40hp, but heat soak on a "
         "long stage was killing it and I would rather finish. Same turbo, just a "
         "different boost target in the tune.",
         hours=6),
    post("post-quiet-2", "n-quiet", "abdullah", "image",
         "Tip alignment after the swap",
         "Tips sit 8mm proud of the bumper cut now. Looks intentional rather than "
         "like something fell off.",
         hours=11, media=True),
    post("post-rally-2", "n-rally", "kshitij", "video",
         "Gravel test run — second gear pulls",
         "",
         hours=3, media=True, duration=52, transcribed=False),

    post("post-quiet-1", "n-quiet", "abdullah", "text",
         "Resonator placement matters",
         "First catback I ran droned badly at 70mph. Moving the resonator 200mm further "
         "back killed it completely. Same pipe diameter, same muffler.",
         hours=500),

    post("post-boltons-1", "n-boltons", "ahmed", "blueprint",
         "Header routing diagram",
         "Blueprint of the 4-2-1 header primaries and where they clear the steering "
         "shaft. Useful if you are fabricating rather than buying.",
         hours=590, media=True),
]

REPLIES = [
    Reply(id="reply-1", postId="post-turbo-1", author="ahmed",
          avatarColor=community_service._avatar_color("ahmed"),
          body="Seconding this. I went to 11psi for one summer and it cost me a rebuild.",
          createdAt=ago(455)).model_dump(),
    Reply(id="reply-2", postId="post-turbo-1", author="abdullah",
          avatarColor=community_service._avatar_color("abdullah"),
          body="What tune were you running? Wondering if timing was the real culprit.",
          createdAt=ago(450)).model_dump(),
    Reply(id="reply-3", postId="post-rev-1", author="kshitij",
          avatarColor=community_service._avatar_color("kshitij"),
          body="That spool sounds way earlier than mine. Are you on the twin-scroll manifold?",
          createdAt=ago(465)).model_dump(),
    Reply(id="reply-4", postId="post-rally-1", author="shoaib",
          avatarColor=community_service._avatar_color("shoaib"),
          body="Smart call. Everyone chases peak numbers and then cooks the motor on stage 3.",
          createdAt=ago(4)).model_dump(),
    Reply(id="reply-5", postId="post-trail-1", author="abdullah",
          avatarColor=community_service._avatar_color("abdullah"),
          body="Any issue with speedo error on the taller tyre?",
          createdAt=ago(530)).model_dump(),
]


def main() -> None:
    car = {
        "id": CAR_ID, "make": "Toyota", "model": "Corolla",
        "yearRange": "2018–2024", "rootNodeId": "n-root",
    }

    nodes = {n["id"]: n for n in NODES}
    posts = {p["id"]: p for p in POSTS}
    replies = {r["id"]: r for r in REPLIES}

    # Derive counts rather than hand-writing them, so stats always agree with the data.
    for p in posts.values():
        nodes[p["nodeId"]]["stats"]["notes"] += 1
    for n in nodes.values():
        for parent_id in n["parentIds"]:
            nodes[parent_id]["stats"]["forks"] += 1
        contributors = {n["createdBy"]} | {
            p["author"] for p in posts.values() if p["nodeId"] == n["id"]
        }
        n["stats"]["contributors"] = len(contributors)

    _validate(nodes, posts, replies)

    store.reset({"cars": {CAR_ID: car}, "nodes": nodes, "posts": posts, "replies": replies})

    merges = [n["id"] for n in nodes.values() if len(n["parentIds"]) > 1]
    voice = [p["id"] for p in posts.values() if p["kind"] == "voice"]
    print(f"Seeded {store.DB_PATH}")
    print(f"  {len(nodes)} nodes, {len(posts)} posts, {len(replies)} replies")
    print(f"  merge nodes: {merges}")
    print(f"  voice notes: {voice}")


def _validate(nodes: dict, posts: dict, replies: dict) -> None:
    """Fail loudly on bad demo data — the frontend and Ahmed both build against this."""
    for n in nodes.values():
        for parent_id in n["parentIds"]:
            assert parent_id in nodes, f"{n['id']} has unknown parent {parent_id}"
        assert set(n["mods"]) == {"engine", "exhaust", "wheels", "brakes"}, (
            f"{n['id']} has non-canonical mod slots: {sorted(n['mods'])}"
        )
    for p in posts.values():
        assert p["nodeId"] in nodes, f"post {p['id']} on unknown node"
    for r in replies.values():
        assert r["postId"] in posts, f"reply {r['id']} on unknown post"

    assert any(len(n["parentIds"]) > 1 for n in nodes.values()), "need at least one merge"
    assert any(p["kind"] == "voice" for p in posts.values()), "need a voice note"
    assert any("rev" in p["title"].lower() for p in posts.values()), "need the revving clip"


if __name__ == "__main__":
    main()
