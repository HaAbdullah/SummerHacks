"""Node A to Node B build-guide context, grounding, and API behavior."""

from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.repositories import store
from app.services import build_guide, community_evidence


def put_node(
    node_id: str,
    *,
    car_id: str = "test-car",
    engine: str = "",
    exhaust: str = "",
    wheels: str = "",
    brakes: str = "",
) -> None:
    store.put(
        "nodes",
        node_id,
        {
            "id": node_id,
            "carId": car_id,
            "title": node_id,
            "parentIds": [],
            "attributes": [],
            "mods": {
                "engine": engine,
                "exhaust": exhaust,
                "wheels": wheels,
                "brakes": brakes,
            },
            "summary": f"Summary for {node_id}",
            "heroImage": None,
            "stats": {"forks": 0, "notes": 0, "contributors": 1, "heat": 0.4},
            "createdBy": "test",
            "createdAt": "2026-01-01T00:00:00Z",
            "isRoot": not any((engine, exhaust, wheels, brakes)),
            "slot": None,
            "level": 0,
        },
    )


def put_post(
    post_id: str,
    node_id: str,
    *,
    kind: str = "text",
    body: str = "Install the downpipe before routing charge piping.",
    transcribed: bool = True,
) -> None:
    store.put(
        "posts",
        post_id,
        {
            "id": post_id,
            "nodeId": node_id,
            "author": "builder",
            "avatarColor": "#123456",
            "kind": kind,
            "title": kind,
            "body": body,
            "mediaUrl": f"https://example.com/{post_id}.jpg" if kind != "text" else None,
            "storagePath": None,
            "durationSec": None,
            "transcribed": transcribed,
            "createdAt": "2026-01-02T00:00:00Z",
            "canvasX": 0,
            "canvasY": 0,
            "canvasW": 280,
            "canvasH": 180,
        },
    )


def put_reply(reply_id: str, post_id: str) -> None:
    store.put(
        "replies",
        reply_id,
        {
            "id": reply_id,
            "postId": post_id,
            "author": "helper",
            "avatarColor": "#654321",
            "body": "Leave clearance around the coolant reservoir.",
            "createdAt": "2026-01-03T00:00:00Z",
        },
    )


class FakeStructuredModel:
    def __init__(self, payload: dict):
        self.payload = payload
        self.messages = None

    async def ainvoke(self, messages):
        self.messages = messages
        return self.payload


class FakeModel:
    def __init__(self, payload: dict):
        self.runner = FakeStructuredModel(payload)
        self.schema = None

    def with_structured_output(self, *, schema, method):
        assert method == "json_schema"
        self.schema = schema
        return self.runner


def guide_payload() -> dict:
    return {
        "node_a_id": "invented-a",
        "node_b_id": "invented-b",
        "title": "Turbo conversion",
        "summary": "Sequence the documented target changes.",
        "required_changes": [
            {
                "name": "Invented supercharger",
                "category": "engine",
                "action": "add",
                "replaces": None,
            }
        ],
        "stages": [
            {
                "order": 8,
                "title": "Installation",
                "components": ["Turbo kit"],
                "steps": [
                    {
                        "instruction": "Install the documented target hardware.",
                        "details": None,
                        "evidence_ids": ["post-1", "invented-evidence"],
                        "warnings": [],
                    }
                ],
            }
        ],
        "community_tips": [
            {"text": "Preserve clearance.", "evidence_ids": ["reply-1"]},
            {"text": "Unsupported tip.", "evidence_ids": ["made-up"]},
        ],
        "dependencies": ["Tune after hardware installation."],
        "warnings": ["Use professional verification for ECU calibration."],
        "unknowns": [{"description": "Exact calibration is not documented."}],
    }


def test_context_retrieves_nodes_and_reuses_deterministic_diff():
    put_node("node-a", exhaust="OEM exhaust")
    put_node("node-b", engine="Turbo kit", exhaust="3 inch exhaust")
    put_post("post-1", "node-b")
    put_reply("reply-1", "post-1")

    context = build_guide.build_context("node-a", "node-b")

    assert [change.operation for change in context.comparison] == [
        "add",
        "replace",
        "unchanged",
        "unchanged",
    ]
    assert {item.id for item in context.community_context} == {"post-1", "reply-1"}
    assert context.community_context[0].text


def test_untranscribed_placeholder_is_not_model_evidence():
    put_node("node-b")
    put_post(
        "voice-1",
        "node-b",
        kind="voice",
        body="[Voice note pending transcription: clip]",
        transcribed=False,
    )

    evidence = community_evidence.for_node("node-b")

    assert evidence[0].type == "voice"
    assert evidence[0].text is None
    assert evidence[0].source_url


def test_visual_observations_use_one_confidence_threshold(monkeypatch):
    monkeypatch.setattr(settings, "build_guide_evidence_confidence_threshold", 0.8)
    accepted = community_evidence.filter_observations(
        [
            {
                "subject": "pipe",
                "relationship": "routes_around",
                "object": "reservoir",
                "confidence": 0.9,
            },
            {
                "subject": "bracket",
                "relationship": "near",
                "object": "radiator",
                "confidence": 0.6,
            },
        ]
    )

    assert [item.subject for item in accepted] == ["pipe"]


def test_model_output_is_grounded_to_nodes_changes_and_real_evidence():
    put_node("node-a", exhaust="OEM exhaust")
    put_node("node-b", engine="Turbo kit", exhaust="3 inch exhaust")
    put_post("post-1", "node-b")
    put_reply("reply-1", "post-1")
    model = FakeModel(guide_payload())

    result = asyncio.run(
        build_guide.create_build_guide("node-a", "node-b", model=model)
    )

    assert result.node_a_id == "node-a"
    assert result.node_b_id == "node-b"
    assert [part.name for part in result.required_changes] == [
        "Turbo kit",
        "3 inch exhaust",
    ]
    assert result.required_changes[1].replaces == "OEM exhaust"
    assert result.stages[0].order == 1
    assert result.stages[0].steps[0].evidence_ids == ["post-1"]
    assert [tip.text for tip in result.community_tips] == ["Preserve clearance."]
    assert model.schema["title"] == "TransitionBuildGuide"
    assert "community_context" in model.runner.messages[1].content


def test_context_rejects_missing_and_cross_car_nodes():
    put_node("node-a", car_id="car-a")
    put_node("node-b", car_id="car-b")

    try:
        build_guide.build_context("missing", "node-b")
        assert False, "missing node should fail"
    except LookupError:
        pass

    try:
        build_guide.build_context("node-a", "node-b")
        assert False, "cross-car guide should fail"
    except ValueError as exc:
        assert "same car" in str(exc)


def test_endpoint_accepts_ids_only_and_reports_missing_model(monkeypatch):
    put_node("node-a")
    put_node("node-b", engine="Turbo kit")
    monkeypatch.setattr(settings, "ai_api_key", "")

    response = TestClient(app).post(
        "/api/ai/build-guide",
        json={"node_a_id": "node-a", "node_b_id": "node-b"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "AI_API_KEY is not configured."


def test_endpoint_returns_404_for_unknown_node():
    response = TestClient(app).post(
        "/api/ai/build-guide",
        json={"node_a_id": "missing-a", "node_b_id": "missing-b"},
    )

    assert response.status_code == 404
