"""Evidence-grounded build guides from one stored graph node to another."""

from __future__ import annotations

import json

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from app.models.schemas import (
    BuildGuideContext,
    BuildGuideContextNode,
    BuildGuidePart,
    CompareChange,
    TransitionBuildGuide,
)
from app.services import (
    agentic_compare,
    build_guide_prompts,
    community_evidence,
    compare_tools,
    graph_service,
)


class BuildGuideWorkflowError(RuntimeError):
    """The guide model failed or returned an invalid structured result."""


class BuildGuideConfigurationError(BuildGuideWorkflowError):
    """Required model configuration is missing."""


def _context_node(node) -> BuildGuideContextNode:
    return BuildGuideContextNode(
        id=node.id,
        title=node.title,
        summary=node.summary,
        mods=compare_tools.normalized_mods({"mods": node.mods.model_dump()}),
    )


def build_context(node_a_id: str, node_b_id: str) -> BuildGuideContext:
    """Load both nodes and build the exact JSON object passed to the model."""
    node_a = graph_service.get_node(node_a_id)
    node_b = graph_service.get_node(node_b_id)
    missing = [
        node_id
        for node_id, node in ((node_a_id, node_a), (node_b_id, node_b))
        if node is None
    ]
    if missing:
        raise LookupError("No node " + ", ".join(f"'{node_id}'" for node_id in missing))
    if node_a.carId != node_b.carId:
        raise ValueError("Node A and Node B must belong to the same car.")

    changes = compare_tools.calculate_mod_changes(
        {"mods": node_a.mods.model_dump()},
        {"mods": node_b.mods.model_dump()},
    )
    return BuildGuideContext(
        starting_node=_context_node(node_a),
        target_node=_context_node(node_b),
        comparison=[CompareChange.model_validate(change) for change in changes],
        community_context=community_evidence.for_node(node_b_id),
    )


def required_changes(context: BuildGuideContext) -> list[BuildGuidePart]:
    """Translate authoritative comparison facts into guide parts."""
    parts: list[BuildGuidePart] = []
    for change in context.comparison:
        if change.operation == "unchanged":
            continue
        name = change.target if change.operation != "remove" else change.current
        if not name:
            continue
        parts.append(
            BuildGuidePart(
                name=name,
                category=change.mod_key,
                action=change.operation,
                replaces=change.current if change.operation == "replace" else None,
            )
        )
    return parts


async def _invoke_structured(
    context: BuildGuideContext,
    model: BaseChatModel,
) -> TransitionBuildGuide:
    structured_model = model.with_structured_output(
        schema=TransitionBuildGuide.model_json_schema(),
        method="json_schema",
    )
    result = await structured_model.ainvoke(
        [
            SystemMessage(content=build_guide_prompts.BUILD_GUIDE_SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    "Create the build guide from this validated context JSON:\n"
                    + json.dumps(context.model_dump(), indent=2)
                )
            ),
        ]
    )
    if isinstance(result, BaseModel):
        result = result.model_dump()
    return TransitionBuildGuide.model_validate(result)


def _ground_result(
    guide: TransitionBuildGuide,
    context: BuildGuideContext,
) -> TransitionBuildGuide:
    """Enforce node facts and remove every fabricated community reference."""
    evidence_ids = {item.id for item in context.community_context}
    guide.node_a_id = context.starting_node.id
    guide.node_b_id = context.target_node.id
    guide.required_changes = required_changes(context)

    for order, stage in enumerate(sorted(guide.stages, key=lambda item: item.order), 1):
        stage.order = order
        for step in stage.steps:
            step.evidence_ids = [
                evidence_id
                for evidence_id in step.evidence_ids
                if evidence_id in evidence_ids
            ]
    guide.stages.sort(key=lambda item: item.order)

    for tip in guide.community_tips:
        tip.evidence_ids = [
            evidence_id for evidence_id in tip.evidence_ids if evidence_id in evidence_ids
        ]
    guide.community_tips = [tip for tip in guide.community_tips if tip.evidence_ids]
    return guide


async def create_build_guide(
    node_a_id: str,
    node_b_id: str,
    model: BaseChatModel | None = None,
) -> TransitionBuildGuide:
    context = build_context(node_a_id, node_b_id)
    try:
        selected_model = model or agentic_compare.configured_model()
    except agentic_compare.CompareConfigurationError as exc:
        raise BuildGuideConfigurationError(str(exc)) from exc

    try:
        guide = await _invoke_structured(context, selected_model)
    except BuildGuideWorkflowError:
        raise
    except Exception as exc:
        raise BuildGuideWorkflowError(f"Build guide agent failed: {exc}") from exc
    return _ground_result(guide, context)
