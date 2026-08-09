from fastapi import APIRouter

from app.api import graphs

router = APIRouter()

router.include_router(graphs.router)


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
