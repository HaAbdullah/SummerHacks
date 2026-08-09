-- MODBRANCH schema for Supabase Postgres.
--
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent.
--
-- Shape: real columns for anything we filter, sort or join on; jsonb for the parts that
-- are genuinely free-form. `mods` is jsonb because its four slots hold free text that
-- the AI reads, and `stats` is jsonb because it is a display blob nothing queries.
-- `attributes` and `parent_ids` are text[] rather than join tables — array containment
-- with a GIN index is what the filter panel and the graph both need, and it keeps a node
-- a single row.

-- ---------------------------------------------------------------- cars (generations)

-- One row per GENERATION, not per model: mods are generation-specific, so a 2015 and a
-- 2022 Corolla are separate build graphs.
create table if not exists cars (
  id            text primary key,          -- "toyota-corolla-e170"
  make          text not null,
  model         text not null,
  generation    text not null default 'All years',
  year_start    int,
  year_end      int,                        -- null = still in production
  year_range    text not null default '—',
  hero_image    text,
  root_node_id  text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists cars_make_model_idx on cars (lower(make), lower(model));

-- ---------------------------------------------------------------------------- nodes

create table if not exists nodes (
  id           text primary key,
  car_id       text not null references cars(id) on delete cascade,
  title        text not null,
  -- 0 entries = root, 1 = fork, 2 = merge.
  -- Note: foreign keys cannot be enforced inside an array, so Postgres will NOT stop a
  -- node pointing at a parent that no longer exists. Nothing deletes nodes today, so
  -- this is theoretical — but if node deletion is ever added, either clean up children
  -- in the same transaction or move edges to a node_parents(child_id, parent_id) table.
  parent_ids   text[] not null default '{}',
  attributes   text[] not null default '{}', -- derived from mods; drives the filter panel
  mods         jsonb  not null default '{"engine":"","exhaust":"","wheels":"","brakes":""}',
  summary      text   not null default '',
  hero_image   text,
  stats        jsonb  not null default '{"forks":0,"notes":0,"contributors":1,"heat":0.4}',
  created_by   text   not null,
  created_at   timestamptz not null default now(),
  is_root      boolean not null default false,
  -- The graph is layered: each level introduces exactly one mod slot.
  -- 0 stock · 1 engine · 2 exhaust · 3 wheels · 4 brakes
  slot         text check (slot is null or slot in ('engine','exhaust','wheels','brakes')),
  level        int not null default 0 check (level between 0 and 4)
);

create index if not exists nodes_car_idx    on nodes (car_id);
create index if not exists nodes_level_idx  on nodes (car_id, level);
-- Array containment for the attribute panel: attributes @> '{engine-turbo}'
create index if not exists nodes_attrs_idx  on nodes using gin (attributes);
-- Reverse edge lookup: which nodes list X as a parent
create index if not exists nodes_parents_idx on nodes using gin (parent_ids);
-- Search inside the free text of a mod slot: mods->>'engine' ilike '%turbo%'
create index if not exists nodes_mods_idx   on nodes using gin (mods);

-- --------------------------------------------------------------------------- posts

-- A community contribution. Whatever was uploaded, `body` always holds text, so search
-- and the AI only ever deal with text. `transcribed` is false while conversion is
-- pending, so the frontend can show a processing state instead of a placeholder.
create table if not exists posts (
  id           text primary key,
  node_id      text not null references nodes(id) on delete cascade,
  author       text not null,
  avatar_color text not null default '#d5001c',
  kind         text not null check (kind in ('text','image','sketch','voice','video','blueprint')),
  title        text not null,
  body         text not null default '',
  media_url    text,
  storage_path text,                       -- path inside the Supabase Storage bucket
  duration_sec int,
  transcribed  boolean not null default true,
  created_at   timestamptz not null default now(),
  -- Freeform position on the node's canvas board.
  canvas_x     double precision,
  canvas_y     double precision,
  canvas_w     double precision,
  canvas_h     double precision
);

create index if not exists posts_node_idx on posts (node_id, created_at desc);

-- ------------------------------------------------------------------------- replies

-- Same four media kinds as posts, and the same rule for `body`: the author's own words
-- if given, otherwise a transcription placeholder (see services/transcription.py) — a
-- reply is never just a bare, unsearchable media blob.
create table if not exists replies (
  id           text primary key,
  post_id      text not null references posts(id) on delete cascade,
  author       text not null,
  avatar_color text not null default '#d5001c',
  kind         text not null default 'text' check (kind in ('text','image','sketch','voice','video','blueprint')),
  body         text not null default '',
  media_url    text,
  storage_path text,
  duration_sec int,
  created_at   timestamptz not null default now()
);

-- Existing deployments: replies predates kind/media support.
alter table replies add column if not exists kind         text not null default 'text';
alter table replies add column if not exists media_url    text;
alter table replies add column if not exists storage_path text;
alter table replies add column if not exists duration_sec int;
alter table replies drop constraint if exists replies_kind_check;
alter table replies add  constraint replies_kind_check
  check (kind in ('text','image','sketch','voice','video','blueprint'));

create index if not exists replies_post_idx on replies (post_id, created_at);

-- --------------------------------------------------------------------------- parts

-- Real parts with real prices, so a generated build guide can quote a catalogue instead
-- of inventing part numbers. Grouped by the same four mod slots as everything else.
--
-- `car_id` deliberately has NO foreign key to cars. This is reference data keyed by
-- generation slug, and it exists whether or not anyone has opened that generation's
-- graph yet — a row in `cars` only appears on first visit. Adding the FK would mean
-- parts could not be loaded until someone browsed the car.
create table if not exists parts (
  id         text primary key,
  car_id     text not null,             -- generation slug, e.g. "toyota-corolla-e170"
  slot       text not null check (slot in ('engine','exhaust','wheels','brakes')),
  name       text not null,
  brand      text,
  category   text,                       -- timing · crankshaft · oil · pads · muffler …
  price      numeric(10,2),
  currency   text not null default 'USD',
  source_url text,
  created_at timestamptz not null default now()
);

-- Added for build-comparison catalogue data. Separate ALTERs rather than a wider CREATE because the
-- table already exists on every deployed database, where `create table if not exists` is
-- a no-op and would silently skip the new columns.
--
-- `price`/`currency` above are used by the catalogue browser and the current exact-match
-- comparison. `part_prices` below preserves dated market values for future selection.
alter table parts add column if not exists sku         text;
alter table parts add column if not exists subcategory text not null default '';
alter table parts add column if not exists part_type   text not null default 'primary';
alter table parts add column if not exists metadata    jsonb not null default '{}';
alter table parts alter column brand set default '';

-- Drop-then-add so re-running the file cannot fail on an existing constraint.
alter table parts drop constraint if exists parts_part_type_check;
alter table parts add  constraint parts_part_type_check
  check (part_type in ('primary','supporting','consumable','replacement'));

-- Some supporting parts belong to no single mod slot (brake fluid, shop consumables).
alter table parts alter column slot drop not null;

create index if not exists parts_car_slot_idx on parts (car_id, slot);
create index if not exists parts_category_idx on parts (car_id, category);
create index if not exists parts_car_type_idx on parts (car_id, part_type);

-- --------------------------------------------------------------------- part_prices

-- Prices move, so timestamped rows preserve history alongside the current value on parts.
create table if not exists part_prices (
  id          text primary key,
  part_id     text not null references parts(id) on delete cascade,
  amount      numeric(12,2) not null,
  currency    text not null default 'USD',
  source      text not null default '',
  captured_at timestamptz not null default now()
);

create index if not exists part_prices_part_idx on part_prices (part_id, captured_at desc);

-- ------------------------------------------------------------------- modifications

-- A modification is the CONCEPT — "Exhaust Upgrade", "TPMS Replacement" — not a product.
-- Products live in `parts`, and `modification_parts` joins the two. Keeping them apart is
-- what lets one modification offer three interchangeable sensors without the build guide
-- pretending you need all three.
--
-- `car_id` is nullable: a modification that applies to any car (a generic fluid service)
-- leaves it null, and the resolver treats null as "fits everything".
create table if not exists modifications (
  id          text primary key,
  car_id      text references cars(id) on delete cascade,
  name        text not null,
  slot        text not null check (slot in ('engine','exhaust','wheels','brakes')),
  description text not null default '',
  -- Optional catalogue-specific metadata; it is not interpreted by the current endpoint.
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists modifications_car_slot_idx on modifications (car_id, slot);

-- -------------------------------------------------------------- node_modifications

-- The structured half of a node's build. `nodes.mods` stays exactly as it was — free text
-- the UI, the filter panel and the blueprint all read. This table is what /ai/compare
-- subtracts, because "which mods differ" has to be a set operation, not a string diff.
create table if not exists node_modifications (
  id              text primary key,
  node_id         text not null references nodes(id) on delete cascade,
  modification_id text not null references modifications(id) on delete cascade,
  configuration   jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  unique(node_id, modification_id)
);

create index if not exists node_mods_node_idx on node_modifications (node_id);
create index if not exists node_mods_mod_idx  on node_modifications (modification_id);

-- -------------------------------------------------------------- modification_parts

-- Every part a modification needs, and how badly it needs it.
--
--   role              what the part IS in this job. `included` ships in the box, so it
--                     appears on the list at zero cost and is never charged twice.
--   requirement_type  whether it is bought. `conditional` is bought only if `condition`
--                     passes; `optional` is surfaced but never added to the total.
--   choice_group      interchangeable products. Three crankshaft sensors in one group
--                     means a consumer should pick one instead of summing all three.
create table if not exists modification_parts (
  id               text primary key,
  modification_id  text not null references modifications(id) on delete cascade,
  part_id          text not null references parts(id) on delete cascade,
  role             text not null check (
                     role in ('primary','supporting','consumable','included','alternative')
                   ),
  requirement_type text not null default 'required' check (
                     requirement_type in ('required','conditional','optional','included')
                   ),
  quantity         numeric(8,2) not null default 1,
  choice_group     text,
  condition        jsonb,
  unique(modification_id, part_id)
);

create index if not exists mod_parts_mod_idx    on modification_parts (modification_id);
create index if not exists mod_parts_part_idx   on modification_parts (part_id);
create index if not exists mod_parts_choice_idx on modification_parts (modification_id, choice_group);

-- ------------------------------------------------------- modification_dependencies

-- Modification-to-modification edges reserved for dependency-aware build guides.
--
--   required     pulled into the build scope automatically. A turbo needs an ECU tune.
--   conditional  pulled in only when `condition` passes.
--   recommended  reported, never charged. A recommendation that silently inflated the
--                quote would make the number untrustworthy.
--   sequence     ordering only. Does not widen the scope; constrains task stages when
--                both modifications are already in the build.
create table if not exists modification_dependencies (
  id                         text primary key,
  modification_id            text not null references modifications(id) on delete cascade,
  depends_on_modification_id text not null references modifications(id) on delete cascade,
  dependency_type            text not null check (
                               dependency_type in
                                 ('required','conditional','recommended','sequence')
                             ),
  condition                  jsonb,
  notes                      text not null default '',
  unique(modification_id, depends_on_modification_id, dependency_type)
);

create index if not exists mod_deps_mod_idx on modification_dependencies (modification_id);
create index if not exists mod_deps_dep_idx on modification_dependencies (depends_on_modification_id);

-- ------------------------------------------------------------------- service_tasks

-- The physical work. Hours are a min/max band because a shop quote is a band.
--
-- `shared_access_key` is the interesting column: brake pads, wheel spacers and a TPMS
-- sensor all start by getting the front wheel off. Tag all three teardown tasks
-- "front-wheel-access" so a future scheduler can count that access once for the whole
-- build. `access_group` is the looser label for the work area itself.
create table if not exists service_tasks (
  id                text primary key,
  name              text not null,
  task_type         text not null check (
                      task_type in ('installation','removal','inspection',
                                    'fluid_service','programming','calibration','testing')
                    ),
  description       text not null default '',
  min_hours         numeric(6,2) not null default 0,
  max_hours         numeric(6,2) not null default 0,
  access_group      text,                    -- wheels · underbody · engine_timing …
  shared_access_key text,                    -- e.g. front-wheel-access
  metadata          jsonb not null default '{}'
);

create index if not exists tasks_access_idx on service_tasks (access_group);
create index if not exists tasks_shared_idx on service_tasks (shared_access_key);

-- -------------------------------------------------------------- modification_tasks

create table if not exists modification_tasks (
  id               text primary key,
  modification_id  text not null references modifications(id) on delete cascade,
  task_id          text not null references service_tasks(id) on delete cascade,
  requirement_type text not null default 'required' check (
                     requirement_type in ('required','conditional','optional')
                   ),
  condition        jsonb,
  unique(modification_id, task_id)
);

create index if not exists mod_tasks_mod_idx  on modification_tasks (modification_id);
create index if not exists mod_tasks_task_idx on modification_tasks (task_id);

-- ---------------------------------------------------------------- task_dependencies

-- The scheduling DAG. A leak test cannot run before the exhaust is bolted on; two jobs
-- with no edge between them can run at the same time. Elapsed time is the longest path
-- through this graph, which is why it is shorter than the sum of the labour.
create table if not exists task_dependencies (
  id                 text primary key,
  task_id            text not null references service_tasks(id) on delete cascade,
  depends_on_task_id text not null references service_tasks(id) on delete cascade,
  relationship_type  text not null default 'finish_before' check (
                       relationship_type in ('finish_before','start_after','same_stage')
                     ),
  unique(task_id, depends_on_task_id, relationship_type)
);

create index if not exists task_deps_task_idx on task_dependencies (task_id);
create index if not exists task_deps_dep_idx  on task_dependencies (depends_on_task_id);

-- ------------------------------------------------------------- build_estimate_runs

-- Legacy run-storage shape retained for database compatibility. The current agentic
-- /ai/compare endpoint returns CompareResult directly and does not populate this table.
create table if not exists build_estimate_runs (
  id             text primary key,
  car_id         text not null references cars(id) on delete cascade,
  from_node_id   text not null references nodes(id) on delete cascade,
  to_node_id     text not null references nodes(id) on delete cascade,
  guide_name     text not null,
  summary        text not null default '',
  cost           jsonb not null default '{}',
  time           jsonb not null default '{}',
  modifications  jsonb not null default '[]',
  items          jsonb not null default '[]',
  dependencies   jsonb not null default '[]',
  tasks          jsonb not null default '[]',
  stages         jsonb not null default '[]',
  ai_explanation text not null default '',
  metadata       jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists estimate_runs_car_idx  on build_estimate_runs (car_id, created_at desc);
create index if not exists estimate_runs_pair_idx on build_estimate_runs (from_node_id, to_node_id, created_at desc);

-- --------------------------------------------------------------------------- stats

-- getStats counts over these tables directly rather than loading every row into Python.
create or replace view car_stats as
select
  c.id as car_id,
  count(distinct n.id)                                          as builds,
  count(distinct p.id)                                          as posts,
  count(distinct r.id)                                          as replies,
  count(distinct n.id) filter (where array_length(n.parent_ids, 1) > 1) as merges,
  max(n.level)                                                  as deepest_level
from cars c
left join nodes   n on n.car_id  = c.id
left join posts   p on p.node_id = n.id
left join replies r on r.post_id = p.id
group by c.id;

-- ----------------------------------------------------------------------- security

-- The backend holds the service_role key and enforces permissions in FastAPI, so RLS is
-- enabled with read-only public policies. Reads are open because the artifact is meant
-- to be public; writes arrive through the service role, which bypasses RLS.
--
-- Consequence: the service key must never reach the browser. If the frontend ever talks
-- to Supabase directly, these policies are the only thing standing between a visitor and
-- your data — revisit them before that happens.

alter table cars    enable row level security;
alter table nodes   enable row level security;
alter table posts   enable row level security;
alter table replies enable row level security;

drop policy if exists "public read cars"    on cars;
drop policy if exists "public read nodes"   on nodes;
drop policy if exists "public read posts"   on posts;
drop policy if exists "public read replies" on replies;

create policy "public read cars"    on cars    for select using (true);
create policy "public read nodes"   on nodes   for select using (true);
create policy "public read posts"   on posts   for select using (true);
create policy "public read replies" on replies for select using (true);

-- Reference tables get the same read policy. Writes still require the service key, which
-- prevents visitors from editing catalogue prices.
do $$
declare t text;
begin
  foreach t in array array[
    'part_prices', 'modifications', 'node_modifications', 'modification_parts',
    'modification_dependencies', 'service_tasks', 'modification_tasks',
    'task_dependencies', 'build_estimate_runs'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read %s" on %I', t, t);
    execute format('create policy "public read %s" on %I for select using (true)', t, t);
  end loop;
end $$;

-- ------------------------------------------------------------------------- storage

-- Bucket for community media. Create it in Dashboard → Storage, or run:
--
--   insert into storage.buckets (id, name, public)
--   values ('community-media', 'community-media', true)
--   on conflict (id) do nothing;
--
-- Public so uploaded photos and voice clips render without signed URLs. Uploads go
-- through the backend's service key, so nobody can write to it from the browser.
