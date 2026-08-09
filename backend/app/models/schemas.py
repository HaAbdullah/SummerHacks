"""Every JSON contract in one place — the M in MVC.

Three structures, in the order they nest:

  Graph (DAG)   one per car. Holds nodes; edges are derived from node.parentIds.
  Node          one build. Four mod slots, plus its community posts.
  Post          one community contribution. Media is converted to text on upload.

The mod set is closed at four: engine, exhaust, wheels, brakes. Nothing else. A closed
set makes the diff total, gives the AI a strict target, and lets placement compare builds
without guessing what a field means.

Node responses carry two views of those same four slots:
  `mods`        the structured slots        — for Ahmed's AI, the diff, and placement
  `attributes`  flat string[] of tag ids    — what the frontend filter panel reads
`attributes` is DERIVED from `mods` on write (see services/tagging.py). It is not a
second vocabulary — every tag traces back to one of the four slots.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

MOD_SLOTS = ("engine", "exhaust", "wheels", "brakes")

PostKind = Literal["text", "image", "sketch", "voice", "video", "blueprint"]


class Mods(BaseModel):
    """The four mod slots. Empty string means stock / unspecified."""

    engine: str = ""
    exhaust: str = ""
    wheels: str = ""
    brakes: str = ""

    def filled(self) -> dict[str, str]:
        """Only the slots that actually carry a mod."""
        return {
            slot: getattr(self, slot).strip()
            for slot in MOD_SLOTS
            if getattr(self, slot).strip()
        }

    def count(self) -> int:
        return len(self.filled())


# --- community ---------------------------------------------------------------------

class Reply(BaseModel):
    id: str
    postId: str
    author: str
    avatarColor: str = "#d5001c"
    body: str
    createdAt: str


class CommunityPost(BaseModel):
    """One contribution on a node.

    `kind` is what the user uploaded. `body` is always text — images, sketches and voice
    notes are transcribed on upload so search and the AI only ever handle text.
    `transcribed` is False while that conversion is pending, so the frontend can show a
    processing state instead of an empty card.
    """

    id: str
    nodeId: str
    author: str
    avatarColor: str = "#d5001c"
    kind: PostKind
    title: str
    body: str = ""
    mediaUrl: str | None = None
    durationSec: int | None = None
    transcribed: bool = True
    createdAt: str
    # Freeform position on the node canvas.
    canvasX: float | None = None
    canvasY: float | None = None
    canvasW: float | None = None
    canvasH: float | None = None
    replyCount: int = 0


# --- graph -------------------------------------------------------------------------

class NodeStats(BaseModel):
    forks: int = 0
    notes: int = 0
    contributors: int = 1
    heat: float = 0.4


class Node(BaseModel):
    """Matches the frontend's BuildNodeData, plus `mods` and `summary`→description."""

    id: str
    carId: str
    title: str
    parentIds: list[str] = Field(default_factory=list)
    attributes: list[str] = Field(default_factory=list)
    mods: Mods = Field(default_factory=Mods)
    summary: str = ""
    heroImage: str | None = None
    stats: NodeStats = Field(default_factory=NodeStats)
    createdBy: str
    createdAt: str
    isRoot: bool = False
    # Which mod slot this node introduces, and its layer. The graph is layered so each
    # step down changes exactly one slot: engine (1), exhaust (2), wheels (3), brakes
    # (4). Root is slot=None, level=0.
    slot: str | None = None
    level: int = 0


class Car(BaseModel):
    """A build graph's root subject: one GENERATION of a model, not the model itself.

    Mods are generation-specific, so "Toyota Corolla" is too coarse to hang builds off.
    `id` is the generation slug returned by vehicle search.
    """

    id: str
    make: str
    model: str
    generation: str = "All years"
    yearStart: int | None = None
    yearEnd: int | None = None
    yearRange: str = "—"
    heroImage: str | None = None
    rootNodeId: str = ""


class Graph(BaseModel):
    """Flat node list. Edges are derived from parentIds.

    Deliberately not nested: a merged build has two parents and would have to appear
    twice in any `children` tree. A flat list is the only shape that survives merges.
    """

    car: Car
    nodes: list[Node]


class Edge(BaseModel):
    from_: str = Field(alias="from")
    to: str

    model_config = {"populate_by_name": True}


class NodeDetail(Node):
    childIds: list[str] = Field(default_factory=list)
    posts: list[CommunityPost] = Field(default_factory=list)


# --- requests ----------------------------------------------------------------------

class EnsureGraphRequest(BaseModel):
    """createDAG input. The frontend never calls this directly — getDAG creates on miss."""

    make: str
    model: str
    yearRange: str = "—"


class CreateNodeRequest(BaseModel):
    title: str
    mods: Mods = Field(default_factory=Mods)
    summary: str = ""
    heroImage: str | None = None
    attributes: list[str] = Field(default_factory=list)
    createdBy: str = "Anonymous"
    # Omit and the server places the build itself from its mods.
    parentIds: list[str] | None = None


class CreatePostRequest(BaseModel):
    kind: PostKind
    title: str
    body: str = ""
    mediaUrl: str | None = None
    durationSec: int | None = None
    author: str = "Anonymous"
    canvasX: float | None = None
    canvasY: float | None = None
    canvasW: float | None = None
    canvasH: float | None = None


class CreateReplyRequest(BaseModel):
    body: str
    author: str = "Anonymous"


# --- stats -------------------------------------------------------------------------

class Stats(BaseModel):
    """Real counts, computed from the stored nodes and posts. Nothing invented."""

    carId: str
    builds: int              # node count, root included
    mods: int                # filled mod slots across every node
    contributors: int        # distinct people across nodes, posts and replies
    active24h: int           # distinct people who did anything in the last 24h
    posts: int
    replies: int
    merges: int              # nodes with more than one parent
    modsBySlot: dict[str, int]
    postsByKind: dict[str, int]
    deepestChain: int
    hottestNodeId: str = ""


# --- AI (Ahmed) --------------------------------------------------------------------

class ModChange(BaseModel):
    slot: str
    status: Literal["added", "removed", "modified", "unchanged"]
    before: str
    after: str


class CompareResponse(BaseModel):
    """Deterministic diff, computed in Python — never by a model.

    Ahmed's layer consumes `changes` and fills `explanation`. Keeping the maths separate
    means the diff is testable without an API key, cannot invent a change that did not
    happen, and still renders if the AI call fails.
    """

    carId: str
    fromNodeId: str
    toNodeId: str
    fromTitle: str
    toTitle: str
    changes: list[ModChange]
    changedCount: int
    commonAncestorId: str | None = None
    explanation: str | None = None


class BuildModPayload(BaseModel):
    """Everything Ahmed's workflow needs to generate a build guide, in one call."""

    nodeId: str
    carId: str
    car: Car
    title: str
    summary: str
    mods: Mods
    attributes: list[str]
    lineage: list[Node]            # root → this node
    communityText: list[str]       # every post body, already transcribed
    modCount: int
    postCount: int
