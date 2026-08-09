"""Deterministic composition of generated engine art into the fixed blueprint sheet."""

from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat

from app.core.config import settings
from app.models.schemas import (
    BlueprintRenderPlan,
    BoundingBox,
    EngineAnalysisResponse,
    EngineComponent,
)

NAVY = "#061f3d"
DEEP_BLUE = "#063f89"
CYAN = "#69cfff"
WHITE = "#f4fbff"
MUTED = "#5fa5cc"


class BlueprintCompositionError(RuntimeError):
    """The fixed template or generated schematic could not be composed."""


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf",
        "DejaVuSansMono-Bold.ttf" if bold else "DejaVuSansMono.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def _normalize_schematic(image: Image.Image) -> Image.Image:
    """Enforce a consistent deep-blue sheet with white/cyan technical linework."""
    rgb = image.convert("RGB")
    gray = ImageOps.autocontrast(rgb.convert("L"), cutoff=1)
    if ImageStat.Stat(gray).mean[0] > 145:
        gray = ImageOps.invert(gray)

    edges = ImageOps.autocontrast(
        gray.filter(ImageFilter.GaussianBlur(0.7)).filter(ImageFilter.FIND_EDGES),
        cutoff=2,
    )
    linework = ImageChops.lighter(gray, edges)
    linework = linework.point(lambda value: 0 if value < 34 else min(255, value * 2))
    return ImageOps.colorize(linework, black=DEEP_BLUE, white=WHITE)


def create_fallback_schematic(source_bytes: bytes, engine_box: BoundingBox) -> bytes:
    """Create local technical linework when the image-generation quota is unavailable."""
    try:
        with Image.open(BytesIO(source_bytes)) as source:
            image = source.convert("RGB")
    except (OSError, ValueError) as exc:
        raise BlueprintCompositionError(
            "The source engine image could not be converted into a schematic."
        ) from exc

    width, height = image.size
    crop_box = (
        max(0, round(engine_box.x1 * width)),
        max(0, round(engine_box.y1 * height)),
        min(width, round(engine_box.x2 * width)),
        min(height, round(engine_box.y2 * height)),
    )
    crop = image.crop(crop_box)
    gray = ImageOps.autocontrast(crop.convert("L"), cutoff=1)
    fine_edges = ImageOps.autocontrast(
        gray.filter(ImageFilter.GaussianBlur(0.8)).filter(ImageFilter.FIND_EDGES),
        cutoff=2,
    )
    contours = ImageOps.invert(gray.filter(ImageFilter.CONTOUR))
    contours = ImageOps.autocontrast(contours, cutoff=2)
    linework = ImageChops.lighter(fine_edges, contours)
    linework = linework.point(lambda value: 0 if value < 38 else min(255, value * 2))
    colored = ImageOps.colorize(linework, black=DEEP_BLUE, white=WHITE)

    sheet = Image.new("RGB", (1024, 576), DEEP_BLUE)
    fitted = ImageOps.contain(colored, (944, 520), Image.Resampling.LANCZOS)
    sheet.paste(fitted, ((1024 - fitted.width) // 2, (576 - fitted.height) // 2))
    output = BytesIO()
    sheet.save(output, format="PNG", optimize=True)
    return output.getvalue()


def _component_lookup(
    response: EngineAnalysisResponse,
    plan: BlueprintRenderPlan,
) -> list[EngineComponent]:
    by_name = {component.name.casefold(): component for component in response.analysis.components}
    selected = [
        by_name[name.casefold()]
        for name in plan.components_to_label
        if name.casefold() in by_name
    ]
    return selected[:8]


def compose_blueprint_jpeg(
    schematic_bytes: bytes,
    response: EngineAnalysisResponse,
    plan: BlueprintRenderPlan,
    template_path: str | Path | None = None,
) -> bytes:
    """Return a ready-to-download JPEG while preserving the fixed template layout."""
    template = Path(template_path or settings.blueprint_template_path)
    try:
        with Image.open(template) as source_template:
            canvas = source_template.convert("RGB")
        with Image.open(BytesIO(schematic_bytes)) as source_schematic:
            schematic = _normalize_schematic(source_schematic)
    except (OSError, ValueError) as exc:
        raise BlueprintCompositionError(
            "The blueprint template or generated schematic is not a readable image."
        ) from exc

    width, height = canvas.size
    sx, sy = width / 1600, height / 1000
    region = (
        round(365 * sx),
        round(305 * sy),
        round(1235 * sx),
        round(795 * sy),
    )
    region_size = (region[2] - region[0], region[3] - region[1])
    fitted = ImageOps.contain(schematic, region_size, Image.Resampling.LANCZOS)
    paste_x = region[0] + (region_size[0] - fitted.width) // 2
    paste_y = region[1] + (region_size[1] - fitted.height) // 2
    canvas.paste(fitted, (paste_x, paste_y))

    draw = ImageDraw.Draw(canvas)
    header_bg = NAVY
    draw.rectangle((round(20 * sx), round(112 * sy), round(640 * sx), round(255 * sy)), fill=header_bg)
    draw.rectangle((round(650 * sx), round(112 * sy), round(1120 * sx), round(255 * sy)), fill=header_bg)
    draw.rectangle((round(1220 * sx), round(112 * sy), round(1580 * sx), round(250 * sy)), fill=header_bg)

    engine_type = (response.analysis.engine_type or "Automotive engine").upper()
    draw.text((round(28 * sx), round(122 * sy)), "AI ENGINE SCHEMATIC", font=_font(round(13 * sy)), fill=CYAN)
    draw.text((round(28 * sx), round(150 * sy)), engine_type[:34], font=_font(round(27 * sy), True), fill=WHITE)
    draw.text(
        (round(28 * sx), round(196 * sy)),
        response.image_context.image_type.replace("_", " "),
        font=_font(round(17 * sy)),
        fill=CYAN,
    )
    draw.text(
        (round(28 * sx), round(224 * sy)),
        f"VISUAL CONFIDENCE {response.image_context.confidence:.0%}",
        font=_font(round(13 * sy)),
        fill=MUTED,
    )
    draw.text((round(700 * sx), round(153 * sy)), "RENDER", font=_font(round(12 * sy)), fill=CYAN)
    draw.text((round(690 * sx), round(187 * sy)), "AI + PILLOW", font=_font(round(17 * sy), True), fill=WHITE)
    draw.text((round(880 * sx), round(153 * sy)), "FORMAT", font=_font(round(12 * sy)), fill=CYAN)
    draw.text((round(875 * sx), round(187 * sy)), "JPEG", font=_font(round(17 * sy), True), fill=WHITE)
    draw.text((round(1010 * sx), round(153 * sy)), "SHEET", font=_font(round(12 * sy)), fill=CYAN)
    draw.text((round(1005 * sx), round(187 * sy)), "01 / 01", font=_font(round(17 * sy), True), fill=WHITE)

    generated = datetime.now(UTC)
    draw.text((round(1342 * sx), round(122 * sy)), "DOCUMENT REFERENCE", font=_font(round(12 * sy)), fill=CYAN)
    draw.text((round(1280 * sx), round(153 * sy)), f"[AI-{generated:%Y%m%d}-ENG]", font=_font(round(18 * sy)), fill=WHITE)
    draw.text((round(1320 * sx), round(193 * sy)), "REV [01]", font=_font(round(13 * sy)), fill=MUTED)
    draw.text((round(1270 * sx), round(220 * sy)), f"GENERATED {generated:%d %b %Y}", font=_font(round(12 * sy)), fill=MUTED)

    components = _component_lookup(response, plan)
    engine_box = response.image_context.engine_bbox
    if engine_box is None:
        raise BlueprintCompositionError("Engine coordinates are missing from the analysis.")

    label_y = [344, 410, 476, 542]
    for index, component in enumerate(components):
        side_left = index < 4
        row = index if side_left else index - 4
        y = round(label_y[row] * sy)
        number = index + 1
        marker = " *" if component.possible_modification else ""
        label = f"{number:02d} {component.name.upper()[:22]}{marker}"
        label_x = round((28 if side_left else 1308) * sx)
        draw.rectangle(
            (
                label_x - round(3 * sx),
                y - round(3 * sy),
                label_x + round((292 if side_left else 260) * sx),
                y + round(22 * sy),
            ),
            fill=NAVY,
        )
        draw.text((label_x, y), label, font=_font(round(13 * sy), True), fill=WHITE)

        cx = (component.bbox.x1 + component.bbox.x2) / 2
        cy = (component.bbox.y1 + component.bbox.y2) / 2
        nx = max(0.0, min(1.0, (cx - engine_box.x1) / (engine_box.x2 - engine_box.x1)))
        ny = max(0.0, min(1.0, (cy - engine_box.y1) / (engine_box.y2 - engine_box.y1)))
        anchor = (
            round(paste_x + nx * fitted.width),
            round(paste_y + ny * fitted.height),
        )
        start = (round((300 if side_left else 1300) * sx), y + round(9 * sy))
        elbow = (round((340 if side_left else 1260) * sx), start[1])
        draw.line((start, elbow, anchor), fill=CYAN, width=max(1, round(1.4 * sx)))
        radius = max(2, round(3 * sx))
        draw.ellipse(
            (anchor[0] - radius, anchor[1] - radius, anchor[0] + radius, anchor[1] + radius),
            outline=WHITE,
            width=max(1, round(sx)),
        )

    draw.rectangle((round(18 * sx), round(896 * sy), round(1298 * sx), round(984 * sy)), fill=NAVY)
    draw.text((round(32 * sx), round(906 * sy)), "ENGINE", font=_font(round(11 * sy)), fill=CYAN)
    draw.text((round(32 * sx), round(931 * sy)), engine_type[:31], font=_font(round(16 * sy)), fill=WHITE)
    draw.text((round(320 * sx), round(906 * sy)), "VISIBLE COMPONENTS", font=_font(round(11 * sy)), fill=CYAN)
    draw.text((round(320 * sx), round(931 * sy)), str(len(response.analysis.components)), font=_font(round(16 * sy)), fill=WHITE)
    draw.text((round(520 * sx), round(906 * sy)), "ANNOTATED", font=_font(round(11 * sy)), fill=CYAN)
    draw.text((round(520 * sx), round(931 * sy)), str(len(components)), font=_font(round(16 * sy)), fill=WHITE)
    draw.text((round(720 * sx), round(906 * sy)), "MODIFICATION MARKER", font=_font(round(11 * sy)), fill=CYAN)
    draw.text((round(720 * sx), round(931 * sy)), "* VISUALLY IDENTIFIED", font=_font(round(14 * sy)), fill=WHITE)

    output = BytesIO()
    canvas.save(output, format="JPEG", quality=94, optimize=True, progressive=True)
    return output.getvalue()
