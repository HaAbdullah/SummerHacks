# MODBRANCH API

Base URL `http://localhost:8000/api` · Swagger `http://localhost:8000/docs`

```bash
cd backend
.venv/Scripts/python.exe scripts/seed.py                          # writes data/db.json
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

Demo car id: `toyota-corolla-e170`. Demo merge node: `n-rally` (two parents).

## Vehicle search — start here

```
GET /api/vehicles/search?q=2018 toyota corolla
```

```json
{
  "query": "2018 toyota corolla",
  "results": [
    {
      "id": "toyota-corolla-e170",
      "label": "Toyota Corolla · E170 (2014–2019)",
      "make": "Toyota",
      "model": "Corolla",
      "generation": "E170",
      "yearStart": 2014,
      "yearEnd": 2019,
      "years": "2014–2019",
      "heroImage": null,
      "curated": true,
      "matchedYear": 2018
    }
  ]
}
```

**Results are GENERATIONS, not years** — a 2015 and a 2022 Corolla take different parts,
so the generation is the unit a build graph hangs off. A typed year resolves straight to
the generation covering it; without one, every generation is offered.

**`id` is the `carId`** every graph endpoint takes. Click a result → `GET
/api/cars/{id}/graph`.

`curated: false` means we have no generation data for that car and it fell back to a
single open-ended "All years" entry. Label it differently rather than implying real
generation data.

Handles `2018 toyota corolla`, `corolla`, `miata`, `mustang`, `golf gti`, `bmw m3`, plus
nicknames (`chevy`, `vw`). Returns `[]` under two characters, so it is safe per keystroke.

---

## The three structures

**Graph (DAG)** — one per car. Holds nodes. **Edges are derived from `node.parentIds`**,
there is no separate edges array. One parent = a fork, two = a merge.

**Node** — one build. Four mod slots, nothing else: `engine`, `exhaust`, `wheels`,
`brakes`. Every node has a custom string id used by every other call.

### The graph is layered — one slot per level

| level | slot | example |
|---|---|---|
| 0 | — | Stock Corolla |
| 1 | `engine` | Turbo |
| 2 | `exhaust` | Turbo · 3in Catback |
| 3 | `wheels` | Turbo · Street Wheels |
| 4 | `brakes` | Turbo Daily |

A node adds **exactly one slot** to its parent and repeats the rest verbatim, so walking
down a branch reads as one decision per step. Every node carries `slot` and `level` —
render layers straight off those rather than computing depth.

`createNode` enforces this: a build's slot is the deepest one it fills, and its parent is
the node carrying the same mods minus that slot.

**Merges are the exception.** Passing two `parentIds` creates a fusion, which by
definition draws from two branches and cannot sit on one layer. `n-rally` is the demo case.

**Post** — one community contribution on a node: image, sketch, voice, video, blueprint
or text. Whatever the kind, it is stored with a text `body`, so search and AI only ever
handle text.

### Two views of the same four slots

| Field | Shape | For |
|---|---|---|
| `mods` | `{engine, exhaust, wheels, brakes}` free text | Ahmed's AI, the diff, placement |
| `attributes` | `string[]` of tag ids | The filter panel |

`attributes` is **derived from `mods`** on write — it is not a second vocabulary. Every
tag traces back to one slot (`engine-turbo`, `brakes-bbk`, `wheels-allterrain`).

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/vehicles/search?q=` | **Search** — free text → generations |
| GET | `/cars/{carId}/graph` | **getDAG** by generation id — creates on first visit |
| GET | `/graph?make=&model=&generation=&year=` | getDAG by name |
| GET | `/cars/{carId}/generations` | Sibling generations — a "wrong year?" switcher |
| GET | `/cars/{carId}/parts` | Real parts with prices, from the `parts` table |
| GET | `/cars` | All cars that have a graph |
| GET | `/cars/{carId}` | One car |
| GET | `/cars/{carId}/stats` | **getStats** — real counts |
| GET | `/attributes` | **getAttributes** — full tag vocabulary |
| GET | `/cars/{carId}/attributes` | **getAttributes** for one car — tags in use, with counts |
| POST | `/cars/{carId}/nodes` | **createNode** — auto-places if `parentIds` omitted |
| GET | `/nodes/{nodeId}` | **getNode** — build + posts + children |
| GET | `/nodes/{nodeId}/posts` | Posts on a node |
| POST | `/nodes/{nodeId}/posts` | Create a post |
| GET | `/posts/{postId}` | One post |
| PATCH | `/posts/{postId}/position` | Move a post on the canvas |
| GET | `/posts/{postId}/replies` | **getReply** |
| POST | `/posts/{postId}/replies` | **addReply** |
| GET | `/ai/build-mod/{nodeId}` | **getBuildModAI** (Ahmed) |
| POST | `/ai/compare` | LangChain-orchestrated, deterministically validated node comparison |

There is no `createDAG` to call — both graph routes create on miss, so the frontend can
never forget it. Opening a generation nobody has modded yet returns a graph with just its
stock root, ready to build on.

---

## GET `/cars/toyota-corolla-e170/graph` — getDAG

```json
{
  "car": {
    "id": "toyota-corolla-e170",
    "make": "Toyota",
    "model": "Corolla",
    "generation": "E170",
    "yearStart": 2014,
    "yearEnd": 2019,
    "yearRange": "2014–2019",
    "heroImage": null,
    "rootNodeId": "n-root"
  },
  "nodes": [
    {
      "id": "n-rally",
      "carId": "toyota-corolla-e170",
      "title": "Turbo Rally Build",
      "parentIds": ["n-track-weapon", "n-gravel-rally"],
      "attributes": ["brakes-bbk", "brakes-pads", "engine-swap", "engine-turbo", "exhaust-other", "wheels-allterrain"],
      "mods": {
        "engine": "Built bottom end, forged rods and pistons, GT3071R at 14psi for reliability",
        "exhaust": "3.5in high-clearance turbo-back",
        "wheels": "16in gravel-spec, 215/65 all-terrain",
        "brakes": "4-pot front, rally pads, hydraulic handbrake"
      },
      "summary": "Fusion: built turbo motor on gravel geometry. Detuned for reliability.",
      "heroImage": "https://picsum.photos/seed/n-rally-hero/1000/560",
      "stats": { "forks": 0, "notes": 2, "contributors": 1, "heat": 0.95 },
      "createdBy": "kshitij",
      "createdAt": "2026-08-05T00:56:18Z",
      "isRoot": false,
      "slot": "brakes",
      "level": 4
    }
  ]
}
```

**Two `parentIds` = a merge.** Draw an edge from each parent to this node.

---

## GET `/nodes/n-turbo-3in` — getNode

Everything above, plus:

```json
{
  "childIds": ["n-turbo-street"],
  "posts": [
    {
      "id": "post-rev-1",
      "nodeId": "n-turbo-3in",
      "author": "ahmed",
      "avatarColor": "hsl(200 45% 42%)",
      "kind": "voice",
      "title": "Corolla revving — 8psi spool",
      "body": "Transcript: cold start, then three pulls to redline. The turbo spools around 3200rpm…",
      "mediaUrl": null,
      "durationSec": 27,
      "transcribed": true,
      "createdAt": "2026-07-19T10:56:18Z",
      "canvasX": 152.0,
      "canvasY": 144.0,
      "canvasW": 240.0,
      "canvasH": 96.0,
      "replyCount": 1
    }
  ]
}
```

`kind` ∈ `text | image | sketch | voice | video | blueprint`.

**`transcribed: false`** means media was uploaded but not yet converted — `body` holds a
placeholder. Show a processing state, not the placeholder text.

---

## GET `/cars/toyota-corolla-e170/stats` — getStats

Every number is counted from stored records. Nothing is estimated.

```json
{
  "carId": "toyota-corolla-e170",
  "builds": 15,
  "mods": 36,
  "contributors": 5,
  "active24h": 3,
  "posts": 13,
  "replies": 5,
  "merges": 1,
  "modsBySlot": {
    "engine": 14,
    "exhaust": 11,
    "wheels": 7,
    "brakes": 4
  },
  "postsByKind": {
    "voice": 3,
    "text": 4,
    "image": 3,
    "sketch": 1,
    "video": 1,
    "blueprint": 1
  },
  "deepestChain": 5,
  "hottestNodeId": "n-root"
}
```

`builds` is the node count. `mods` is filled slots across every node. `contributors` is
distinct people across nodes, posts and replies. `active24h` is distinct people who did
anything in the last 24 hours.

---

## POST `/cars/toyota-corolla-e170/nodes` — createNode

```json
{
  "title": "Turbo + Big Brakes",
  "mods": {
    "engine": "2ZR-FE, Garrett GT2860 turbo, 8psi, front-mount intercooler",
    "exhaust": "3in downpipe, catless, 3in catback",
    "brakes": "Brembo 6-pot front, 355mm rotors"
  },
  "summary": "Turbo build with a proper big brake kit.",
  "createdBy": "kshitij"
}
```

**Omit `parentIds` and the server places the build itself**, on the layer its deepest
slot belongs to. The build above fills `engine` and `brakes`, so its slot is `brakes`
(level 4) and its parent is the node carrying the same engine with no brakes yet.

Pass `parentIds` explicitly to override — two ids forces a merge.

Returns **201** with the created node, plus `slot`, `level`, and derived `attributes`.

---

## POST `/nodes/n-turbo-3in/posts`

```json
{
  "kind": "voice",
  "title": "Corolla revving cold start",
  "mediaUrl": "https://example.com/rev.webm",
  "durationSec": 22,
  "author": "shoaib"
}
```

Returns 201. With no `body`, the transcription service fills it and sets
`transcribed: false`:

```json
{
  "body": "[Voice note pending transcription: Corolla revving cold start]",
  "transcribed": false,
  "canvasX": 1016.0, "canvasY": 80.0, "canvasW": 240.0, "canvasH": 96.0
}
```

Canvas position is hashed from the post id, so a post does not jump on reload. Send your
own `canvasX/Y/W/H` to override.

## POST `/posts/{postId}/replies` — addReply

```json
{ "body": "Sounds healthy.", "author": "ahmed" }
```

```json
{
  "id": "reply-post-n-turbo-875532",
  "postId": "post-n-turbo-875532",
  "author": "ahmed",
  "avatarColor": "hsl(200 45% 42%)",
  "body": "Sounds healthy.",
  "createdAt": "2026-08-08T12:00:00Z"
}
```

---

## GET `/attributes` — getAttributes

Four groups in layer order. Filter a node by testing
`node.attributes.includes(optionId)`.

```json
[
  {
    "id": "engine",
    "label": "Engine",
    "level": 1,
    "options": [
      { "id": "engine-stock", "label": "Stock" },
      { "id": "engine-boltons", "label": "Bolt-ons" },
      { "id": "engine-turbo", "label": "Turbo" },
      { "id": "engine-supercharger", "label": "Supercharged" },
      { "id": "engine-swap", "label": "Engine swap" },
      { "id": "engine-other", "label": "Other" }
    ]
  }
]
```

`level` matches the graph layer that slot occupies, so the panel can be ordered to mirror
the tree.

## GET `/cars/toyota-corolla-e170/attributes` — getAttributes for one car

Same shape, but **only tags some node actually carries**, each with a count. Filtering on
an unused tag would empty the graph, so those are dropped.

```json
[
  {
    "id": "engine",
    "label": "Engine",
    "level": 1,
    "options": [
      { "id": "engine-boltons", "label": "Bolt-ons",   "count": 2 },
      { "id": "engine-turbo",   "label": "Turbo",      "count": 12 },
      { "id": "engine-swap",    "label": "Engine swap", "count": 8 }
    ]
  }
]
```

---

## GET `/cars/toyota-corolla-e170/parts`

Real parts with real prices, stored in the `parts` table. Grouped by mod slot:

```json
{
  "carId": "toyota-corolla-e170",
  "slots": {
    "engine": [
      {
        "id": "toyota-corolla-e170-engine-beck-arnley-vvt-solenoid-024-1950",
        "carId": "toyota-corolla-e170",
        "slot": "engine",
        "name": "Beck/Arnley VVT Solenoid 024-1950",
        "brand": "Beck/Arnley",
        "category": "timing",
        "price": 83.41,
        "currency": "USD",
        "sourceUrl": null
      }
    ]
  }
}
```

`?slot=engine` narrows to one slot. `?slot=engine&grouped=true` breaks it down by
sub-category — `timing`, `crankshaft`, `oil`, `cooling`, `pads`, `muffler`, `hardware`,
`spacers`, `tpms` — which is how a build guide reads best.

Edit `data/parts.json` and run `python scripts/seed_parts.py` to reload. Ids are derived
from the name, so reseeding updates a part instead of duplicating it.

# For Ahmed

## GET `/ai/build-mod/n-rally` — getBuildModAI

Everything needed to write a build guide, in one call.

```json
{
  "nodeId": "n-rally",
  "carId": "toyota-corolla-e170",
  "car": { "id": "toyota-corolla-e170", "make": "Toyota", "model": "Corolla", "generation": "E170", "yearRange": "2014–2019", "rootNodeId": "n-root" },
  "title": "Turbo Rally Build",
  "summary": "Fusion: built turbo motor on gravel geometry. Detuned for reliability.",
  "mods": {
    "engine": "Built bottom end, forged rods and pistons, GT3071R at 14psi for reliability",
    "exhaust": "3.5in high-clearance turbo-back",
    "wheels": "16in gravel-spec, 215/65 all-terrain",
    "brakes": "4-pot front, rally pads, hydraulic handbrake"
  },
  "attributes": ["brakes-bbk", "engine-swap", "engine-turbo", "wheels-allterrain"],
  "lineage": [
    { "id": "n-root", "title": "Stock Corolla" },
    { "id": "n-built", "title": "Built Block" },
    { "id": "n-built-straight", "title": "Built · Straight Through" },
    { "id": "n-built-track", "title": "Built · Track Wheels" },
    { "id": "n-track-weapon", "title": "Track Weapon" },
    { "id": "n-rally", "title": "Turbo Rally Build" }
  ],
  "communityText": [
    "Dropped from 18 to 14psi for gravel. Losing about 40hp, but heat soak on a long stage was killing it and I would rather finish."
  ],
  "modCount": 4,
  "postCount": 2
}
```

`lineage` runs root → this node (full `Node` objects, trimmed above). `communityText` is
every post body on the node, already transcribed — the real build knowledge.

---

## POST `/ai/compare` — agentic node transformation

Send the two complete nodes already available to the caller. The endpoint does not
retrieve them again. It loads only the existing parts catalogue for `node_b.car_id`.

Empty strings inside `mods` are normalized to `null`; all social and graph metadata is
accepted as part of the complete node but ignored for mechanical comparison.

```json
{
  "node_a": {
    "id": "h-si-3in",
    "car_id": "honda-civic-fc-fk-10th-gen",
    "title": "Current",
    "parent_ids": [],
    "attributes": [],
    "mods": {
      "engine": null,
      "exhaust": "MagnaFlow Resonated Cat-Back",
      "wheels": null,
      "brakes": null
    },
    "summary": "",
    "stats": {"forks": 0, "notes": 0, "contributors": 1, "heat": 0.4},
    "created_by": "user",
    "created_at": "2026-08-09T00:00:00Z",
    "is_root": false,
    "level": 2
  },
  "node_b": {
    "id": "h-target",
    "car_id": "honda-civic-fc-fk-10th-gen",
    "title": "Target",
    "parent_ids": [],
    "attributes": [],
    "mods": {
      "engine": "Hondata FlashPro (2016-2021 Civic 1.5T)",
      "exhaust": "Borla S-Type Cat-Back Exhaust 140742",
      "wheels": null,
      "brakes": "StopTech Street Performance Pads (Front)"
    },
    "summary": "",
    "stats": {"forks": 0, "notes": 0, "contributors": 1, "heat": 0.4},
    "created_by": "user",
    "created_at": "2026-08-09T00:00:00Z",
    "is_root": false,
    "level": 4
  }
}
```

Response:

```json
{
  "base_node_id": "h-si-3in",
  "target_node_id": "h-target",
  "car_id": "honda-civic-fc-fk-10th-gen",
  "changes": [
    {"mod_key": "engine", "current": null, "target": "Hondata FlashPro (2016-2021 Civic 1.5T)", "operation": "add"},
    {"mod_key": "exhaust", "current": "MagnaFlow Resonated Cat-Back", "target": "Borla S-Type Cat-Back Exhaust 140742", "operation": "replace"},
    {"mod_key": "wheels", "current": null, "target": null, "operation": "unchanged"},
    {"mod_key": "brakes", "current": null, "target": "StopTech Street Performance Pads (Front)", "operation": "add"}
  ],
  "operations": [
    {"operation": "add", "mod_key": "engine", "added": "Hondata FlashPro (2016-2021 Civic 1.5T)", "removed": null},
    {"operation": "replace", "mod_key": "exhaust", "added": "Borla S-Type Cat-Back Exhaust 140742", "removed": "MagnaFlow Resonated Cat-Back"},
    {"operation": "add", "mod_key": "brakes", "added": "StopTech Street Performance Pads (Front)", "removed": null}
  ],
  "pricing": {
    "new_parts_cost": 1912.99,
    "removed_parts_value": 879.0,
    "build_value_difference": 1033.99,
    "pricing_complete": true,
    "unresolved_added_parts": [],
    "unresolved_removed_parts": []
  },
  "resulting_mods": {
    "engine": "Hondata FlashPro (2016-2021 Civic 1.5T)",
    "exhaust": "Borla S-Type Cat-Back Exhaust 140742",
    "wheels": null,
    "brakes": "StopTech Street Performance Pads (Front)"
  },
  "matches_target": true
}
```

`build_value_difference` is the difference between catalogue values. It is not the
owner's actual upgrade cost because removed parts are not necessarily sold.

LangChain only selects among seven request-scoped tools. The tools detect changes, copy
target values, perform exact-name catalogue lookups, calculate all arithmetic, and
validate completion. The model's final prose is discarded. Missing catalogue names are
reported in `unresolved_*_parts`; prices are never fuzzy-matched or estimated.

The route returns `400` for different cars, `503` when `AI_API_KEY` is absent, and `502`
when the agent stops without a valid tool-produced result.

---

## Architecture

```
app/api/          controllers — resolve input, call one service, map None to 404
app/services/     business logic
    graph_service       graphs, nodes, stats
    generations         curated generation table
    community_service   posts, replies
    ai_service          existing build-payload assembly
    agentic_compare     LangChain tool-calling loop and request-scoped state
    compare_tools       change truth, mutations, pricing, validation
    parts               the catalogue browser
    placement           where a new build goes in the DAG
    tagging             mods -> filter tags
    transcription       media -> text (stub; swap in a model here)
app/repositories/ storage — the only module that touches the database
app/models/       Pydantic schemas — every contract on this page
```

Seeding and deterministic verification:

```bash
python scripts/seed.py                # cars, nodes, posts, replies
python scripts/seed_parts.py          # parts + part_prices
python -m pytest tests                # comparison tools and mocked orchestration
```

Generations are hand-curated in `data/generations.json` — vPIC has no generation concept,
API Ninjas paywalls it at $99/mo, and CarAPI's free tier is 2020 Ford+Toyota only.

Storage is `data/db.json` behind `repositories/store.py`. Moving to Postgres means
rewriting that one module — no service, route or response shape changes.

Transcription is a stub returning a placeholder and `transcribed: false`. Wiring a real
vision/speech model means replacing two functions in `services/transcription.py`.
