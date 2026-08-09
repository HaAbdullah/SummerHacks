"""Prompts for the engine-image blueprint workflow.

Keep provider instructions here so workflow nodes remain small and later generation and
validation stages can evolve without scattering large prompt strings through services.
"""

from __future__ import annotations

from app.models.schemas import (
    BlueprintRenderPlan,
    EngineAnalysis,
    EngineImageContext,
)

ENGINE_CONTEXT_PROMPT = """Inspect the uploaded automotive image.

Classify it as exactly one of:
- ENGINE_BAY: an engine installed in a vehicle engine bay.
- ISOLATED_ENGINE: an engine shown outside a vehicle, on a stand, pallet, floor, or plain
  background.
- INVALID: no automotive engine can be identified with reasonable confidence.

Return the engine assembly's normalized bounding box relative to the ORIGINAL image.
For ENGINE_BAY, exclude hood, fenders, windshield, firewall, strut towers, radiator
support, and other surrounding body structure as much as reasonably possible. For an
isolated engine, the box may cover most of the image. Do not mistake an engine cover,
wheel, interior, exhaust-only photo, or arbitrary machinery for a complete automotive
engine. If uncertain, return INVALID rather than guessing.
"""


def engine_analysis_prompt(
    context: EngineImageContext,
    component_confidence_threshold: float,
) -> str:
    return f"""Analyze the automotive engine in the uploaded image using this verified
image context:

{context.model_dump_json(indent=2)}

Focus on the engine bounding region while retaining enough surrounding context to
understand visible engine-connected parts. Return only components with direct visual
evidence. Give every component a confidence from 0 to 1 and a normalized bounding box
relative to the ORIGINAL image, not the engine crop.

Possible components include intake manifold, throttle body, intake pipe, air intake,
air filter, valve cover, ignition coils, alternator, serpentine belt, pulleys, coolant
reservoir, radiator hose, fuel rail, turbocharger, supercharger, intercooler piping,
headers, and exhaust manifold. This list is illustrative, not a checklist. Do not infer
a component merely because engines commonly contain it.

Modification flags also require strong visual evidence. Use generic descriptions such
as "aftermarket-style exposed intake system". Never claim an exact brand, model, part
number, specification, horsepower gain, or price unless it is visibly legible and
unambiguous. Components below {component_confidence_threshold:.2f} will be omitted from
the user-facing result, so prioritize precision over quantity. Do not emit placeholders
or unknown-component labels.
"""


def engine_schematic_prompt(
    context: EngineImageContext,
    analysis: EngineAnalysis,
    plan: BlueprintRenderPlan,
    correction_instructions: list[str] | None = None,
) -> str:
    corrections = correction_instructions or []
    correction_block = (
        "\nCORRECTIONS FROM THE PREVIOUS ATTEMPT:\n- " + "\n- ".join(corrections)
        if corrections
        else ""
    )
    return f"""Transform the supplied engine photograph into one isolated automotive
technical schematic. The output is artwork only and will be placed into a fixed
blueprint document by application code.

VERIFIED IMAGE CONTEXT:
{context.model_dump_json(indent=2)}

VERIFIED ENGINE ANALYSIS:
{analysis.model_dump_json(indent=2)}

RENDER PLAN:
{plan.model_dump_json(indent=2)}

Preserve the engine geometry, source perspective, proportions, visible mechanical
components, and visually supported modifications. When the source is an engine bay,
isolate the engine assembly and its attached visible intake/forced-induction hardware.
Remove the hood, fenders, windshield, body panels, strut towers, radiator support,
garage, floor, people, tools, and unrelated environment.

Render a clean CAD-inspired automotive contour drawing using white and pale-cyan line
work on a uniform deep navy blueprint background. Use restrained line weights, crisp
mechanical detail, minimal shading, and no photorealistic texture.

Do not add labels, words, letters, numbers, dimensions, arrows, callout lines, borders,
logos, title blocks, tables, document metadata, or specification text. Generate only
the isolated engine schematic, centered with comfortable empty space around it, in a
wide 16:9 composition.{correction_block}
"""


def schematic_validation_prompt(
    analysis: EngineAnalysis,
    plan: BlueprintRenderPlan,
) -> str:
    return f"""Compare IMAGE 1, the original engine photograph, with IMAGE 2, the
generated engine schematic.

VERIFIED ENGINE ANALYSIS:
{analysis.model_dump_json(indent=2)}

RENDER PLAN:
{plan.model_dump_json(indent=2)}

Judge whether IMAGE 2 clearly represents the same engine, reasonably preserves its
overall geometry and important visible components, avoids obvious invented mechanical
structures, removes most surrounding vehicle body/environment, contains no generated
labels or document text, and is usable as a clean blueprint schematic.

Be practical rather than certification-grade. Mark valid when it is recognizably
faithful and usable. Correction instructions must be concise, visual, and actionable.
"""
