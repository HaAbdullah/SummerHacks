"""The search bar endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services import vehicles

router = APIRouter(tags=["vehicles"])


@router.get("/vehicles/search", summary="Free-text vehicle search")
async def search(
    q: str = Query("", description="Anything the user typed, e.g. '2018 toyota corolla'"),
    limit: int = Query(8, ge=1, le=25),
) -> dict:
    """One call per keystroke. Returns results ready to render in a dropdown.

    `year` is null when the user did not type one — ask for it rather than defaulting,
    since car mods differ sharply between model years.
    """
    return {"query": q, "results": await vehicles.search(q, limit=limit)}


@router.get("/vehicles/cache", summary="vPIC cache status (debug)")
async def cache_status() -> dict:
    return vehicles.cache_status()
