"""Run the engine-analysis checkpoint against one local image.

    python scripts/analyze_engine_image.py path/to/engine-bay.jpg
    python scripts/analyze_engine_image.py path/to/engine-bay.jpg --blueprint out.jpg
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.api.blueprints import validate_engine_image  # noqa: E402
from app.services.blueprint_workflow import (  # noqa: E402
    analyze_engine_image,
    create_engine_blueprint,
)


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Detect an engine and print high-confidence component JSON."
    )
    parser.add_argument("image", type=Path)
    parser.add_argument(
        "--blueprint",
        type=Path,
        help="Also generate the validated blueprint document at this JPEG path.",
    )
    args = parser.parse_args()

    image_path = args.image.resolve()
    image_bytes = image_path.read_bytes()
    mime_type = validate_engine_image(image_path.name, image_bytes)
    result = await analyze_engine_image(image_bytes, mime_type)
    print(result.model_dump_json(indent=2))
    if args.blueprint:
        jpeg = await create_engine_blueprint(
            image_bytes,
            mime_type,
            analysis_response=result,
        )
        output_path = args.blueprint.resolve()
        output_path.write_bytes(jpeg)
        print(f"Blueprint JPEG: {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
