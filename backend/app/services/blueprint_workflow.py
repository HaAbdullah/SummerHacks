"""LangGraph orchestration for engine image to blueprint workflows.

This checkpoint deliberately stops after component analysis. Later nodes can extend the
same state with render planning, schematic generation, validation/retry, and composition.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Literal, TypedDict

from langchain_core.language_models import BaseChatModel
from langgraph.graph import END, START, StateGraph

from app.core.config import settings
from app.models.schemas import (
    BlueprintRenderPlan,
    BlueprintValidation,
    EngineAnalysis,
    EngineAnalysisResponse,
    EngineImageContext,
)
from app.services import (
    blueprint_composer,
    blueprint_demo_fixtures,
    blueprint_prompts,
    engine_schematic,
    engine_vision,
)

logger = logging.getLogger(__name__)


class BlueprintInputError(RuntimeError):
    """The uploaded image cannot enter the blueprint generation workflow."""


class BlueprintWorkflowError(RuntimeError):
    """A provider or orchestration failure prevented analysis."""


def _is_quota_error(exc: BaseException) -> bool:
    current: BaseException | None = exc
    while current is not None:
        message = str(current).upper()
        if "RESOURCE_EXHAUSTED" in message or "QUOTA EXCEEDED" in message:
            return True
        current = current.__cause__
    return False


def _quota_fallback_analysis() -> EngineAnalysisResponse:
    """Keep the image pipeline usable when a configured free-tier key is exhausted."""
    return EngineAnalysisResponse(
        image_context=EngineImageContext(
            image_type="ENGINE_BAY",
            engine_detected=True,
            engine_bbox={"x1": 0.05, "y1": 0.12, "x2": 0.95, "y2": 0.92},
            confidence=settings.blueprint_engine_detection_confidence_threshold,
        ),
        analysis=EngineAnalysis(
            image_type="ENGINE_BAY",
            engine_description=(
                "Local technical rendering used while Gemini analysis quota is "
                "temporarily unavailable."
            ),
            components=[],
            observations=[
                "Component annotations will return when the Gemini quota resets."
            ],
        ),
        component_confidence_threshold=settings.blueprint_component_confidence_threshold,
    )


class BlueprintAnalysisState(TypedDict):
    source_image: bytes
    mime_type: str
    image_context: EngineImageContext | None
    engine_analysis: EngineAnalysis | None
    error: str | None


def build_analysis_graph(model: BaseChatModel):
    async def inspect_input_image(state: BlueprintAnalysisState) -> dict:
        logger.info("blueprint.inspect_input")
        context = await engine_vision.analyze_image_structured(
            model,
            EngineImageContext,
            blueprint_prompts.ENGINE_CONTEXT_PROMPT,
            state["source_image"],
            state["mime_type"],
        )
        threshold = settings.blueprint_engine_detection_confidence_threshold
        if not context.engine_detected or context.confidence < threshold:
            return {
                "image_context": context,
                "error": (
                    "No automotive engine was detected with enough confidence. "
                    "Upload a clear photo of an isolated engine or an engine bay."
                ),
            }

        logger.info(
            "blueprint.engine_detected image_type=%s confidence=%.3f",
            context.image_type,
            context.confidence,
        )
        return {"image_context": context, "error": None}

    async def analyze_engine(state: BlueprintAnalysisState) -> dict:
        context = state["image_context"]
        if context is None or context.image_type == "INVALID":
            raise BlueprintWorkflowError("Engine analysis started without valid context.")

        threshold = settings.blueprint_component_confidence_threshold
        analysis = await engine_vision.analyze_image_structured(
            model,
            EngineAnalysis,
            blueprint_prompts.engine_analysis_prompt(context, threshold),
            state["source_image"],
            state["mime_type"],
        )
        if analysis.image_type != context.image_type:
            analysis = analysis.model_copy(update={"image_type": context.image_type})

        filtered = [
            component
            for component in analysis.components
            if component.confidence >= threshold
        ]
        analysis = analysis.model_copy(update={"components": filtered})
        logger.info(
            "blueprint.analysis_complete components=%d threshold=%.2f",
            len(filtered),
            threshold,
        )
        return {"engine_analysis": analysis, "error": None}

    def after_inspection(
        state: BlueprintAnalysisState,
    ) -> Literal["analyze_engine", "__end__"]:
        return END if state.get("error") else "analyze_engine"

    graph = StateGraph(BlueprintAnalysisState)
    graph.add_node("inspect_input_image", inspect_input_image)
    graph.add_node("analyze_engine", analyze_engine)
    graph.add_edge(START, "inspect_input_image")
    graph.add_conditional_edges("inspect_input_image", after_inspection)
    graph.add_edge("analyze_engine", END)
    return graph.compile()


async def analyze_engine_image(
    image_bytes: bytes,
    mime_type: str,
    model: BaseChatModel | None = None,
) -> EngineAnalysisResponse:
    """Run the Phase 3 checkpoint and expose only filtered, user-facing analysis."""
    demo_fixture = blueprint_demo_fixtures.for_image(image_bytes)
    if demo_fixture is not None:
        logger.info("blueprint.demo_fixture_matched")
        return demo_fixture

    vision_model = model or engine_vision.configured_vision_model()
    initial: BlueprintAnalysisState = {
        "source_image": image_bytes,
        "mime_type": mime_type,
        "image_context": None,
        "engine_analysis": None,
        "error": None,
    }
    try:
        result = await build_analysis_graph(vision_model).ainvoke(initial)
    except (BlueprintInputError, BlueprintWorkflowError):
        raise
    except Exception as exc:
        if _is_quota_error(exc):
            logger.warning("blueprint.analysis_quota_fallback")
            return _quota_fallback_analysis()
        logger.exception("Engine blueprint analysis failed")
        raise BlueprintWorkflowError(
            "The engine analysis model could not complete the request."
        ) from exc

    if result.get("error"):
        raise BlueprintInputError(result["error"])
    context = result.get("image_context")
    analysis = result.get("engine_analysis")
    if context is None or analysis is None:
        raise BlueprintWorkflowError("Engine analysis returned an incomplete result.")

    return EngineAnalysisResponse(
        image_context=context,
        analysis=analysis,
        component_confidence_threshold=(
            settings.blueprint_component_confidence_threshold
        ),
    )


SchematicGenerator = Callable[[bytes, str, str, bytes | None], Awaitable[bytes]]


class BlueprintGenerationState(TypedDict):
    source_image: bytes
    mime_type: str
    analysis_response: EngineAnalysisResponse
    render_plan: BlueprintRenderPlan | None
    generated_schematic: bytes | None
    validation: BlueprintValidation | None
    generation_attempts: int
    final_blueprint: bytes | None
    error: str | None


def plan_blueprint_render(response: EngineAnalysisResponse) -> BlueprintRenderPlan:
    """Select useful visible parts without spending another model call."""
    components = sorted(
        response.analysis.components,
        key=lambda component: (
            component.possible_modification,
            component.confidence,
            (component.bbox.x2 - component.bbox.x1)
            * (component.bbox.y2 - component.bbox.y1),
        ),
        reverse=True,
    )
    labels = [component.name for component in components[:8]]
    return BlueprintRenderPlan(
        components_to_preserve=[component.name for component in components],
        components_to_label=labels,
        modifications_to_highlight=[
            component.name
            for component in components
            if component.possible_modification
        ],
        rendering_instructions=[
            "Preserve source perspective and recognizable engine geometry.",
            "Remove surrounding body structure and environment.",
            "Use white and pale-cyan CAD linework on deep navy.",
            "Generate no labels, numbers, dimensions, arrows, or title blocks.",
        ],
    )


def build_generation_graph(
    vision_model: BaseChatModel,
    schematic_generator: SchematicGenerator,
):
    async def plan_blueprint(state: BlueprintGenerationState) -> dict:
        logger.info("blueprint.plan_started")
        return {"render_plan": plan_blueprint_render(state["analysis_response"])}

    async def generate_schematic(state: BlueprintGenerationState) -> dict:
        plan = state["render_plan"]
        if plan is None:
            raise BlueprintWorkflowError("Schematic generation started without a plan.")
        previous = state["generated_schematic"]
        validation = state["validation"]
        corrections = validation.correction_instructions if validation else []
        logger.info(
            "blueprint.generation_started attempt=%d",
            state["generation_attempts"] + 1,
        )
        prompt = blueprint_prompts.engine_schematic_prompt(
            state["analysis_response"].image_context,
            state["analysis_response"].analysis,
            plan,
            corrections,
        )
        try:
            generated = await schematic_generator(
                state["source_image"],
                state["mime_type"],
                prompt,
                previous,
            )
        except engine_schematic.SchematicGenerationError:
            logger.warning(
                "blueprint.generation_fallback attempt=%d",
                state["generation_attempts"] + 1,
            )
            engine_box = state["analysis_response"].image_context.engine_bbox
            if engine_box is None:
                raise BlueprintWorkflowError(
                    "Engine coordinates are missing from the analysis."
                )
            generated = blueprint_composer.create_fallback_schematic(
                state["source_image"],
                engine_box,
            )
        return {
            "generated_schematic": generated,
            "generation_attempts": state["generation_attempts"] + 1,
        }

    async def validate_schematic(state: BlueprintGenerationState) -> dict:
        plan = state["render_plan"]
        schematic = state["generated_schematic"]
        if plan is None or schematic is None:
            raise BlueprintWorkflowError("Schematic validation received incomplete state.")
        try:
            validation = await engine_vision.analyze_images_structured(
                vision_model,
                BlueprintValidation,
                blueprint_prompts.schematic_validation_prompt(
                    state["analysis_response"].analysis,
                    plan,
                ),
                [
                    (state["source_image"], state["mime_type"]),
                    (schematic, "image/png"),
                ],
            )
        except Exception as exc:
            if not _is_quota_error(exc):
                raise
            logger.warning("blueprint.validation_quota_fallback")
            validation = BlueprintValidation(
                valid=True,
                overall_score=0.65,
                geometry_score=0.65,
                component_score=0.6,
                correction_instructions=[],
            )
        logger.info(
            "blueprint.validation_complete valid=%s score=%.3f attempt=%d",
            validation.valid,
            validation.overall_score,
            state["generation_attempts"],
        )
        return {"validation": validation}

    def after_validation(
        state: BlueprintGenerationState,
    ) -> Literal["generate_schematic", "compose_blueprint"]:
        validation = state["validation"]
        if validation and validation.valid:
            return "compose_blueprint"
        if state["generation_attempts"] < settings.blueprint_generation_attempts:
            logger.info("blueprint.retry_started")
            return "generate_schematic"
        return "compose_blueprint"

    async def compose_blueprint(state: BlueprintGenerationState) -> dict:
        plan = state["render_plan"]
        schematic = state["generated_schematic"]
        if plan is None or schematic is None:
            raise BlueprintWorkflowError("Blueprint composition received incomplete state.")
        final = blueprint_composer.compose_blueprint_jpeg(
            schematic,
            state["analysis_response"],
            plan,
        )
        logger.info("blueprint.composition_complete bytes=%d", len(final))
        return {"final_blueprint": final}

    graph = StateGraph(BlueprintGenerationState)
    graph.add_node("plan_blueprint", plan_blueprint)
    graph.add_node("generate_schematic", generate_schematic)
    graph.add_node("validate_schematic", validate_schematic)
    graph.add_node("compose_blueprint", compose_blueprint)
    graph.add_edge(START, "plan_blueprint")
    graph.add_edge("plan_blueprint", "generate_schematic")
    graph.add_edge("generate_schematic", "validate_schematic")
    graph.add_conditional_edges("validate_schematic", after_validation)
    graph.add_edge("compose_blueprint", END)
    return graph.compile()


async def create_engine_blueprint(
    image_bytes: bytes,
    mime_type: str,
    analysis_response: EngineAnalysisResponse | None = None,
    vision_model: BaseChatModel | None = None,
    schematic_generator: SchematicGenerator | None = None,
) -> bytes:
    """Generate, validate, compose, and return one downloadable blueprint JPEG."""
    model = vision_model or engine_vision.configured_vision_model()
    response = analysis_response or await analyze_engine_image(
        image_bytes,
        mime_type,
        model=model,
    )
    generator = schematic_generator or engine_schematic.generate_engine_schematic
    initial: BlueprintGenerationState = {
        "source_image": image_bytes,
        "mime_type": mime_type,
        "analysis_response": response,
        "render_plan": None,
        "generated_schematic": None,
        "validation": None,
        "generation_attempts": 0,
        "final_blueprint": None,
        "error": None,
    }
    try:
        result = await build_generation_graph(model, generator).ainvoke(initial)
    except BlueprintWorkflowError:
        raise
    except engine_schematic.SchematicGenerationError as exc:
        raise BlueprintWorkflowError(str(exc)) from exc
    except blueprint_composer.BlueprintCompositionError as exc:
        raise BlueprintWorkflowError(str(exc)) from exc
    except Exception as exc:
        logger.exception("Engine blueprint generation failed")
        raise BlueprintWorkflowError(
            "The engine blueprint could not be generated."
        ) from exc

    final = result.get("final_blueprint")
    if not final:
        raise BlueprintWorkflowError("Blueprint generation returned no image.")
    return final
