# SummerHacks Agent Guide

This repo is **MODBRANCH / BuildaMod**: a car-modification graph app. The core product lets a user search for a vehicle generation, open its build DAG, add build nodes, attach community posts/media, chat with AI about a node, and compare two build nodes through deterministic tool-backed logic.

## Project Shape

- `backend/` is a FastAPI API. Routes live in `backend/app/api/`, business logic in `backend/app/services/`, Pydantic contracts in `backend/app/models/schemas.py`, and storage adapters in `backend/app/repositories/`.
- `frontend/` is a Next.js 16 / React 19 app. App Router pages live in `frontend/src/app/`, feature components in `frontend/src/components/`, shared types in `frontend/src/lib/types.ts`, and API clients in `frontend/src/lib/api/`.
- `backend/db/schema.sql` is the Supabase Postgres schema. The local fallback store has the same collection/table names in `backend/app/repositories/store.py`.
- Seed/reference data lives in `backend/data/`: `generations.json`, `parts.json`, `seed_snapshot.json`, `vpic_cache.json`, and committed demo audio.
- There is an existing Next-generated `frontend/AGENTS.md`; keep its warning. Next may re-add that file during development.

## Commands

Backend:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
python -m pytest tests
```

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
```

Seeding:

```bash
cd backend
python scripts/seed.py
python scripts/seed_parts.py
```

The frontend defaults to `http://localhost:8000` through `NEXT_PUBLIC_API_URL`. Backend docs are at `http://localhost:8000/docs`.

## Environment

Backend settings are in `backend/app/core/config.py`. They read the shared root `.env`,
then `backend/.env` as an optional higher-precedence override.

- `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`: switch storage to Supabase Postgres.
- `SUPABASE_BUCKET`: storage bucket for community media, default `community-media`.
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`: optional durability layer for JSON storage.
- `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_TIMEOUT_SECONDS`: node chat and agentic compare model config.
- `GEMINI_API_KEY`, `GEMINI_VISION_MODEL`: engine-image blueprint visual analysis.
- `BLUEPRINT_COMPONENT_CONFIDENCE_THRESHOLD` and `BLUEPRINT_ENGINE_DETECTION_CONFIDENCE_THRESHOLD`: deterministic visibility gates.
- `CORS_ORIGINS`: comma-separated frontend origins.

Storage backend is visible at `GET /api/health`.

## Core Domain Rules

- A **Car** is a vehicle **generation**, not just a make/model. Use generation IDs such as `toyota-corolla-e170` as `carId`.
- A **Graph** is a flat DAG. There is no edge table/array in API responses; edges are derived from `node.parentIds`.
- A **Node** is one build state with exactly four mod slots: `engine`, `exhaust`, `wheels`, `brakes`.
- `mods` is the source of truth for mechanical state. Empty string means stock/unspecified in normal graph APIs.
- `attributes` are derived from `mods` via `services/tagging.py`; do not treat them as an independent vocabulary.
- The graph is layered by slot: root `0`, engine `1`, exhaust `2`, wheels `3`, brakes `4`.
- A normal node adds one deepest slot compared with its parent. Two `parentIds` means a merge.
- A **Post** is community input on a node. Its `kind` may be text/image/sketch/voice/video/blueprint, but `body` always carries text for search and AI.
- `transcribed: false` means uploaded media is still represented by placeholder text; UI should show processing rather than the placeholder.

## Backend Architecture

Controllers in `backend/app/api/graphs.py` and `backend/app/api/vehicles.py` should stay thin: resolve input, call one service, map missing results to HTTP errors.

Important services:

- `graph_service.py`: graph creation, node placement, stats, child lookup, fork counts.
- `vehicles.py`: vPIC-backed search and cache warming.
- `generations.py`: hand-curated generation data and generation slug resolution.
- `placement.py`: parent/slot/level selection for new nodes.
- `tagging.py`: converts `Mods` text into attribute tag IDs and grouped filter options.
- `community_service.py`: posts, replies, canvas position defaults, note counts.
- `media.py`: local/Supabase media storage and signed upload URLs.
- `transcription.py`: stub transcription; replace here to add real speech/vision.
- `chat_service.py` and `llm.py`: grounded node AI chat, with fallback responses when model calls fail.
- `ai_service.py`: `/ai/build-mod/{nodeId}` payload assembly for build-guide workflows.
- `agentic_compare.py`: LangChain orchestration for comparing supplied nodes.
- `compare_tools.py`: deterministic truth for comparing slots, mutating working state, exact part pricing, and validation.
- `blueprint_workflow.py`: LangGraph sequencing for engine-image blueprint stages.
- `engine_vision.py`: isolated Gemini multimodal structured-output integration.
- `blueprint_prompts.py`: provider prompts for blueprint AI stages.
- `parts.py`: catalogue browsing and exact-match price data.
- `analytics_service.py`: ecosystem dashboard rollups from real stored records.

Repository interface:

- Import storage as `from app.repositories import store`.
- Do not read/write `data/db.json` directly from services/routes.
- JSON, Upstash-backed JSON, and Supabase all expose `all_of`, `get`, `put`, `delete`, `find`, `find_one`, and `reset`.
- Supabase translation between camelCase API keys and snake_case DB columns happens only in `supabase_store.py`.

## Main API Surface

All app routes are under `/api`.

- `GET /vehicles/search?q=&limit=`: free-text search. Returns generation results.
- `GET /vehicles/cache`: vPIC cache status.
- `GET /cars`: list cars with graphs.
- `GET /cars/{carId}`: get one persisted car.
- `GET /cars/{carId}/graph`: get or create a graph shell by curated generation id.
- `GET /graph?make=&model=&generation=&year=`: get or create by name/year, useful for fallback cars.
- `GET /cars/{carId}/generations`: sibling generations for wrong-year switching.
- `GET /cars/{carId}/stats`: real counts.
- `GET /ecosystem/analytics?range=7d|30d|90d`: platform pulse dashboard data.
- `GET /attributes` and `GET /cars/{carId}/attributes`: full or in-use tag groups.
- `GET /cars/{carId}/parts`: part catalogue, optionally `?slot=engine&grouped=true`.
- `POST /cars/{carId}/nodes`: create a build node. Omit `parentIds` for auto-placement.
- `GET /nodes/{nodeId}`: node detail with `childIds` and posts.
- `GET/POST /nodes/{nodeId}/posts`: community posts.
- `POST /nodes/{nodeId}/posts/upload-url`: signed/direct upload flow.
- `POST /nodes/{nodeId}/posts/upload`: multipart upload flow.
- `GET /posts/{postId}`, `PATCH /posts/{postId}/position`.
- `GET/POST /posts/{postId}/replies`.
- `POST /nodes/{nodeId}/chat`: stateless AI chat; frontend sends recent history.
- `GET /nodes/{nodeId}/chat/suggestions`.
- `GET /ai/build-mod/{nodeId}`: structured build-guide payload.
- `POST /ai/compare`: compare two complete supplied nodes.
- `POST /blueprints/engine/analyze`: classify an engine image and return high-confidence visible component JSON.
- `POST /blueprints/engine/render`: accept the original image plus validated analysis JSON and return the composed `image/jpeg` blueprint artifact.

## Pydantic and TypeScript Contracts

Backend contracts are centralized in `backend/app/models/schemas.py`; frontend mirrors are in `frontend/src/lib/types.ts`.

Watch naming carefully:

- Graph APIs use camelCase: `carId`, `parentIds`, `createdAt`, `heroImage`.
- `/ai/compare` intentionally accepts snake_case complete nodes: `car_id`, `parent_ids`, `created_by`, `created_at`, `hero_image`.
- Normal graph `Mods` uses strings with `""` for empty. Compare `CompareMods` uses `string | null`.
- `Stats.totalNodes` is a computed alias of `builds`.
- `Reply.noteId` is a computed alias of `postId` for frontend naming.

When changing a contract, update both `schemas.py` and `frontend/src/lib/types.ts`, then check the API client functions in `frontend/src/lib/api/`.

## Database Schema

Supabase schema lives in `backend/db/schema.sql`; collection names also define local JSON storage.

Core tables:

- `cars`: one row per generation. Public read, service-role writes.
- `nodes`: graph nodes. `parent_ids` and `attributes` are `text[]`; `mods` and `stats` are `jsonb`.
- `posts`: community contributions with media metadata and canvas coordinates.
- `replies`: replies to posts.
- `parts` and `part_prices`: catalogue data and historical prices.

Structured build-estimate tables reserved for richer dependency-aware workflows:

- `modifications`, `node_modifications`, `modification_parts`, `modification_dependencies`.
- `service_tasks`, `modification_tasks`, `task_dependencies`.
- `build_estimate_runs`: legacy compatibility table; current `/ai/compare` returns `CompareResult` directly and does not populate it.

Important DB invariants:

- `nodes.parent_ids` cannot enforce foreign keys inside the array. If node deletion is added, children must be cleaned up transactionally or edges should move to a join table.
- `parts.car_id` intentionally has no FK to `cars` because parts can exist before a graph is opened.
- The backend owns writes through service-role credentials. Never expose `SUPABASE_SERVICE_KEY` to the frontend.

## Frontend Architecture

Primary pages:

- `/`: landing/search entry.
- `/search-bar`: search bar prototype page.
- `/ecosystem`: analytics dashboard.
- `/garage/[carId]`: graph/navigator view.
- `/garage/[carId]/node/[nodeId]`: node detail and community/AI tools.
- `/garage/[carId]/node/[nodeId]/contribution/[noteId]`: post/reply detail.
- `/beyond-reality`: Three.js visual experience.
- `/blueprints/engine`: engine-image upload, Gemini analysis, inspection overlays, blueprint preview, JPEG download, and generation-aware handoff into a new discussion node with the blueprint attached as a post.

Important component areas:

- `components/landing/`: homepage vehicle cards/search flow.
- `components/search/ModelSearchBar.tsx`: vehicle search UI.
- `components/graph/`: DAG rendering, node cards, branch edges, add/plant modals, compare panel.
- `components/navigator/`: garage-side filters, pulse strip, AI search bar.
- `components/node/`: node side/info panels and freeform mod canvas.
- `components/analytics/`: ecosystem dashboard cards/charts.
- `components/beyond-reality/`: Three.js scene and visual page styling.
- `components/blueprints/`: engine-image analyzer UI and normalized overlay rendering.

API layer:

- `frontend/src/lib/api/backend.ts` is the raw FastAPI client.
- `frontend/src/lib/api/index.ts` exposes app-facing functions. Some remain client-side mocks backed by live data, notably heuristic AI search and build-guide generation.
- `frontend/src/lib/api/compare.ts` handles `/ai/compare` conversion and error handling.

State/helpers:

- `frontend/src/lib/store.ts`: client state.
- `frontend/src/lib/graph-utils.ts` and `components/graph/layout.ts`: graph/layout helpers.
- `frontend/src/lib/media-url.ts`: media URL handling.

## AI and Compare Workflow

The node AI chat endpoint is grounded in the selected node's mod slots and transcribed community posts. It has no server-side session; the frontend sends previous turns as `history`.

The compare endpoint is intentionally stricter:

- The caller supplies both complete nodes. The backend does not fetch them.
- Nodes must be for the same `car_id`, or the route returns `400`.
- `AI_API_KEY` is required for `/ai/compare`, or it returns `503`.
- LangChain may choose tools, but app code determines changes, operations, prices, and validation.
- Part prices are exact-name matches only. Never fuzzy-match or estimate prices in `compare_tools.py`.
- The model's final prose is discarded; the API returns a deterministic `CompareResult`.

Engine blueprint analysis is a separate Gemini/LangGraph workflow. Analysis runs
`inspect_input_image -> analyze_engine`, with a conditional stop for invalid or
low-confidence engine detection. Generation runs `plan_blueprint -> generate_schematic
-> validate_schematic -> compose_blueprint`, with at most two image attempts. Nano
Banana produces engine artwork only; Pillow owns the fixed template, blue/white
normalization, labels, leader lines, markers, sizing, and final JPEG. Provider quota
exhaustion degrades to local contour rendering so the demo remains usable.
Exact known demo-image fingerprints are resolved through
`blueprint_demo_fixtures.py` and `data/blueprint_demo_fixtures.json`; keep these
fixtures limited to verified golden test assets so fallback data never leaks into
arbitrary user uploads.

## Development Rules for Agents

- Preserve the generation-first model. Do not collapse data to make/model only.
- Keep mod slots closed to `engine`, `exhaust`, `wheels`, `brakes` unless you are ready to update schemas, placement, tagging, UI filters, compare tools, seed data, and DB constraints together.
- Keep route handlers thin; put behavior in services.
- Keep all persistence behind `app.repositories.store`.
- Treat `attributes` as derived. If node creation changes, keep `tagging.tags_for(req.mods)` in the write path.
- Do not make the frontend talk directly to Supabase with service credentials.
- Read `frontend/AGENTS.md` before editing Next.js code. Next 16 has local docs in `frontend/node_modules/next/dist/docs/` after install.
- Be careful with existing uncommitted changes. This repo may already have dirty files; do not revert unrelated work.
- For backend behavior changes, prefer focused tests under `backend/tests/`.
- For frontend changes, run `npm run lint` and, when practical, `npm run build`.

## Known Current State

At the time this guide was written, `git status --short` showed existing modified files in backend services/data/tests and frontend garage/navigator/API files, plus untracked `Blueprint.png`. Treat those as user work unless your task explicitly targets them.
