from fastapi import APIRouter

from app.api import graphs, vehicles
from app.core.config import settings

router = APIRouter()

router.include_router(vehicles.router)
router.include_router(graphs.router)


@router.get("/health")
def health_check() -> dict[str, str]:
    """Reports which storage backend is live, so nobody has to guess where data went."""
    return {"status": "ok", "storage": settings.storage_backend}
