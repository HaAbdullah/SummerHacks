"""Golden inspection payloads for stable hackathon demonstrations."""

from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path

from app.models.schemas import EngineAnalysisResponse

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "data" / "blueprint_demo_fixtures.json"


@lru_cache(maxsize=1)
def _fixture_data() -> dict:
    with FIXTURE_PATH.open("r", encoding="utf-8") as fixture_file:
        return json.load(fixture_file)


def for_image(image_bytes: bytes) -> EngineAnalysisResponse | None:
    """Return a verified payload only when the upload exactly matches a demo asset."""
    fingerprint = hashlib.sha256(image_bytes).hexdigest()
    data = _fixture_data()
    fixture_name = data.get("images", {}).get(fingerprint)
    if not fixture_name:
        return None
    payload = data.get("fixtures", {}).get(fixture_name)
    return EngineAnalysisResponse.model_validate(payload) if payload else None
