"""Engine-image blueprint routes."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from pydantic import ValidationError
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.models.schemas import EngineAnalysisResponse
from app.services import blueprint_workflow, engine_vision, media

router = APIRouter(prefix="/blueprints", tags=["blueprints"])

SUPPORTED_ENGINE_IMAGES = {
    ".jpg": ("JPEG", "image/jpeg"),
    ".jpeg": ("JPEG", "image/jpeg"),
    ".png": ("PNG", "image/png"),
    ".webp": ("WEBP", "image/webp"),
}


def validate_engine_image(filename: str, data: bytes) -> str:
    """Validate the actual raster payload and return its trusted MIME type."""
    try:
        suffix = media.validate(filename, len(data))
    except media.UploadError as exc:
        raise blueprint_workflow.BlueprintInputError(str(exc)) from exc

    if not data:
        raise blueprint_workflow.BlueprintInputError("The uploaded image is empty.")
    if len(data) > settings.blueprint_max_image_bytes:
        limit_mb = settings.blueprint_max_image_bytes // 1024 // 1024
        raise blueprint_workflow.BlueprintInputError(
            f"Engine images must be {limit_mb}MB or smaller."
        )
    if suffix not in SUPPORTED_ENGINE_IMAGES:
        raise blueprint_workflow.BlueprintInputError(
            "Engine analysis accepts JPEG, PNG, or WebP images."
        )

    expected_format, mime_type = SUPPORTED_ENGINE_IMAGES[suffix]
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format != expected_format:
                raise blueprint_workflow.BlueprintInputError(
                    "The image contents do not match the filename extension."
                )
            if image.width * image.height > settings.blueprint_max_image_pixels:
                raise blueprint_workflow.BlueprintInputError(
                    "The image dimensions are too large for engine analysis."
                )
            image.verify()
    except blueprint_workflow.BlueprintInputError:
        raise
    except (Image.DecompressionBombError, UnidentifiedImageError, OSError) as exc:
        raise blueprint_workflow.BlueprintInputError(
            "The upload is not a readable JPEG, PNG, or WebP image."
        ) from exc
    return mime_type


@router.post(
    "/engine/analyze",
    response_model=EngineAnalysisResponse,
    summary="Inspect an engine image and return high-confidence component JSON",
)
async def analyze_engine_blueprint(
    image: UploadFile = File(..., description="JPEG, PNG, or WebP engine image"),
) -> EngineAnalysisResponse:
    data = await image.read()
    try:
        mime_type = validate_engine_image(image.filename or Path("upload").name, data)
        return await blueprint_workflow.analyze_engine_image(data, mime_type)
    except blueprint_workflow.BlueprintInputError as exc:
        raise HTTPException(422, str(exc)) from exc
    except engine_vision.BlueprintConfigurationError as exc:
        raise HTTPException(503, str(exc)) from exc
    except blueprint_workflow.BlueprintWorkflowError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.post(
    "/engine/render",
    response_class=Response,
    responses={200: {"content": {"image/jpeg": {}}}},
    summary="Generate a downloadable blueprint JPEG from an analyzed engine image",
)
async def render_engine_blueprint(
    image: UploadFile = File(..., description="Original JPEG, PNG, or WebP engine image"),
    analysis_json: str = Form(..., description="Validated EngineAnalysisResponse JSON"),
) -> Response:
    data = await image.read()
    try:
        mime_type = validate_engine_image(image.filename or Path("upload").name, data)
        analysis = EngineAnalysisResponse.model_validate_json(analysis_json)
        jpeg = await blueprint_workflow.create_engine_blueprint(
            data,
            mime_type,
            analysis_response=analysis,
        )
        return Response(
            content=jpeg,
            media_type="image/jpeg",
            headers={
                "Content-Disposition": 'attachment; filename="engine-blueprint.jpg"',
                "Cache-Control": "no-store",
            },
        )
    except ValidationError as exc:
        raise HTTPException(422, "The engine analysis payload is invalid.") from exc
    except blueprint_workflow.BlueprintInputError as exc:
        raise HTTPException(422, str(exc)) from exc
    except engine_vision.BlueprintConfigurationError as exc:
        raise HTTPException(503, str(exc)) from exc
    except blueprint_workflow.BlueprintWorkflowError as exc:
        raise HTTPException(502, str(exc)) from exc
