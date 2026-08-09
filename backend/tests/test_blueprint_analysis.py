"""Engine-image detection and high-confidence component analysis checkpoint."""

from __future__ import annotations

import asyncio
import base64
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import settings
from app.main import app
from app.models.schemas import BoundingBox, EngineAnalysisResponse
from app.services import blueprint_workflow


class FakeStructuredModel:
    def __init__(self, parent: "FakeVisionModel") -> None:
        self.parent = parent

    async def ainvoke(self, messages):
        self.parent.messages.append(messages)
        return self.parent.responses.pop(0)


class FakeVisionModel:
    def __init__(self, responses: list[dict]) -> None:
        self.responses = responses
        self.messages: list = []
        self.schemas: list[dict] = []

    def with_structured_output(self, *, schema, method):
        assert method == "json_schema"
        self.schemas.append(schema)
        return FakeStructuredModel(self)


CONTEXT = {
    "image_type": "ENGINE_BAY",
    "engine_detected": True,
    "engine_bbox": {"x1": 0.1, "y1": 0.2, "x2": 0.9, "y2": 0.88},
    "confidence": 0.96,
}

ANALYSIS = {
    "image_type": "ENGINE_BAY",
    "engine_description": "Transverse inline engine installed in an engine bay.",
    "engine_type": "inline four-cylinder layout",
    "components": [
        {
            "id": "component_01",
            "name": "valve cover",
            "category": "engine_top",
            "confidence": 0.94,
            "description": "Large cover centered over the cylinder head.",
            "bbox": {"x1": 0.35, "y1": 0.31, "x2": 0.67, "y2": 0.52},
            "possible_modification": False,
        },
        {
            "id": "component_02",
            "name": "possible hose",
            "category": "cooling",
            "confidence": 0.61,
            "description": "Partially obscured hose-like object.",
            "bbox": {"x1": 0.65, "y1": 0.46, "x2": 0.8, "y2": 0.61},
            "possible_modification": False,
        },
    ],
    "observations": ["The engine is partially obscured by surrounding bodywork."],
}

# Valid 1x1 PNG, used only to exercise multipart payload validation in route tests.
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUB"
    "AScY42YAAAAASUVORK5CYII="
)


def test_bounding_box_rejects_reversed_coordinates():
    with pytest.raises(ValidationError):
        BoundingBox(x1=0.8, y1=0.1, x2=0.2, y2=0.9)


def test_analysis_graph_filters_low_confidence_components(monkeypatch):
    monkeypatch.setattr(settings, "blueprint_component_confidence_threshold", 0.8)
    model = FakeVisionModel([CONTEXT, ANALYSIS])

    result = asyncio.run(
        blueprint_workflow.analyze_engine_image(b"image", "image/jpeg", model=model)
    )

    assert result.image_context.image_type == "ENGINE_BAY"
    assert [component.name for component in result.analysis.components] == [
        "valve cover"
    ]
    assert result.component_confidence_threshold == 0.8
    assert len(model.messages) == 2
    image_block = model.messages[0][0].content[1]
    assert image_block["mime_type"] == "image/jpeg"
    assert base64.b64decode(image_block["base64"]) == b"image"


def test_honda_turbo_demo_fixture_keeps_inspection_details_without_model_call():
    demo_path = (
        Path(__file__).resolve().parents[2]
        / "frontend"
        / "public"
        / "blueprints"
        / "honda-turbo-engine.png"
    )
    model = FakeVisionModel([])

    result = asyncio.run(
        blueprint_workflow.analyze_engine_image(
            demo_path.read_bytes(),
            "image/png",
            model=model,
        )
    )

    assert result.analysis.engine_type == "Turbocharged Inline-4"
    assert len(result.analysis.components) == 9
    assert sum(component.possible_modification for component in result.analysis.components) == 4
    assert model.messages == []


def test_invalid_image_context_stops_before_component_analysis():
    model = FakeVisionModel(
        [
            {
                "image_type": "INVALID",
                "engine_detected": False,
                "engine_bbox": None,
                "confidence": 0.18,
            }
        ]
    )

    with pytest.raises(blueprint_workflow.BlueprintInputError, match="No automotive"):
        asyncio.run(
            blueprint_workflow.analyze_engine_image(
                b"not-an-engine", "image/png", model=model
            )
        )

    assert len(model.messages) == 1


def test_analysis_endpoint_returns_structured_checkpoint(monkeypatch):
    expected = EngineAnalysisResponse(
        image_context=CONTEXT,
        analysis={**ANALYSIS, "components": ANALYSIS["components"][:1]},
        component_confidence_threshold=0.8,
    )

    async def fake_analysis(_data: bytes, _mime_type: str):
        return expected

    monkeypatch.setattr(blueprint_workflow, "analyze_engine_image", fake_analysis)
    response = TestClient(app).post(
        "/api/blueprints/engine/analyze",
        files={"image": ("engine.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["image_context"]["image_type"] == "ENGINE_BAY"
    assert payload["analysis"]["components"][0]["name"] == "valve cover"


def test_analysis_endpoint_rejects_non_image_before_model_call():
    response = TestClient(app).post(
        "/api/blueprints/engine/analyze",
        files={"image": ("notes.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 422
    assert "supported file type" in response.json()["detail"]


def test_generation_retries_once_and_returns_blueprint_jpeg():
    analysis = EngineAnalysisResponse(
        image_context=CONTEXT,
        analysis={**ANALYSIS, "components": ANALYSIS["components"][:1]},
        component_confidence_threshold=0.8,
    )
    invalid_validation = {
        "valid": False,
        "overall_score": 0.62,
        "geometry_score": 0.64,
        "component_score": 0.6,
        "major_missing_components": ["valve cover"],
        "obvious_hallucinations": [],
        "correction_instructions": ["Restore the valve cover geometry."],
    }
    valid_validation = {
        "valid": True,
        "overall_score": 0.9,
        "geometry_score": 0.91,
        "component_score": 0.89,
        "major_missing_components": [],
        "obvious_hallucinations": [],
        "correction_instructions": [],
    }
    model = FakeVisionModel([invalid_validation, valid_validation])
    generator_calls: list[bytes | None] = []

    async def fake_generator(
        _source: bytes,
        _mime_type: str,
        _prompt: str,
        previous: bytes | None,
    ) -> bytes:
        generator_calls.append(previous)
        return PNG_BYTES

    result = asyncio.run(
        blueprint_workflow.create_engine_blueprint(
            PNG_BYTES,
            "image/png",
            analysis_response=analysis,
            vision_model=model,
            schematic_generator=fake_generator,
        )
    )

    assert result.startswith(b"\xff\xd8\xff")
    assert len(generator_calls) == 2
    assert generator_calls == [None, PNG_BYTES]
    assert len(model.messages) == 2


def test_render_endpoint_returns_downloadable_jpeg(monkeypatch):
    analysis = EngineAnalysisResponse(
        image_context=CONTEXT,
        analysis={**ANALYSIS, "components": ANALYSIS["components"][:1]},
        component_confidence_threshold=0.8,
    )
    expected_jpeg = b"\xff\xd8\xfftest-jpeg"

    async def fake_blueprint(
        _data: bytes,
        _mime_type: str,
        analysis_response: EngineAnalysisResponse,
    ) -> bytes:
        assert analysis_response == analysis
        return expected_jpeg

    monkeypatch.setattr(blueprint_workflow, "create_engine_blueprint", fake_blueprint)
    response = TestClient(app).post(
        "/api/blueprints/engine/render",
        files={"image": ("engine.png", PNG_BYTES, "image/png")},
        data={"analysis_json": analysis.model_dump_json()},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert "engine-blueprint.jpg" in response.headers["content-disposition"]
    assert response.content == expected_jpeg
