"""Isolated Nano Banana boundary for engine schematic image generation."""

from __future__ import annotations

import asyncio
import base64

from app.core.config import settings


class SchematicGenerationError(RuntimeError):
    """Gemini did not return a usable schematic image."""


async def generate_engine_schematic(
    source_image: bytes,
    mime_type: str,
    prompt: str,
    previous_schematic: bytes | None = None,
) -> bytes:
    if not settings.gemini_api_key.strip():
        raise SchematicGenerationError("GEMINI_API_KEY is not configured.")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    contents: list = [
        types.Part.from_bytes(data=source_image, mime_type=mime_type),
    ]
    if previous_schematic:
        contents.extend(
            [
                "Previous schematic to correct:",
                types.Part.from_bytes(
                    data=previous_schematic,
                    mime_type="image/png",
                ),
            ]
        )
    contents.append(prompt)

    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.gemini_image_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(
                        aspect_ratio="16:9",
                    ),
                ),
            ),
            timeout=settings.blueprint_ai_timeout_seconds,
        )
    except TimeoutError as exc:
        raise SchematicGenerationError(
            "Engine schematic generation timed out."
        ) from exc
    except Exception as exc:
        raise SchematicGenerationError(
            "Gemini could not generate the engine schematic."
        ) from exc

    for candidate in response.candidates or []:
        if not candidate.content:
            continue
        for part in candidate.content.parts or []:
            inline_data = getattr(part, "inline_data", None)
            if inline_data is None or not inline_data.data:
                continue
            data = inline_data.data
            return base64.b64decode(data) if isinstance(data, str) else bytes(data)

    raise SchematicGenerationError(
        "Gemini completed without returning a schematic image."
    )
