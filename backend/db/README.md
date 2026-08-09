# Supabase setup

The backend runs **without Supabase** — it falls back to `data/db.json` and local disk for
uploads, so you can develop and demo with zero setup. `GET /api/health` reports which
backend is live:

```json
{ "status": "ok", "storage": "json" }
```

Switching to Postgres is an env change, not a code change. Four steps:

## 1. Create the project

[supabase.com](https://supabase.com) → New project. Free tier is enough.

## 2. Run the schema

Dashboard → **SQL Editor** → New query → paste all of [`schema.sql`](schema.sql) → Run.

Creates `cars`, `nodes`, `posts`, `replies`, their indexes, the `car_stats` view, and
read-only RLS policies. Every statement is idempotent, so re-running is safe.

## 3. Create the storage bucket

Dashboard → **Storage** → New bucket → name it `community-media`, tick **Public**.

Public means uploaded photos and voice clips render without signed URLs. Uploads still go
through the backend's service key, so nobody can write to it from a browser.

## 4. Fill in the env

Dashboard → **Project Settings → Data API** for the URL, **API Keys** for the
`service_role` key.

```bash
# backend/.env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
SUPABASE_BUCKET=community-media
```

> **The `service_role` key bypasses row-level security.** It must stay server-side — never
> in frontend code, never in a `NEXT_PUBLIC_*` variable, never committed. `.env` is
> gitignored; keep it that way.

Restart the API and confirm:

```bash
curl http://localhost:8000/api/health
```

```json
{ "status": "ok", "storage": "supabase" }
```

Then seed:

```bash
.venv/Scripts/python.exe scripts/seed.py
```

---

## Why the schema looks like this

**Real columns for anything queried, `jsonb` for what isn't.** `mods` is `jsonb` because
its four slots hold free text the AI reads; `stats` is `jsonb` because it is a display
blob nothing filters on. Everything else — `car_id`, `level`, `slot`, `created_at` — is a
real column with a real index.

**`attributes` and `parent_ids` are `text[]`, not join tables.** The filter panel asks
"which nodes have `engine-turbo`", and the graph asks "which nodes list X as a parent".
Both are array containment, both are GIN-indexed, and both keep a node as one row.

**Cars are keyed by generation.** `toyota-corolla-e170`, not `toyota-corolla` — a 2015 and
a 2022 Corolla take different parts, so they are separate build graphs.

**`storage_path` is stored alongside `media_url`.** The URL is what the browser loads; the
path is what you need to find or delete the file later, once the URL is a CDN or signed
one.

## Migrating existing JSON data

The seeder writes through whichever backend is configured, so the simplest migration is
to point at Supabase and re-run it. To move data you have already collected locally:

```bash
# with SUPABASE_URL set
.venv/Scripts/python.exe -c "
import json, pathlib
from app.repositories import supabase_store
db = json.loads(pathlib.Path('data/db.json').read_text(encoding='utf-8'))
supabase_store.reset(db)
print('migrated', {k: len(v) for k, v in db.items()})
"
```

`reset` deletes child-first and inserts parent-first, so foreign keys hold throughout.
