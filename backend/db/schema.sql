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

create table if not exists replies (
  id           text primary key,
  post_id      text not null references posts(id) on delete cascade,
  author       text not null,
  avatar_color text not null default '#d5001c',
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists replies_post_idx on replies (post_id, created_at);

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

-- ------------------------------------------------------------------------- storage

-- Bucket for community media. Create it in Dashboard → Storage, or run:
--
--   insert into storage.buckets (id, name, public)
--   values ('community-media', 'community-media', true)
--   on conflict (id) do nothing;
--
-- Public so uploaded photos and voice clips render without signed URLs. Uploads go
-- through the backend's service key, so nobody can write to it from the browser.
