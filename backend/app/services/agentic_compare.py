"""LangChain orchestration for POST /ai/compare.

The agent owns sequencing only. Request-scoped tools close over ``CompareContext`` so
the model never receives mutable node JSON, never supplies a modification value, and
never performs pricing or validation itself.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from threading import Lock
from typing import Any

from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.models.schemas import CompareResult
from app.services import compare_tools, parts

COMPARE_AGENT_PROMPT = """You are the comparison orchestration agent for the vehicle
build graph.

The backend has already supplied Node A, Node B, and the parts catalogue. Node A is the
starting configuration. Node B is authoritative.

Rules:
1. Begin by calling calculate_mod_changes.
2. Treat that result as the authoritative determination of every change.
3. For add call add_mod, for remove call remove_mod, for replace call replace_mod, and
   perform no mutation for unchanged.
4. Never invent comparison logic or a modification. Mutation tools copy target values
   from Node B and accept only a mod_key.
5. Do not perform arithmetic.
6. After all mutations, call calculate_costs exactly once.
7. Then call validate_comparison exactly once.
8. The workflow is complete only when validation returns matches_target=true.
9. Do not repeat successful operations or call unnecessary tools.
10. Ignore titles, graph ancestry, attributes, summaries, images, stats, authors, dates,
    root status, and level when comparing mechanical state.
"""


class CompareWorkflowError(RuntimeError):
    """The model failed to complete a valid deterministic tool workflow."""


class CompareConfigurationError(CompareWorkflowError):
    """Required model configuration is missing."""


@dataclass
class CompareContext:
    node_a: dict
    node_b: dict
    catalogue: dict
    working_node: dict = field(init=False)
    changes: list[dict] = field(default_factory=list)
    operations: list[dict] = field(default_factory=list)
    pricing: dict | None = None
    validation: dict | None = None
    lock: Lock = field(default_factory=Lock, repr=False)

    def __post_init__(self) -> None:
        self.working_node = deepcopy(self.node_a)


def load_catalogue(car_id: str) -> dict:
    """Load only the existing parts catalogue; nodes are never retrieved here."""
    grouped = parts.for_car(car_id)
    return {
        car_id: {
            mod_key: [
                {
                    "name": part["name"],
                    "price": part.get("price"),
                    "brand": part.get("brand") or "",
                    "category": part.get("category") or "",
                }
                for part in grouped.get(mod_key, [])
            ]
            for mod_key in compare_tools.MOD_KEYS
        }
    }


def create_compare_tools(context: CompareContext) -> list[StructuredTool]:
    """Create exactly seven stateful tools for one request."""

    def calculate_changes() -> list[dict]:
        """Determine add/remove/replace/unchanged for all four modification slots."""
        with context.lock:
            if context.changes:
                raise ValueError("Modification changes were already calculated.")
            context.changes = compare_tools.calculate_mod_changes(
                context.node_a, context.node_b
            )
            return deepcopy(context.changes)

    def get_details(mod_key: str, mod_name: str) -> dict:
        """Look up one exact part name in the supplied car and modification group."""
        part = compare_tools.get_mod_details(
            context.catalogue, context.node_b["car_id"], mod_key, mod_name
        )
        if part is None or part.get("price") is None:
            return {"found": False, "reason": "part_not_in_catalogue"}
        return {"found": True, **part}

    def add(mod_key: str) -> dict:
        """Apply an authoritative add operation for one slot from Node B."""
        return _mutate(context, mod_key, "add")

    def remove(mod_key: str) -> dict:
        """Apply an authoritative remove operation to one working-node slot."""
        return _mutate(context, mod_key, "remove")

    def replace(mod_key: str) -> dict:
        """Apply an authoritative replacement for one slot from Node B."""
        return _mutate(context, mod_key, "replace")

    def costs() -> dict:
        """Calculate added cost, removed value, and catalogue value difference."""
        with context.lock:
            _require_changes(context)
            _require_mutations_complete(context)
            if context.pricing is not None:
                raise ValueError("Costs were already calculated.")
            context.pricing = compare_tools.calculate_costs(
                context.operations, context.catalogue, context.node_b["car_id"]
            )
            return deepcopy(context.pricing)

    def validate() -> dict:
        """Validate that the temporary working configuration exactly matches Node B."""
        with context.lock:
            _require_changes(context)
            _require_mutations_complete(context)
            if context.pricing is None:
                raise ValueError("Call calculate_costs before validation.")
            if context.validation is not None:
                raise ValueError("The comparison was already validated.")
            context.validation = compare_tools.validate_comparison(
                context.working_node, context.node_b
            )
            return deepcopy(context.validation)

    return [
        StructuredTool.from_function(
            calculate_changes, name="calculate_mod_changes"
        ),
        StructuredTool.from_function(get_details, name="get_mod_details"),
        StructuredTool.from_function(add, name="add_mod"),
        StructuredTool.from_function(remove, name="remove_mod"),
        StructuredTool.from_function(replace, name="replace_mod"),
        StructuredTool.from_function(costs, name="calculate_costs"),
        StructuredTool.from_function(validate, name="validate_comparison"),
    ]


def create_compare_agent(
    model: BaseChatModel,
    tools: list[StructuredTool],
):
    return create_agent(
        model=model,
        tools=tools,
        system_prompt=COMPARE_AGENT_PROMPT,
    )


def configured_model() -> BaseChatModel:
    """Build the configured OpenAI-compatible LangChain chat model."""
    if not settings.ai_api_key.strip():
        raise CompareConfigurationError("AI_API_KEY is not configured.")
    return ChatOpenAI(
        model=settings.ai_model,
        api_key=settings.ai_api_key,
        base_url=settings.ai_base_url,
        temperature=0,
        timeout=settings.ai_timeout_seconds,
    )


async def compare_nodes(
    node_a: dict,
    node_b: dict,
    model: BaseChatModel | None = None,
) -> CompareResult:
    """Run the tool-calling loop and return only deterministic context state."""
    if node_a["car_id"] != node_b["car_id"]:
        raise ValueError("Node A and Node B must belong to the same car.")

    context = CompareContext(
        node_a=deepcopy(node_a),
        node_b=deepcopy(node_b),
        catalogue=load_catalogue(node_b["car_id"]),
    )
    tools = create_compare_tools(context)
    agent = create_compare_agent(model or configured_model(), tools)

    try:
        await agent.ainvoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Transform Node A's working configuration into Node B using "
                            "the available tools."
                        ),
                    }
                ]
            },
            config={"recursion_limit": settings.compare_agent_recursion_limit},
        )
    except CompareWorkflowError:
        raise
    except Exception as exc:
        raise CompareWorkflowError(f"Comparison agent failed: {exc}") from exc

    # The agent must actually use the required terminal tools. The model's final prose is
    # deliberately ignored; only state produced by deterministic tools can leave here.
    if not context.changes:
        raise CompareWorkflowError("Agent did not calculate modification changes.")
    if context.pricing is None:
        raise CompareWorkflowError("Agent did not calculate costs.")
    if context.validation is None:
        raise CompareWorkflowError("Agent did not validate the comparison.")

    final_validation = compare_tools.validate_comparison(
        context.working_node, context.node_b
    )
    if not final_validation["matches_target"]:
        raise CompareWorkflowError(
            "Comparison workflow failed validation: "
            f"{final_validation['mismatches']}"
        )

    return CompareResult(
        base_node_id=node_a["id"],
        target_node_id=node_b["id"],
        car_id=node_b["car_id"],
        changes=context.changes,
        operations=context.operations,
        pricing=context.pricing,
        resulting_mods=compare_tools.normalized_mods(context.working_node),
        matches_target=True,
    )


def _mutate(context: CompareContext, mod_key: str, expected: str) -> dict:
    with context.lock:
        _require_changes(context)
        if context.pricing is not None:
            raise ValueError("No mutations are allowed after cost calculation.")
        change = next(
            (change for change in context.changes if change["mod_key"] == mod_key),
            None,
        )
        if change is None or change["operation"] != expected:
            actual = change["operation"] if change else "unknown"
            raise ValueError(
                f"Slot '{mod_key}' requires '{actual}', not '{expected}'."
            )
        if any(operation["mod_key"] == mod_key for operation in context.operations):
            raise ValueError(f"Slot '{mod_key}' was already changed.")

        functions: dict[str, Any] = {
            "add": lambda: compare_tools.add_mod(
                context.working_node, context.node_b, mod_key
            ),
            "remove": lambda: compare_tools.remove_mod(
                context.working_node, mod_key
            ),
            "replace": lambda: compare_tools.replace_mod(
                context.working_node, context.node_b, mod_key
            ),
        }
        result = functions[expected]()
        context.operations.append(result)
        return deepcopy(result)


def _require_changes(context: CompareContext) -> None:
    if not context.changes:
        raise ValueError("Call calculate_mod_changes first.")


def _require_mutations_complete(context: CompareContext) -> None:
    required = {
        change["mod_key"]
        for change in context.changes
        if change["operation"] != "unchanged"
    }
    completed = {operation["mod_key"] for operation in context.operations}
    pending = sorted(required - completed)
    if pending:
        raise ValueError(
            "Apply all required mutations before continuing: " + ", ".join(pending)
        )
