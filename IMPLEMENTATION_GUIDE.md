# MODBRANCH — Frontend Implementation Guide

A community car-modding platform structured like version control: users look up a car, explore a growing tree of community build variants ("branches"), open any node to see community build notes (images, sketches, voice clips, text), fork their own branches, merge branches into fusions, and use AI search + AI build-guide generation to act on what they find.

**This build is frontend-only with mocked data and a mock API layer.** The backend team will swap the API layer later — the contract is defined in §4. Target: a polished, demo-ready Next.js app.

**Read DESIGN.md alongside this file. It is the source of truth for all colors, type, spacing, and motion. Do not invent visual styles.**

---

## 1. Stack

- Next.js 14+ (App Router), TypeScript, Tailwind CSS
- `@xyflow/react` (React Flow) — graph canvas, pan/zoom, custom nodes
- `@dagrejs/dagre` — top-down DAG layout computation
- `framer-motion` — all UI animation outside the canvas
- `zustand` — client state (selected node, active filters, overlay state)
- No component library. Custom components styled per DESIGN.md.

Desktop-first. Minimum supported width 1280px. Do not spend time on mobile.

## 2. File structure

```
app/
  layout.tsx            // fonts, global shell
  page.tsx              // landing: car search
  garage/[carId]/page.tsx  // main dashboard (graph view + navigator)
components/
  landing/CarSearch.tsx
  graph/TreeCanvas.tsx      // React Flow wrapper
  graph/BuildNode.tsx       // custom node component
  graph/BranchEdge.tsx      // custom edge component
  graph/layout.ts           // dagre layout function
  navigator/AttributePanel.tsx
  navigator/AiSearchBar.tsx
  navigator/PulseStrip.tsx
  node/NodeOverlay.tsx      // full node view (animated overlay)
  node/NotesFeed.tsx
  node/NoteComposer.tsx
  node/MediaNote.tsx        // renders image | sketch | voice | video | text
  node/BuildGuideModal.tsx  // AI build guide output
lib/
  api/index.ts          // THE mock API contract (see §4)
  api/seed.ts           // seed data (see §5)
  store.ts              // zustand store
  types.ts              // shared types (see §3)
```

## 3. Data model (lib/types.ts)

The structure is a **DAG, not a tree** — merge nodes have multiple parents. This is non-negotiable; the merge/fusion feature depends on it.

```ts
export type MediaKind = 'text' | 'image' | 'sketch' | 'voice' | 'video';

export interface Note {
  id: string;
  nodeId: string;
  author: string;         // display name
  avatarColor: string;    // hex, deterministic from author
  kind: MediaKind;
  body?: string;          // text content or caption
  mediaUrl?: string;      // object URL or seed asset path
  durationSec?: number;   // voice/video
  createdAt: string;      // ISO
}

export interface BuildNodeData {
  id: string;
  carId: string;
  title: string;            // e.g. "Trail Spec + 2in Lift"
  parentIds: string[];      // [] = root, length 2 = fusion/merge
  attributes: string[];     // tag ids from the taxonomy, e.g. ["offroad","lift-kit"]
  summary: string;          // one-line description
  heroImage?: string;       // representative render
  stats: {
    forks: number;          // direct children count
    notes: number;
    contributors: number;
    heat: number;           // 0..1 activity score — drives node glow/size
  };
  createdBy: string;
  createdAt: string;
}

export interface Car {
  id: string;               // "toyota-corolla"
  make: string; model: string; yearRange: string;
  rootNodeId: string;
}

export interface AttributeGroup {   // powers the left navigator
  id: string; label: string;
  options: { id: string; label: string }[];
}

export interface BuildGuide {       // AI build output (mocked)
  nodeId: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estCost: string; estTime: string;
  parts: { name: string; note: string; approxPrice: string }[];
  steps: { title: string; detail: string }[];
  renderImage?: string;
}
```

## 4. Mock API contract (lib/api/index.ts)

Every data access in the app goes through these functions and **nowhere else**. Each returns a Promise resolving after a 150–400ms randomized delay (simulates network, exercises loading states). Backend swaps the internals for `fetch` calls later — the table below is the agreed contract.

```ts
searchCars(query: string): Promise<Car[]>
getCar(carId: string): Promise<Car>
getGraph(carId: string): Promise<BuildNodeData[]>        // full DAG for the car
getNode(nodeId: string): Promise<BuildNodeData>
getNotes(nodeId: string): Promise<Note[]>
addNote(nodeId: string, note: Omit<Note,'id'|'createdAt'>): Promise<Note>
createBranch(parentIds: string[], input: {title: string; attributes: string[]; summary: string}): Promise<BuildNodeData>
aiSearch(carId: string, query: string): Promise<{ nodeIds: string[]; explanation: string }>
generateBuildGuide(nodeId: string): Promise<BuildGuide>
getAttributeGroups(carId: string): Promise<AttributeGroup[]>
getPulse(carId: string): Promise<{ totalNodes: number; contributions24h: number; contributors: number; hottestNodeId: string }>
```

Future REST mapping (for the backend team — keep this table in the file as a comment):

| Function | Method + path |
|---|---|
| searchCars | GET /api/cars?q= |
| getGraph | GET /api/cars/:carId/graph |
| getNode / getNotes | GET /api/nodes/:id, GET /api/nodes/:id/notes |
| addNote | POST /api/nodes/:id/notes |
| createBranch | POST /api/branches |
| aiSearch | POST /api/ai/search |
| generateBuildGuide | POST /api/ai/build-guide |
| getPulse | GET /api/cars/:carId/pulse |

Mock behavior notes:
- `aiSearch` does keyword matching against node titles + attribute labels + summaries, returns matching nodeIds ranked by heat, plus a canned natural-language explanation like "Found 2 builds matching red wrap + V8 swap. The hottest is Tiger Spec V8 with 14 contributors."
- `createBranch` and `addNote` mutate an in-memory copy of the seed data (module-level variable) so the demo feels live within a session. No persistence.
- `generateBuildGuide` returns one of 3 pre-written guides keyed by branch family (offroad / street / sleek), personalized by injecting the node's title and attributes into the template. Simulate 2.5s of "generation" — the UI stages this (§9).

## 5. Seed data (lib/api/seed.ts)

One car: **Toyota Corolla (2018–2024)**. `searchCars` matches it for any query containing "cor", "toy", etc. Any other car query returns a car object but its garage page shows an inviting empty state ("Be the first to plant this tree" — do build this state, it's a 20-minute job and sells the concept).

Build **~30 nodes, max depth 5, exactly one merge**, structured as:

```
ROOT: "Stock Corolla" (heat 1.0, the trunk)
├── OFF-ROAD  "Trail Spec"
│   ├── "Trail Spec + 2in Lift"
│   │   ├── "Lifted / Red Dirt" (red wrap)  ← high heat
│   │   │   └── "Tiger Spec V8" (V8 swap, red wrap, tiger livery, 
│   │   │        LED dash) ← THE DEMO HERO NODE, highest heat
│   │   └── "Lifted / Arctic Blue"
│   │       ├── "Arctic + Full Wrap"
│   │       └── "Arctic / No Wrap"
│   └── "Overland Camper" (roof rack, tent)
├── STREET  "City Commuter"
│   ├── "Stanced Daily" (lowered, camber)
│   │   └── "Stanced / Neon Underglow"
│   └── "Eco Tuner"
├── SLEEK  "VIP Sleek"
│   ├── "Murdered Out" (black wrap, tint)
│   │   └── "Murdered Out / Widebody"
│   └── "Chrome Delete"
├── "Batmobile" (community-created wildcard branch)
│   └── "Batmobile / Fins + Afterburner"
└── MERGE: "Night Runner" — parents: ["Murdered Out", "Stanced / Neon
    Underglow"] — the fusion demo. Black widebody + underglow.
```

Fill remaining nodes as additional leaves to reach ~30. Vary `heat` 0.1–1.0 so the canvas has visible hot and cold regions. Give every node 2–6 seeded notes with mixed kinds: text notes with authentic forum voice ("swapped to 15x8 -20 offset, rubs on full lock, rolling fenders this weekend"), images (use `https://picsum.photos/seed/{nodeId}-{n}/800/500` so every node gets distinct stable images), one sketch (same picsum approach, label it as sketch), 2–3 voice notes across the dataset (`durationSec` set; player UI renders a fake waveform — actual audio playback not required for demo, the composer's recorded clips DO play back, see §8), one video note on the hero node.

Attribute taxonomy (`getAttributeGroups`), one group per row:

- **Style**: Off-road, Street, Sleek, Wildcard
- **Wrap**: Red, Blue, Black, None
- **Engine**: Stock, Turbo, V8 swap
- **Stance**: Lifted, Lowered, Stock height
- **Extras**: LED dash, Underglow, Widebody, Roof rack, Livery

Every node's `attributes` array uses these option ids. The hero node "Tiger Spec V8" carries: offroad, red, v8, lifted, led-dash, livery — so the demo search "red wrap v8" resolves to it.

## 6. Graph view (the right ~65% of the dashboard)

`TreeCanvas.tsx` wraps React Flow:

- On load, fetch `getGraph`, run nodes through `layout.ts` (dagre, `rankdir: 'TB'`, `nodesep: 40`, `ranksep: 90`), map to React Flow nodes/edges, then `fitView` with a 600ms eased zoom. Nodes are **not draggable**; panning and zooming are enabled; hide the default attribution-adjacent controls and build custom zoom buttons (bottom-right) per DESIGN.md.
- `BuildNode.tsx` (custom node): a "build plate" card — title, up to 3 attribute chips, fork/note counts, heat glow (see DESIGN.md §Node states). Size scales subtly with heat: `scale(0.9 + heat*0.25)`.
- Merge nodes (parentIds.length > 1) get the fusion treatment defined in DESIGN.md and a "FUSION" tag.
- `BranchEdge.tsx`: smoothstep bezier edges. Default state, highlighted state, and dimmed state per DESIGN.md. Highlighted edges run the animated dash ("fuel line").
- **Click node** → zustand `selectNode(id)` → camera animates to center it (`setCenter(x, y, { zoom: 1.1, duration: 500 })`) → NodeOverlay opens (§8).
- **Hover node** → raise glow + highlight the full ancestor path back to root (compute once, memoized).
- Right-click (or a "+ Fork" button on the node plate) → small popover to create a child branch: title, attribute picker, summary → `createBranch` → new node animates in (layout re-runs; animate positions with React Flow's node position transitions, 500ms).
- **Merge interaction (demo-cheap version):** a "Merge mode" toggle in the canvas toolbar. When on, clicking two nodes selects them (both get the fusion outline), then a floating "Fuse these builds" button appears → creates a merge node via `createBranch` with both parentIds. Keep it this simple.

## 7. Navigator panel (the left ~35%)

Top to bottom: `AiSearchBar`, `PulseStrip`, `AttributePanel`.

**AttributePanel** — the attribute groups as labeled chip rows. Multi-select. Selection logic: within a group = OR, across groups = AND. Result: the matching node-id set. Matching nodes + the edges of paths connecting them to the root stay full-strength; everything else dims to the dimmed state (DESIGN.md). **Never remove nodes from the canvas.** Show a live count ("7 builds match") with a clear-all link. Animate the dim/undim with a 300ms transition.

**AiSearchBar** — free-text input, placeholder "Describe a build… 'red wrap, V8 swap'". On submit: shimmer state (~1s) → `aiSearch` → dim everything except results, camera flies to the top result, and a floating result card appears anchored near it: the explanation text + a **"⚡ AI Build Guide"** button. That button triggers §9. Esc or canvas click dismisses.

**PulseStrip** — a compact horizontal stat band from `getPulse`: total builds, contributions (24h), contributors, and "🔥 Hottest: Tiger Spec V8" (clicking it flies the camera there). Numbers count up on mount (800ms). This is the "surface the usage data" judging criterion — keep it always visible.

## 8. Node overlay (NodeOverlay.tsx)

Opens when a node is selected. **An overlay, not a route.** Choreography and layout per DESIGN.md §Node view. Structure:

- Header: node title, attribute chips, breadcrumb of lineage (root → … → this node; each crumb clickable → flies camera + switches overlay). For fusion nodes show both lineages joined by a "+".
- Hero: heroImage if present, else a generated gradient plate from the node's attribute colors.
- Stats row: forks / notes / contributors / heat as a small bar.
- Actions: "＋ Fork this build", "⚡ AI Build Guide".
- `NotesFeed`: chronological community notes, each rendered by `MediaNote` — text (plate-style card), image/sketch (rounded, caption), voice (play button + static waveform SVG + duration; seeded clips don't need real audio, user-recorded ones play via the object URL), video (thumbnail + play).
- `NoteComposer` pinned at bottom: text input plus icon buttons — 📷 image (file input → object URL), ✏️ sketch (inline 320px-tall canvas: black brush, 3 widths, clear + attach; export via `canvas.toDataURL`), 🎙️ voice (MediaRecorder → object URL; recording state shows a pulsing red dot + elapsed time; if permission fails, gracefully attach a seeded fallback clip). Submitting calls `addNote` and the note animates into the feed. Author is "You" with a fixed avatar color.

## 9. AI Build Guide (BuildGuideModal.tsx)

Triggered from search result card or node overlay. This is the demo finale — stage it:

1. Modal opens on the generating state: the node's attribute chips animate in one by one, then three checklist lines tick sequentially ("Analyzing 14 community notes…", "Sourcing parts…", "Rendering build…") over ~2.5s while `generateBuildGuide` resolves.
2. Content reveals: title + difficulty/cost/time band, parts table, numbered steps, and the render image (`https://picsum.photos/seed/{nodeId}-render/1000/560` labeled "AI render — concept"). A disabled-styled "Export PDF" button (tooltip: "coming soon") is fine.

## 10. Landing page (CarSearch.tsx)

Minimal and confident: wordmark, one large search input, type-ahead via `searchCars`, and 3 suggestion chips ("Toyota Corolla", "Honda Civic", "Mazda Miata"). Selecting navigates to `/garage/[carId]`. Corolla is the only populated garage; others land on the empty state. Style per DESIGN.md §Landing.

## 11. State (lib/store.ts)

Zustand: `selectedNodeId`, `overlayOpen`, `activeFilters: Record<groupId, string[]>`, `searchResult: {nodeIds, explanation} | null`, `mergeMode: boolean`, `mergeSelection: string[]`, `guideOpenFor: string | null`. Server data lives in simple fetch-on-mount hooks with loading flags — do not add react-query; it's overkill here.

## 12. Build order (checkpoints)

1. Types + seed data + mock API. **Checkpoint: log the graph to console.**
2. TreeCanvas + dagre layout + BuildNode plates rendering the seed DAG, pan/zoom/fitView. **Checkpoint: the tree looks right, merge node shows two parent edges.**
3. Node click → camera fly → NodeOverlay with NotesFeed (read-only).
4. AttributePanel dim/highlight + PulseStrip.
5. AiSearchBar flow + BuildGuideModal.
6. NoteComposer (text + image first, then sketch, then voice).
7. Fork + merge interactions. Landing page. Polish pass against DESIGN.md.

Ship after any checkpoint ≥4 if time runs out — the demo works from there.

## 13. Demo script (what this must support)

Land → search "corolla" → tree blooms into view → hover branches (paths light up) → filter Style: Off-road + Wrap: Red (tree dims to the red-dirt lineage) → click Tiger Spec V8 → overlay opens, scroll community notes, record/attach a note → clear filters → AI search "red wraps, v8 engine" → camera flies to Tiger Spec V8 → ⚡ AI Build Guide → staged generation → guide reveal → close, toggle merge mode, fuse two builds → new fusion node animates in → point at PulseStrip. End.
