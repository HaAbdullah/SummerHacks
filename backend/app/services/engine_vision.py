"""One isolated Gemini multimodal boundary for engine blueprint understanding."""

from __future__ import annotations

import base64
from typing import TypeVar

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from app.core.config import settings

StructuredResult = TypeVar("StructuredResult", bound=BaseModel)


class BlueprintConfigurationError(RuntimeError):
    """Required provider configuration is missing."""


def configured_vision_model() -> BaseChatModel:
    if not settings.gemini_api_key.strip():
        raise BlueprintConfigurationError("GEMINI_API_KEY is not configured.")

    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.gemini_vision_model,
        api_key=settings.gemini_api_key,
        temperature=0,
        timeout=settings.blueprint_ai_timeout_seconds,
        max_retries=1,
    )


async def analyze_image_structured(
    model: BaseChatModel,
    schema: type[StructuredResult],
    prompt: str,
    image_bytes: bytes,
    mime_type: str,
) -> StructuredResult:
    """Call Gemini with inline image bytes and validate its native JSON response."""
    structured_model = model.with_structured_output(
        schema=schema.model_json_schema(),
        method="json_schema",
    )
    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {
                "type": "image",
                "base64": base64.b64encode(image_bytes).decode("ascii"),
                "mime_type": mime_type,
            },
        ]
    )
    result = await structured_model.ainvoke([message])
    if isinstance(result, BaseModel):
        result = result.model_dump()
    return schema.model_validate(result)


async def analyze_images_structured(
    model: BaseChatModel,
    schema: type[StructuredResult],
    prompt: str,
    images: list[tuple[bytes, str]],
) -> StructuredResult:
    """Validate a structured Gemini response against two or more inline images."""
    structured_model = model.with_structured_output(
        schema=schema.model_json_schema(),
        method="json_schema",
    )
    content: list[dict[str, str]] = [{"type": "text", "text": prompt}]
    for index, (image_bytes, mime_type) in enumerate(images, start=1):
        content.extend(
            [
                {"type": "text", "text": f"IMAGE {index}"},
                {
                    "type": "image",
                    "base64": base64.b64encode(image_bytes).decode("ascii"),
                    "mime_type": mime_type,
                },
            ]
        )
    result = await structured_model.ainvoke([HumanMessage(content=content)])
    if isinstance(result, BaseModel):
        result = result.model_dump()
    return schema.model_validate(result)
