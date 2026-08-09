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
from app.services import community_service, placement, tagging  # noqa: E402

# The graph is keyed by GENERATION, not model — mods are generation-specific. This id
# is what vehicle search returns for a 2014-2019 Corolla.
CAR_ID = "toyota-corolla-e170"
CIVIC_ID = "honda-civic-si-all-years"
NOW = datetime.now(timezone.utc)

# Real car photography (Unsplash CDN) — Corolla-family sedans / hatchbacks + Civic.
# Avoid picsum placeholders so the graph and community feed look like real cars.
def _u(photo_id: str, w: int = 1000, h: int = 560) -> str:
    return f"https://images.unsplash.com/{photo_id}?w={w}&h={h}&fit=crop&q=80&auto=format"


COROLLA_CAR_HERO = _u("photo-1621007947382-bb3c3994e3fb")
CIVIC_CAR_HERO = _u("photo-1606664515524-ed2f786a0bd6")

# Per-node heroes — varied real car shots (sedans, hatches, night, track vibes).
NODE_HEROES: dict[str, str] = {
    "n-root": _u("photo-1621007947382-bb3c3994e3fb"),
    "n-na": _u("photo-1549317661-bd32c8ce0db2"),
    "n-turbo": _u("photo-1552519507-da3b142c6e3d"),
    "n-built": _u("photo-1492144534655-ae79c964c9d7"),
    "n-na-quiet": _u("photo-1541899481282-d53bffe3c35d"),
    "n-turbo-3in": _u("photo-1618843479313-40f8afb4b4d8"),
    "n-built-straight": _u("photo-1503376780353-7e6692767b70"),
    "n-built-clearance": _u("photo-1583121274602-3e2820c69888"),
    "n-turbo-street": _u("photo-1617814076367-b759c7d7e738"),
    "n-built-track": _u("photo-1614162692292-7ac56d7f7f1e"),
    "n-built-gravel": _u("photo-1609521263047-f8f205293f24"),
    "n-turbo-daily": _u("photo-1617531653332-bd46c24f2068"),
    "n-track-weapon": _u("photo-1553440569-bcc63803a83d"),
    "n-gravel-rally": _u("photo-1492144534655-ae79c964c9d7"),
    "n-rally": _u("photo-1552519507-da3b142c6e3d"),
    f"{CIVIC_ID}-root": CIVIC_CAR_HERO,
}

# Community contribution media (image / sketch / video / blueprint cards).
POST_MEDIA: dict[str, str] = {
    "post-turbo-2": _u("photo-1618843479313-40f8afb4b4d8", 800, 500),
    "post-turbo-3": _u("photo-1621007947382-bb3c3994e3fb", 800, 500),
    "post-trail-2": _u("photo-1609521263047-f8f205293f24", 800, 500),
    "post-quiet-2": _u("photo-1541899481282-d53bffe3c35d", 800, 500),
    "post-rally-2": _u("photo-1552519507-da3b142c6e3d", 800, 500),
    "post-boltons-1": _u("photo-1614162692292-7ac56d7f7f1e", 800, 500),
}


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
        heroImage=NODE_HEROES.get(node_id) or _u("photo-1621007947382-bb3c3994e3fb"),
        createdBy=author,
        createdAt=ago(hours),
        isRoot=not parents,
        slot=placement.slot_for(mod_obj),
        level=placement.level_for(mod_obj),
        stats=NodeStats(forks=0, notes=0, contributors=1, heat=heat),
    ).model_dump()


# The graph is layered — each step down introduces exactly one slot, in order:
#   level 1 engine → level 2 exhaust → level 3 wheels → level 4 brakes
# A child repeats its parent's mods verbatim and adds one. That repetition is the
# invariant _validate checks, not redundancy.
TURBO = "2ZR-FE, Garrett GT2860 turbo, 8psi, front-mount intercooler"
BUILT = "Built bottom end, forged rods and pistons, GT3071R at 18psi"
NA = "Cold air intake, 4-2-1 header, ECU tune"

NODES = [
    node("n-root", "Stock Corolla", [], "Factory baseline. The trunk everything grows from.",
         "modbranch", 720, heat=1.0),

    # ---------- level 1: ENGINE ----------
    node("n-na", "Naturally Aspirated", ["n-root"],
         "Intake, header and a conservative tune. The cheapest real power.",
         "ahmed", 640, heat=0.72, engine=NA),
    node("n-turbo", "Turbo", ["n-root"],
         "GT2860 at 8psi on the stock bottom end. Daily-able.",
         "ahmed", 620, heat=0.9, engine=TURBO),
    node("n-built", "Built Block", ["n-root"],
         "Forged internals, GT3071R at 18psi. Track weapon.",
         "ahmed", 600, heat=0.85, engine=BUILT),

    # ---------- level 2: EXHAUST ----------
    node("n-na-quiet", "NA · Resonated", ["n-na"],
         "Fully resonated. Power without the drone on a long commute.",
         "abdullah", 560, heat=0.5,
         engine=NA, exhaust="Fully resonated catback, stock tips"),
    node("n-turbo-3in", "Turbo · 3in Catback", ["n-turbo"],
         "3in downpipe and catback. Loud under load, civil at cruise.",
         "ahmed", 540, heat=0.78,
         engine=TURBO, exhaust="3in downpipe, catless, 3in catback"),
    node("n-built-straight", "Built · Straight Through", ["n-built"],
         "3.5in turbo-back, no silencing. Track use only.",
         "ahmed", 520, heat=0.8,
         engine=BUILT, exhaust="3.5in turbo-back, straight through"),
    node("n-built-clearance", "Built · High Clearance", ["n-built"],
         "3.5in routed high for stage use. Survives ruts.",
         "shoaib", 500, heat=0.7,
         engine=BUILT, exhaust="3.5in high-clearance turbo-back"),

    # ---------- level 3: WHEELS ----------
    node("n-turbo-street", "Turbo · Street Wheels", ["n-turbo-3in"],
         "17in cast on a road tyre. Daily proportions.",
         "abdullah", 460, heat=0.55,
         engine=TURBO, exhaust="3in downpipe, catless, 3in catback",
         wheels="17in cast, 215/45"),
    node("n-built-track", "Built · Track Wheels", ["n-built-straight"],
         "17in forged on semi-slicks. Unsprung weight matters more than looks.",
         "ahmed", 440, heat=0.82,
         engine=BUILT, exhaust="3.5in turbo-back, straight through",
         wheels="17in lightweight forged, 235/40 semi-slick"),
    node("n-built-gravel", "Built · Gravel Wheels", ["n-built-clearance"],
         "16in steel on all-terrain. Sidewall is the whole point.",
         "kshitij", 420, heat=0.75,
         engine=BUILT, exhaust="3.5in high-clearance turbo-back",
         wheels="16in gravel-spec, 215/65 all-terrain"),

    # ---------- level 4: BRAKES ----------
    node("n-turbo-daily", "Turbo Daily", ["n-turbo-street"],
         "OEM+ pads and stainless lines. Finished street car.",
         "abdullah", 380, heat=0.6,
         engine=TURBO, exhaust="3in downpipe, catless, 3in catback",
         wheels="17in cast, 215/45", brakes="OEM+ pads, stainless lines"),
    node("n-track-weapon", "Track Weapon", ["n-built-track"],
         "4-pot front on 320mm rotors. Survives a full session.",
         "ahmed", 300, heat=0.88,
         engine=BUILT, exhaust="3.5in turbo-back, straight through",
         wheels="17in lightweight forged, 235/40 semi-slick",
         brakes="4-pot front calipers, 320mm rotors"),
    node("n-gravel-rally", "Gravel Rally", ["n-built-gravel"],
         "Rally pads and a hydraulic handbrake. Stops on loose surface.",
         "shoaib", 260, heat=0.8,
         engine=BUILT, exhaust="3.5in high-clearance turbo-back",
         wheels="16in gravel-spec, 215/65 all-terrain",
         brakes="Vented front discs, rally pads, hydraulic handbrake"),

    # ---------- THE MERGE ----------
    # Fusion of two level-4 branches. A merge is the one case that cannot sit on a
    # single layer — it draws from both, which is exactly what makes it interesting.
    node("n-rally", "Turbo Rally Build", ["n-track-weapon", "n-gravel-rally"],
         "Fusion: track brakes on gravel wheels, detuned to 14psi for reliability.",
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
    media_url = None
    if media:
        media_url = POST_MEDIA.get(post_id) or NODE_HEROES.get(node_id) or COROLLA_CAR_HERO
    return CommunityPost(
        id=post_id, nodeId=node_id, author=author,
        avatarColor=community_service._avatar_color(author),
        kind=kind, title=title, body=body,
        mediaUrl=media_url,
        durationSec=duration, transcribed=transcribed, createdAt=ago(hours),
        canvasX=x, canvasY=y, canvasW=w, canvasH=h,
    ).model_dump()


POSTS = [
    # The Corolla revving voice note.
    post("post-rev-1", "n-turbo-3in", "ahmed", "voice",
         "Corolla revving — 8psi spool",
         "Transcript: cold start, then three pulls to redline. You can hear the turbo "
         "spool come in around 3200rpm and the blow-off between shifts. No rattle on "
         "overrun, so the wastegate is holding.",
         hours=470, duration=27),
    post("post-rev-2", "n-built-straight", "ahmed", "voice",
         "Corolla revving — big turbo, 18psi",
         "Transcript: much later spool than the GT2860, nothing until about 4000rpm, "
         "then it comes in hard. Straight-through exhaust is loud enough that the "
         "intake noise disappears above 5000.",
         hours=290, duration=34),

    post("post-turbo-1", "n-turbo-3in", "shoaib", "text",
         "Boost ceiling on a stock block",
         "8psi has held up for 20k miles on mine. Everyone I know who pushed past 10 on "
         "a stock bottom end lost ringlands within a season. Not worth it — build the "
         "block first.",
         hours=460),
    post("post-turbo-2", "n-turbo-3in", "ahmed", "image",
         "Intercooler piping routing",
         "Piping runs behind the bumper support rather than through it — no cutting, and "
         "it comes out again in twenty minutes if you need to go back to stock.",
         hours=450, media=True),
    post("post-turbo-3", "n-turbo-3in", "kshitij", "sketch",
         "Downpipe clearance sketch",
         "Sketch showing where the 3in downpipe fouls the steering rack. Needs a dimple "
         "or you will feel it through the wheel at idle.",
         hours=440, media=True),

    post("post-trail-1", "n-built-gravel", "kshitij", "text",
         "Cheapest way to real sidewall",
         "215/65 on a 16in steel wheel is the cheapest way to get sidewall on this "
         "chassis. Whole setup was under $600 used, and the steels bend instead of "
         "cracking when you hit something.",
         hours=550),
    post("post-trail-2", "n-built-gravel", "shoaib", "image",
         "Spacer fitment at full lock",
         "+30mm spacers, no rubbing at full lock after rolling the front lip. Photo is "
         "at full steering deflection.",
         hours=540, media=True),

    post("post-gravel-1", "n-gravel-rally", "shoaib", "voice",
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
    post("post-quiet-2", "n-na-quiet", "abdullah", "image",
         "Tip alignment after the swap",
         "Tips sit 8mm proud of the bumper cut now. Looks intentional rather than "
         "like something fell off.",
         hours=11, media=True),
    post("post-rally-2", "n-rally", "kshitij", "video",
         "Gravel test run — second gear pulls",
         "",
         hours=3, media=True, duration=52, transcribed=False),

    post("post-quiet-1", "n-na-quiet", "abdullah", "text",
         "Resonator placement matters",
         "First catback I ran droned badly at 70mph. Moving the resonator 200mm further "
         "back killed it completely. Same pipe diameter, same muffler.",
         hours=500),

    post("post-boltons-1", "n-na", "ahmed", "blueprint",
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
        "generation": "E170", "yearStart": 2014, "yearEnd": 2019,
        "yearRange": "2014–2019", "heroImage": COROLLA_CAR_HERO, "rootNodeId": "n-root",
    }
    civic = {
        "id": CIVIC_ID, "make": "Honda", "model": "Civic Si",
        "generation": "All years", "yearStart": 1981, "yearEnd": None,
        "yearRange": "1981–present", "heroImage": CIVIC_CAR_HERO,
        "rootNodeId": f"{CIVIC_ID}-root",
    }
    civic_root = Node(
        id=f"{CIVIC_ID}-root",
        carId=CIVIC_ID,
        title="Stock Civic Si",
        parentIds=[],
        attributes=tagging.tags_for(Mods()),
        mods=Mods(),
        summary="Factory Civic Si baseline.",
        heroImage=CIVIC_CAR_HERO,
        createdBy="modbranch",
        createdAt=ago(800),
        isRoot=True,
        slot=None,
        level=0,
        stats=NodeStats(forks=0, notes=0, contributors=1, heat=1.0),
    ).model_dump()

    nodes = {n["id"]: n for n in NODES}
    nodes[civic_root["id"]] = civic_root
    posts = {p["id"]: p for p in POSTS}
    replies = {r["id"]: r for r in REPLIES}

    # Derive counts rather than hand-writing them, so stats always agree with the data.
    for p in posts.values():
        if p["nodeId"] in nodes:
            nodes[p["nodeId"]]["stats"]["notes"] += 1
    for n in nodes.values():
        for parent_id in n["parentIds"]:
            if parent_id in nodes:
                nodes[parent_id]["stats"]["forks"] += 1
        contributors = {n["createdBy"]} | {
            p["author"] for p in posts.values() if p["nodeId"] == n["id"]
        }
        n["stats"]["contributors"] = len(contributors)

    _validate(nodes, posts, replies)

    store.reset({
        "cars": {CAR_ID: car, CIVIC_ID: civic},
        "nodes": nodes,
        "posts": posts,
        "replies": replies,
    })

    merges = [n["id"] for n in nodes.values() if len(n["parentIds"]) > 1]
    voice = [p["id"] for p in posts.values() if p["kind"] == "voice"]
    print(f"Seeded {store.DB_PATH}")
    print(f"  {len(nodes)} nodes, {len(posts)} posts, {len(replies)} replies")
    print(f"  cars: {CAR_ID}, {CIVIC_ID} (with hero images)")
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

    # The layer invariant: a single-parent node adds exactly one slot to its parent and
    # repeats the rest verbatim. Merges are exempt — they draw from two branches.
    for n in nodes.values():
        if len(n["parentIds"]) != 1:
            continue
        parent = nodes[n["parentIds"][0]]
        mine = {s: v for s, v in n["mods"].items() if v.strip()}
        theirs = {s: v for s, v in parent["mods"].items() if v.strip()}
        added = set(mine) - set(theirs)
        assert len(added) == 1, (
            f"{n['id']} adds {sorted(added) or 'nothing'} to {parent['id']} — "
            "each level must introduce exactly one slot"
        )
        carried = {s: v for s, v in mine.items() if s in theirs}
        assert carried == theirs, (
            f"{n['id']} changed an inherited slot from {parent['id']}; a level may only "
            "add, not rewrite what it inherits"
        )
        assert n["slot"] == added.pop(), f"{n['id']} slot field disagrees with its mods"
        assert n["level"] == parent["level"] + 1 or n["level"] > parent["level"], (
            f"{n['id']} level {n['level']} must be deeper than parent {parent['level']}"
        )

    assert any(len(n["parentIds"]) > 1 for n in nodes.values()), "need at least one merge"
    assert any(p["kind"] == "voice" for p in posts.values()), "need a voice note"
    assert any("rev" in p["title"].lower() for p in posts.values()), "need the revving clip"

    levels = {n["level"] for n in nodes.values()}
    assert levels == {0, 1, 2, 3, 4}, f"want every layer represented, got {sorted(levels)}"


if __name__ == "__main__":
    main()
