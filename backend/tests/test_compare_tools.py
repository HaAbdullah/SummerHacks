"""Deterministic comparison rules and the LangChain tool boundary."""

from __future__ import annotations

import asyncio
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import agentic_compare, compare_tools


def node(
    node_id: str,
    *,
    car_id: str = "test-car",
    engine: str | None = None,
    exhaust: str | None = None,
    wheels: str | None = None,
    brakes: str | None = None,
) -> dict:
    return {
        "id": node_id,
        "car_id": car_id,
        "title": node_id,
        "parent_ids": [],
        "attributes": [],
        "mods": {
            "engine": engine,
            "exhaust": exhaust,
            "wheels": wheels,
            "brakes": brakes,
        },
        "summary": "",
        "hero_image": None,
        "stats": {"forks": 0, "notes": 0, "contributors": 1, "heat": 0.4},
        "created_by": "test",
        "created_at": "2026-01-01T00:00:00Z",
        "is_root": False,
        "slot": None,
        "level": 0,
    }


CATALOGUE = {
    "test-car": {
        "engine": [
            {"name": "Intake", "price": 300, "brand": "A", "category": "intake"},
        ],
        "exhaust": [
            {"name": "Old Pipe", "price": 500, "brand": "A", "category": "catback"},
            {"name": "New Pipe", "price": 900, "brand": "B", "category": "catback"},
        ],
        "wheels": [],
        "brakes": [],
    }
}


@pytest.mark.parametrize(
    ("current", "target", "expected"),
    [
        (None, None, "unchanged"),
        ("", "  ", "unchanged"),
        (None, "Intake", "add"),
        ("Intake", None, "remove"),
        ("Intake", "Intake", "unchanged"),
        ("Old", "New", "replace"),
    ],
)
def test_determine_operation_matrix(current, target, expected):
    assert compare_tools.determine_operation(current, target) == expected


def test_calculate_mod_changes_ignores_non_mechanical_metadata():
    a = node("a", exhaust="Old Pipe")
    b = node("b", exhaust="New Pipe")
    b.update(title="different", level=4, summary="irrelevant")

    changes = compare_tools.calculate_mod_changes(a, b)

    assert [change["operation"] for change in changes] == [
        "unchanged",
        "replace",
        "unchanged",
        "unchanged",
    ]


def test_mutations_copy_target_values_without_mutating_inputs():
    a = node("a", exhaust="Old Pipe", brakes="Pads")
    b = node("b", engine="Intake", exhaust="New Pipe")
    original_a, original_b = deepcopy(a), deepcopy(b)
    working = deepcopy(a)

    added = compare_tools.add_mod(working, b, "engine")
    replaced = compare_tools.replace_mod(working, b, "exhaust")
    removed = compare_tools.remove_mod(working, "brakes")

    assert added["added"] == "Intake"
    assert replaced == {
        "operation": "replace",
        "mod_key": "exhaust",
        "removed": "Old Pipe",
        "added": "New Pipe",
    }
    assert removed["removed"] == "Pads"
    assert a == original_a and b == original_b
    assert compare_tools.validate_comparison(working, b)["matches_target"]


def test_get_mod_details_requires_an_exact_name():
    assert compare_tools.get_mod_details(
        CATALOGUE, "test-car", "exhaust", "New Pipe"
    )["price"] == 900
    assert (
        compare_tools.get_mod_details(
            CATALOGUE, "test-car", "exhaust", "new pipe"
        )
        is None
    )


def test_calculate_costs_keeps_value_difference_distinct():
    operations = [
        {
            "operation": "add",
            "mod_key": "engine",
            "added": "Intake",
        },
        {
            "operation": "replace",
            "mod_key": "exhaust",
            "removed": "Old Pipe",
            "added": "New Pipe",
        },
    ]

    pricing = compare_tools.calculate_costs(
        operations, CATALOGUE, "test-car"
    )

    assert pricing == {
        "new_parts_cost": 1200.0,
        "removed_parts_value": 500.0,
        "build_value_difference": 700.0,
        "pricing_complete": True,
        "unresolved_added_parts": [],
        "unresolved_removed_parts": [],
    }


def test_missing_catalogue_price_is_unresolved_not_estimated():
    operations = [
        {"operation": "add", "mod_key": "wheels", "added": "Unknown Wheels"}
    ]

    pricing = compare_tools.calculate_costs(
        operations, CATALOGUE, "test-car"
    )

    assert pricing["new_parts_cost"] == 0
    assert pricing["pricing_complete"] is False
    assert pricing["unresolved_added_parts"] == ["Unknown Wheels"]


def test_calculate_costs_sums_comma_separated_exact_names():
    catalogue = {
        "test-car": {
            "engine": [
                {"name": "Intake", "price": 300},
                {"name": "Tune", "price": 500},
            ],
            "exhaust": [],
            "wheels": [],
            "brakes": [],
        }
    }
    operations = [
        {
            "operation": "add",
            "mod_key": "engine",
            "added": "Intake, Tune",
        }
    ]

    pricing = compare_tools.calculate_costs(operations, catalogue, "test-car")

    assert pricing == {
        "new_parts_cost": 800.0,
        "removed_parts_value": 0.0,
        "build_value_difference": 800.0,
        "pricing_complete": True,
        "unresolved_added_parts": [],
        "unresolved_removed_parts": [],
    }


def test_tool_registry_has_only_the_seven_capabilities():
    context = agentic_compare.CompareContext(
        node_a=node("a"),
        node_b=node("b"),
        catalogue=CATALOGUE,
    )
    tools = agentic_compare.create_compare_tools(context)

    assert [tool.name for tool in tools] == [
        "calculate_mod_changes",
        "get_mod_details",
        "add_mod",
        "remove_mod",
        "replace_mod",
        "calculate_costs",
        "validate_comparison",
    ]


def test_stateful_tools_reject_wrong_or_repeated_mutations():
    context = agentic_compare.CompareContext(
        node_a=node("a"),
        node_b=node("b", engine="Intake"),
        catalogue=CATALOGUE,
    )
    tools = {tool.name: tool for tool in agentic_compare.create_compare_tools(context)}
    tools["calculate_mod_changes"].invoke({})

    with pytest.raises(ValueError, match="requires 'add'"):
        tools["replace_mod"].invoke({"mod_key": "engine"})

    with pytest.raises(ValueError, match="Apply all required mutations"):
        tools["calculate_costs"].invoke({})

    tools["add_mod"].invoke({"mod_key": "engine"})
    with pytest.raises(ValueError, match="already changed"):
        tools["add_mod"].invoke({"mod_key": "engine"})


class SuccessfulAgent:
    def __init__(self, tools):
        self.tools = {tool.name: tool for tool in tools}

    async def ainvoke(self, _input, config=None):
        changes = self.tools["calculate_mod_changes"].invoke({})
        for change in changes:
            if change["operation"] != "unchanged":
                self.tools[f"{change['operation']}_mod"].invoke(
                    {"mod_key": change["mod_key"]}
                )
        self.tools["calculate_costs"].invoke({})
        self.tools["validate_comparison"].invoke({})
        return {"messages": []}


class IncompleteAgent:
    async def ainvoke(self, _input, config=None):
        return {"messages": []}


def test_agent_result_comes_from_tool_state_and_preserves_inputs(monkeypatch):
    a = node("a", exhaust="Old Pipe")
    b = node("b", engine="Intake", exhaust="New Pipe")
    original_a, original_b = deepcopy(a), deepcopy(b)
    monkeypatch.setattr(agentic_compare, "load_catalogue", lambda _car: CATALOGUE)
    monkeypatch.setattr(
        agentic_compare,
        "create_compare_agent",
        lambda _model, tools: SuccessfulAgent(tools),
    )

    result = asyncio.run(agentic_compare.compare_nodes(a, b, model=object()))

    assert result.matches_target is True
    assert result.resulting_mods.engine == "Intake"
    assert result.pricing.new_parts_cost == 1200
    assert result.pricing.removed_parts_value == 500
    assert a == original_a and b == original_b


def test_incomplete_agent_run_is_rejected(monkeypatch):
    monkeypatch.setattr(agentic_compare, "load_catalogue", lambda _car: CATALOGUE)
    monkeypatch.setattr(
        agentic_compare,
        "create_compare_agent",
        lambda _model, _tools: IncompleteAgent(),
    )

    with pytest.raises(
        agentic_compare.CompareWorkflowError,
        match="did not calculate",
    ):
        asyncio.run(
            agentic_compare.compare_nodes(
                node("a"), node("b", engine="Intake"), model=object()
            )
        )


def test_different_cars_are_rejected_before_agent_creation():
    with pytest.raises(ValueError, match="same car"):
        asyncio.run(
            agentic_compare.compare_nodes(
                node("a", car_id="car-a"),
                node("b", car_id="car-b"),
                model=object(),
            )
        )


def test_post_contract_accepts_complete_nodes_and_reports_missing_model(monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "")

    response = TestClient(app).post(
        "/api/ai/compare",
        json={"node_a": node("a"), "node_b": node("b")},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "AI_API_KEY is not configured."
