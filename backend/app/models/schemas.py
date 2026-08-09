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

from pydantic import BaseModel, Field, computed_field

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

    @computed_field  # type: ignore[prop-decorator]
    @property
    def noteId(self) -> str:
        """Alias of postId — the frontend calls a community post a "note"."""
        return self.postId


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
    # Path inside the storage bucket. Kept so a file can be found or removed later —
    # mediaUrl alone is not enough once it is a signed or CDN URL.
    storagePath: str | None = None
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
    storagePath: str | None = None
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
    active24h: int           # distinct PEOPLE who did anything in the last 24h
    contributions24h: int    # distinct ACTIONS in the last 24h — not the same number
    posts: int
    replies: int
    merges: int              # nodes with more than one parent
    modsBySlot: dict[str, int]
    postsByKind: dict[str, int]
    deepestChain: int
    hottestNodeId: str = ""

    @computed_field  # type: ignore[prop-decorator]
    @property
    def totalNodes(self) -> int:
        """Alias of builds — what the frontend's pulse strip reads."""
        return self.builds


# --- AI ----------------------------------------------------------------------------
CompareOperation = Literal["add", "remove", "replace", "unchanged"]
CompareMutation = Literal["add", "remove", "replace"]


class CompareNodeMods(BaseModel):
    """Nullable mod slots used only by the comparison workflow.

    The core graph's ``Mods`` model intentionally continues using empty strings. This
    separate API model accepts the normalized representation without changing graph,
    placement, filtering, or blueprint behavior.
    """

    engine: str | None = None
    exhaust: str | None = None
    wheels: str | None = None
    brakes: str | None = None


class CompareNode(BaseModel):
    """Complete node supplied to POST /ai/compare; no database lookup is needed."""

    id: str
    car_id: str
    title: str
    parent_ids: list[str] = Field(default_factory=list)
    attributes: list[str] = Field(default_factory=list)
    mods: CompareNodeMods = Field(default_factory=CompareNodeMods)
    summary: str = ""
    hero_image: str | None = None
    stats: NodeStats = Field(default_factory=NodeStats)
    created_by: str
    created_at: str
    is_root: bool = False
    slot: str | None = None
    level: int = 0


class CompareRequest(BaseModel):
    node_a: CompareNode
    node_b: CompareNode


class CompareChange(BaseModel):
    mod_key: Literal["engine", "exhaust", "wheels", "brakes"]
    current: str | None
    target: str | None
    operation: CompareOperation


class CompareOperationResult(BaseModel):
    operation: CompareMutation
    mod_key: Literal["engine", "exhaust", "wheels", "brakes"]
    added: str | None = None
    removed: str | None = None


class ComparePricing(BaseModel):
    new_parts_cost: float
    removed_parts_value: float
    build_value_difference: float
    pricing_complete: bool
    unresolved_added_parts: list[str] = Field(default_factory=list)
    unresolved_removed_parts: list[str] = Field(default_factory=list)


class CompareResult(BaseModel):
    base_node_id: str
    target_node_id: str
    car_id: str
    changes: list[CompareChange]
    operations: list[CompareOperationResult]
    pricing: ComparePricing
    resulting_mods: CompareNodeMods
    matches_target: bool


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
    # Real parts with real prices for this generation's filled slots, so a build guide
    # can quote a catalogue instead of inventing part numbers. `parts.curated` is False
    # when nobody has curated parts for this car yet.
    parts: dict = Field(default_factory=dict)
