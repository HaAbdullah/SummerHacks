"""Graph, node, community and AI routes.

Controllers only — every route resolves input, calls one service, and maps a None result
to a 404. No business logic lives here.
"""

from __future__ import annotations

from fastapi import APIRouter, Body, File, Form, HTTPException, Query, UploadFile

from app.models.schemas import (
    BuildModPayload,
    Car,
    CommunityPost,
    CompareDraftRequest,
    CompareResponse,
    CreateNodeRequest,
    CreatePostRequest,
    CreateReplyRequest,
    Graph,
    Node,
    NodeDetail,
    Reply,
    Stats,
)
from app.services import (
    ai_service,
    community_service,
    generations,
    graph_service,
    media,
    parts,
    tagging,
)

router = APIRouter()


# --- graphs ------------------------------------------------------------------------

@router.get("/cars", response_model=list[Car], tags=["graph"])
def list_cars() -> list[Car]:
    return graph_service.list_cars()


@router.get("/cars/{car_id}", response_model=Car, tags=["graph"])
def get_car(car_id: str) -> Car:
    car = graph_service.get_car(car_id)
    if car is None:
        raise HTTPException(404, f"No car '{car_id}'")
    return car


@router.get("/cars/{car_id}/graph", response_model=Graph, tags=["graph"])
def get_graph_by_id(car_id: str) -> Graph:
    """getDAG by generation id — the id a vehicle search result carries.

    Creates the graph on first visit, so a search result is always clickable.
    """
    graph = graph_service.get_or_create_by_car_id(car_id)
    if graph is None:
        raise HTTPException(404, f"No car '{car_id}'")
    return graph


@router.get("/graph", response_model=Graph, tags=["graph"])
def get_or_create_graph(
    make: str = Query(..., description="e.g. Toyota"),
    model: str = Query(..., description="e.g. Corolla"),
    generation: str | None = Query(None, description="e.g. E210"),
    year: int | None = Query(None, ge=1981, le=2027, description="e.g. 2018"),
) -> Graph:
    """getDAG. Creates the car and its stock root if this is the first visit.

    A graph is per GENERATION, not per model — mods are generation-specific. Pass
    `generation` outright, or a `year` to resolve it. With neither, the newest generation
    is used. Prefer /cars/{carId}/graph with the id from a search result.
    """
    return graph_service.get_or_create_graph(make, model, generation, year)


@router.get("/cars/{car_id}/stats", response_model=Stats, tags=["graph"])
def get_stats(car_id: str) -> Stats:
    stats = graph_service.get_stats(car_id)
    if stats is None:
        raise HTTPException(404, f"No car '{car_id}'")
    return stats


@router.get("/cars/{car_id}/generations", tags=["graph"])
def get_generations(car_id: str) -> list[dict]:
    """Sibling generations of the same model — for a 'wrong year?' switcher."""
    car = graph_service.get_car(car_id) or generations.by_id(car_id)
    if car is None:
        raise HTTPException(404, f"No car '{car_id}'")
    make = car.make if hasattr(car, "make") else car["make"]
    model = car.model if hasattr(car, "model") else car["model"]
    return generations.for_model(make, model)


@router.get("/cars/{car_id}/parts", tags=["parts"])
def get_parts(
    car_id: str,
    slot: str | None = Query(None, description="engine | exhaust | wheels | brakes"),
    grouped: bool = Query(False, description="Group by sub-category within the slot"),
) -> dict:
    """Real parts with prices for a generation, from the parts table.

    Without `slot`, returns everything grouped by mod slot. With `slot`, returns that
    slot only — add `grouped=true` to break it down by sub-category (timing, crankshaft,
    oil, pads, muffler), which is how a build guide reads best.
    """
    if slot:
        if slot not in ("engine", "exhaust", "wheels", "brakes"):
            raise HTTPException(400, f"'{slot}' is not a mod slot")
        payload = parts.by_category(car_id, slot) if grouped else parts.for_slot(car_id, slot)
        return {"carId": car_id, "slot": slot, "parts": payload}
    return {"carId": car_id, "slots": parts.for_car(car_id)}


@router.get("/attributes", tags=["graph"])
def get_all_attributes() -> list[dict]:
    """getAttributes — the full tag vocabulary, four groups in layer order."""
    return tagging.attribute_groups()


@router.get("/cars/{car_id}/attributes", tags=["graph"])
def get_attribute_groups(car_id: str) -> list[dict]:
    """getAttributes for one car — only tags in use, with counts.

    Filtering on a tag no node carries would empty the graph, so those are omitted.
    """
    if graph_service.get_car(car_id) is None:
        raise HTTPException(404, f"No car '{car_id}'")
    return tagging.attribute_groups(graph_service.raw_nodes(car_id))


# --- nodes -------------------------------------------------------------------------

@router.get("/nodes/{node_id}", response_model=NodeDetail, tags=["nodes"])
def get_node(node_id: str) -> NodeDetail:
    node = graph_service.get_node(node_id)
    if node is None:
        raise HTTPException(404, f"No node '{node_id}'")
    return node


@router.post("/cars/{car_id}/nodes", response_model=Node, status_code=201, tags=["nodes"])
def create_node(car_id: str, req: CreateNodeRequest) -> Node:
    """createNode. Omit parentIds and the server places the build from its mods."""
    node = graph_service.create_node(car_id, req)
    if node is None:
        raise HTTPException(404, f"No car '{car_id}'")
    return node


# --- community ---------------------------------------------------------------------

@router.get("/nodes/{node_id}/posts", response_model=list[CommunityPost], tags=["community"])
def get_posts(node_id: str) -> list[CommunityPost]:
    if graph_service.get_node(node_id) is None:
        raise HTTPException(404, f"No node '{node_id}'")
    return community_service.posts_for(node_id)


@router.post(
    "/nodes/{node_id}/posts",
    response_model=CommunityPost,
    status_code=201,
    tags=["community"],
)
def create_post(node_id: str, req: CreatePostRequest) -> CommunityPost:
    """Media is converted to text on the way in — see services/transcription.py."""
    post = community_service.create_post(node_id, req)
    if post is None:
        raise HTTPException(404, f"No node '{node_id}'")
    return post


@router.post("/nodes/{node_id}/posts/upload-url", tags=["community"])
def create_upload_url(
    node_id: str,
    filename: str = Body(..., embed=True, description="e.g. engine-bay.jpg"),
) -> dict:
    """Get a URL the browser uploads the file to directly.

    Use this on serverless hosts, where the request body is capped around 4.5MB and a
    voice clip or video would be rejected before reaching the API.

        1. POST here with the filename        -> { uploadUrl, mediaUrl, storagePath }
        2. PUT the file to `uploadUrl`
        3. POST /nodes/{id}/posts with `mediaUrl` and `storagePath`

    On a long-running host you can skip all this and POST the file to /posts/upload.
    """
    if graph_service.get_node(node_id) is None:
        raise HTTPException(404, f"No node '{node_id}'")
    try:
        return media.signed_upload(node_id, filename)
    except media.UploadError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post(
    "/nodes/{node_id}/posts/upload",
    response_model=CommunityPost,
    status_code=201,
    tags=["community"],
)
async def upload_post(
    node_id: str,
    file: UploadFile = File(..., description="Photo, sketch, voice clip or video"),
    kind: str = Form(..., description="image | sketch | voice | video | blueprint"),
    title: str = Form(...),
    body: str = Form(""),
    author: str = Form("Anonymous"),
    durationSec: int | None = Form(None),
) -> CommunityPost:
    """Upload a real file — the physical-input path.

    Multipart rather than JSON, because the browser sends the file itself. The file goes
    to Supabase Storage (or local disk when Supabase is not configured) and the post
    stores only its URL.
    """
    if graph_service.get_node(node_id) is None:
        raise HTTPException(404, f"No node '{node_id}'")

    data = await file.read()
    try:
        media.validate(file.filename or "", len(data))
        stored = media.store(node_id, file.filename or "upload", data)
    except media.UploadError as exc:
        raise HTTPException(400, str(exc)) from exc

    post = community_service.create_post(
        node_id,
        CreatePostRequest(
            kind=kind,
            title=title,
            body=body,
            mediaUrl=stored["url"],
            storagePath=stored["storagePath"],
            durationSec=durationSec,
            author=author,
        ),
    )
    if post is None:
        raise HTTPException(404, f"No node '{node_id}'")
    return post


@router.get("/posts/{post_id}", response_model=CommunityPost, tags=["community"])
def get_post(post_id: str) -> CommunityPost:
    post = community_service.get_post(post_id)
    if post is None:
        raise HTTPException(404, f"No post '{post_id}'")
    return post


@router.patch("/posts/{post_id}/position", response_model=CommunityPost, tags=["community"])
def move_post(
    post_id: str,
    canvasX: float = Body(...),
    canvasY: float = Body(...),
    canvasW: float | None = Body(None),
    canvasH: float | None = Body(None),
) -> CommunityPost:
    post = community_service.move_post(post_id, canvasX, canvasY, canvasW, canvasH)
    if post is None:
        raise HTTPException(404, f"No post '{post_id}'")
    return post


@router.get("/posts/{post_id}/replies", response_model=list[Reply], tags=["community"])
def get_replies(post_id: str) -> list[Reply]:
    if community_service.get_post(post_id) is None:
        raise HTTPException(404, f"No post '{post_id}'")
    return community_service.replies_for(post_id)


@router.post(
    "/posts/{post_id}/replies", response_model=Reply, status_code=201, tags=["community"]
)
def create_reply(post_id: str, req: CreateReplyRequest) -> Reply:
    reply = community_service.create_reply(post_id, req)
    if reply is None:
        raise HTTPException(404, f"No post '{post_id}'")
    return reply


# --- AI (Ahmed) --------------------------------------------------------------------

@router.get("/ai/build-mod/{node_id}", response_model=BuildModPayload, tags=["ai"])
def get_build_mod(node_id: str) -> BuildModPayload:
    """getBuildModAI. Node + lineage + community text, ready for guide generation."""
    payload = ai_service.build_payload(node_id)
    if payload is None:
        raise HTTPException(404, f"No node '{node_id}'")
    return payload


@router.post("/ai/compare", response_model=CompareResponse, tags=["ai"])
def compare_draft(req: CompareDraftRequest) -> CompareResponse:
    """Diff an unsaved build — what the vision model just extracted from a photo.

    Same response shape as the GET, so one renderer handles both. `toNodeId` is empty
    because the build does not exist yet. Omit `fromNodeId` to diff against stock.
    """
    result = ai_service.compare_draft(req.fromNodeId, req.mods, req.title)
    if result is None:
        raise HTTPException(404, f"No node '{req.fromNodeId}'")
    return result


@router.get("/ai/compare", response_model=CompareResponse, tags=["ai"])
def compare_nodes(
    from_node: str = Query(..., alias="from"),
    to_node: str = Query(..., alias="to"),
) -> CompareResponse:
    """getCompareNode. Deterministic per-slot diff; no model involved."""
    result = ai_service.compare(from_node, to_node)
    if result is None:
        raise HTTPException(404, "One or both nodes not found")
    return result
