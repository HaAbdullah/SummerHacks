"""Graph, node, community and AI routes.

Controllers only — every route resolves input, calls one service, and maps a None result
to a 404. No business logic lives here.
"""

from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException, Query

from app.models.schemas import (
    BuildModPayload,
    Car,
    CommunityPost,
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
from app.services import ai_service, community_service, graph_service, tagging

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
    """getDAG by id. Use /graph?make=&model= for the create-on-miss path."""
    car = graph_service.get_car(car_id)
    if car is None:
        raise HTTPException(404, f"No car '{car_id}'")
    return graph_service.get_or_create_graph(car.make, car.model, car.yearRange)


@router.get("/graph", response_model=Graph, tags=["graph"])
def get_or_create_graph(
    make: str = Query(..., description="e.g. Toyota"),
    model: str = Query(..., description="e.g. Corolla"),
    yearRange: str = Query("—", description="e.g. 2018–2024"),
) -> Graph:
    """getDAG. Creates the car and its stock root if this is the first visit.

    The frontend only ever calls this — there is no separate create call to forget.
    """
    return graph_service.get_or_create_graph(make, model, yearRange)


@router.get("/cars/{car_id}/stats", response_model=Stats, tags=["graph"])
def get_stats(car_id: str) -> Stats:
    stats = graph_service.get_stats(car_id)
    if stats is None:
        raise HTTPException(404, f"No car '{car_id}'")
    return stats


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
