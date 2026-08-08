from fastapi import APIRouter

from app.api import vehicles

router = APIRouter()

router.include_router(vehicles.router)


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
