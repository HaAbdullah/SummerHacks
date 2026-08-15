# BuildaMod

BuildaMod is a full-stack car-modding community app built for SummerHacks. It lets users search for a vehicle, explore community build branches as a directed graph, inspect individual build nodes, add posts and replies, compare builds, generate AI-assisted build guides, and turn engine photos into blueprint-style analysis.

## What It Does

- Search vehicles by free text, backed by NHTSA vPIC data plus curated generation data.
- Open a garage view for a car and browse its build graph.
- Create branches and merge builds in a DAG-style mod tree.
- Track build mods across four slots: engine, exhaust, wheels, and brakes.
- Add community posts, uploads, replies, voice notes, images, sketches, videos, and blueprints.
- Ask a node-level AI chatbox questions grounded in that node's mods and community notes.
- Compare two builds and calculate deterministic add, replace, remove, and pricing changes.
- Generate evidence-grounded transition build guides between two nodes.
- Analyze engine images with Gemini and render blueprint-style output.
- View platform analytics and car-level activity stats.

## Tech Stack

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- React Flow via `@xyflow/react`
- Dagre graph layout
- Framer Motion
- Zustand
- Three.js / React Three Fiber for the Beyond Reality view

### Backend

- FastAPI
- Pydantic and pydantic-settings
- Local JSON storage by default
- Optional Supabase storage
- Optional Upstash REST Redis durability for local JSON deployments
- LangChain / LangGraph for AI workflows
- OpenAI-compatible chat API for node chat, compare orchestration, and build guides
- Gemini for engine-image blueprint analysis and image generation

## Project Structure

```text
.
+-- frontend/                 # Next.js app
|   +-- src/app/              # Routes: landing, garage, ecosystem, blueprints
|   +-- src/components/       # Graph, node, landing, analytics, blueprint UI
|   +-- src/lib/              # API clients, types, graph helpers, state
+-- backend/                  # FastAPI service
|   +-- app/api/              # Route registration and controllers
|   +-- app/core/             # Settings and configuration
|   +-- app/models/           # Pydantic schemas
|   +-- app/repositories/     # JSON/Supabase storage boundary
|   +-- app/services/         # Business logic and AI workflows
|   +-- data/                 # Seed data, parts, generations, fixtures
|   +-- db/                   # Supabase schema
|   +-- scripts/              # Seed, preflight, cache, and analysis helpers
|   +-- tests/                # Pytest coverage for core workflows
+-- scripts/                  # Shared environment setup scripts
+-- Blueprint.png             # Blueprint render template
+-- render.yaml               # Render deployment config
```

## Quick Start

### 1. Create Environment Files

From the repo root:

```powershell
.\scripts\setup-env.ps1
```

On macOS/Linux:

```bash
./scripts/setup-env.sh
```

This creates the root, backend, and frontend environment files from the checked-in examples.

### 2. Start The Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/seed.py
python scripts/seed_parts.py
uvicorn app.main:app --reload --port 8000
```

Backend URLs:

- API root: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

### 3. Start The Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

- App: http://localhost:3000

## Environment Variables

The app runs without paid services if AI features are not needed. By default, storage falls back to local JSON.

Important variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000

AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

GEMINI_API_KEY=
GEMINI_VISION_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_BUCKET=community-media

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Notes:

- `AI_API_KEY` enables the AI chatbox, AI compare orchestration, and transition build guides.
- `GEMINI_API_KEY` enables engine-image analysis and blueprint rendering.
- Leaving Supabase blank uses the local JSON store.
- Setting both Supabase values switches storage to Supabase.
- Setting both Upstash values keeps JSON-backed writes durable on hosts with temporary disks.

## Main Frontend Routes

- `/` - Landing page and vehicle search.
- `/garage/[carId]` - Main build graph view for a vehicle.
- `/garage/[carId]/node/[nodeId]` - Build node detail view.
- `/garage/[carId]/node/[nodeId]/contribution/[noteId]` - Community contribution detail.
- `/ecosystem` - Platform analytics dashboard.
- `/blueprints/engine` - Engine image analyzer and blueprint renderer.
- `/beyond-reality` - 3D/immersive car experience.
- `/search-bar` - Search component demo route.

## Main API Endpoints

Base URL: `http://localhost:8000/api`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check and active storage backend |
| GET | `/vehicles/search?q=` | Vehicle and generation search |
| GET | `/cars/{carId}/graph` | Get or create a car build graph |
| GET | `/graph?make=&model=&generation=&year=` | Get or create graph by vehicle name |
| GET | `/cars/{carId}` | Get one car |
| GET | `/cars/{carId}/stats` | Car activity and graph stats |
| GET | `/cars/{carId}/parts` | Parts catalogue for a car |
| GET | `/cars/{carId}/attributes` | Attribute filters used by a car |
| GET | `/attributes` | Full attribute taxonomy |
| POST | `/cars/{carId}/nodes` | Create a build node or merge |
| GET | `/nodes/{nodeId}` | Get a node with posts and children |
| GET | `/nodes/{nodeId}/posts` | List node posts |
| POST | `/nodes/{nodeId}/posts` | Create a post |
| POST | `/nodes/{nodeId}/posts/upload` | Upload media for a post |
| PATCH | `/posts/{postId}/position` | Move a post on the canvas |
| GET | `/posts/{postId}/replies` | List contribution replies |
| POST | `/posts/{postId}/replies` | Add a reply |
| POST | `/nodes/{nodeId}/chat` | Ask node-grounded AI chat |
| GET | `/nodes/{nodeId}/chat/suggestions` | Generate node chat prompts |
| POST | `/ai/compare` | Compare two complete nodes |
| POST | `/ai/build-guide` | Generate A-to-B transition guide |
| GET | `/ecosystem/analytics?range=` | Platform analytics |
| POST | `/blueprints/engine/analyze` | Analyze an uploaded engine image |
| POST | `/blueprints/engine/render` | Render a blueprint JPEG from analysis |

See `backend/API.md` for detailed request and response examples.

## Common Commands

### Backend

```powershell
cd backend
python scripts/seed.py
python scripts/seed_parts.py
python -m pytest tests
uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm run dev
npm run lint
npm run build
```

## Data And Storage

The backend is designed around a repository boundary:

- `backend/app/repositories/store.py` owns the local JSON storage path.
- `backend/app/repositories/supabase_store.py` owns the Supabase implementation.
- Services and routes do not need to know which backend is active.

Seed data lives in:

- `backend/data/generations.json` - Curated vehicle generations.
- `backend/data/parts.json` - Parts catalogue.
- `backend/data/seed_snapshot.json` - Demo graph/community data snapshot.
- `backend/data/blueprint_demo_fixtures.json` - Engine blueprint demo fixtures.

## AI Features

The app separates deterministic application logic from model calls:

- Node chat uses an OpenAI-compatible chat endpoint and falls back to useful canned responses when the key is missing.
- Build comparison uses deterministic tools for slot diffs, mutations, pricing, and validation.
- Transition build guides gather graph/community evidence before generating structured stages.
- Engine blueprint analysis uses Gemini for multimodal understanding, then filters low-confidence components before rendering.

## Testing

Backend tests cover compare tools, build-guide behavior, and blueprint analysis workflows:

```powershell
cd backend
python -m pytest tests
```

Frontend linting:

```powershell
cd frontend
npm run lint
```

## Deployment Notes

- `render.yaml` contains Render deployment configuration.
- `backend/vercel.json` contains backend-specific Vercel configuration.
- `backend/DEPLOY.md` has backend deployment notes.
- For persistent production storage, configure Supabase.
- For temporary demos without Supabase, configure Upstash to preserve JSON-backed writes across deploy sleeps.

## More Documentation

- `backend/API.md` - Full API contract and examples.
- `backend/README.md` - Backend setup and vPIC vehicle search notes.
- `backend/db/README.md` - Database notes.
- `IMPLEMENTATION_GUIDE.md` - Original frontend implementation guide.
- `AGENT.md`, `frontend/AGENTS.md`, `frontend/CLAUDE.md` - Agent and collaboration notes.
