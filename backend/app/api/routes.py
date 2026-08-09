from fastapi import APIRouter

from app.api import graphs, vehicles

router = APIRouter()

router.include_router(vehicles.router)
router.include_router(graphs.router)


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
