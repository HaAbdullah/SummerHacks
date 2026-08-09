from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import settings
from app.repositories.store import ReadOnlyStorage
from app.services import media, vehicles


@asynccontextmanager
async def lifespan(app: FastAPI):
    # vPIC's make list is 610KB and slow; load it once here, not per request.
    await vehicles.warm_cache()
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.api_prefix)

# Committed demo audio — the real exhaust recordings on the seeded voice notes. Always
# mounted, unlike /media: these ship with the repo rather than being uploaded, so they
# have to work on a read-only deploy with no Supabase.
if media.AUDIO_DIR.exists():
    app.mount("/audio", StaticFiles(directory=media.AUDIO_DIR), name="audio")

# Serves uploads when Supabase Storage is not configured. With Supabase the URLs point at
# the bucket instead and this mount is never hit.
if not settings.use_supabase:
    media.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=media.UPLOAD_DIR), name="media")


@app.exception_handler(ReadOnlyStorage)
async def _read_only(request, exc: ReadOnlyStorage):
    """A write against a read-only filesystem is a config problem, not a server fault."""
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.get("/")
def root() -> dict[str, str]:
    return {"message": f"Welcome to {settings.app_name}"}
