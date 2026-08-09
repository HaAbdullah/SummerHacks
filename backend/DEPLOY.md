# Deploying the backend

Check readiness at any point:

```bash
cd backend
.venv/Scripts/python.exe scripts/preflight.py
```

It names the exact fix for anything that would break. Run it again against the live URL
once deployed.

---

## You can deploy today, read-only

`data/db.json` is gitignored (it is live data), but `data/seed_snapshot.json` is
committed, and the store falls back to it. So a deploy with no Supabase gives a site
that is **fully browsable** — three cars, 41 builds, 93 posts, replies, parts, search,
stats, both AI endpoints.

What it cannot do is **write**. Contributing, forking, replying and uploading all return
503 with a message pointing here, because a serverless filesystem cannot persist
anything.

That is a usable demo, and it decouples "deploy works" from "Supabase is up" — worth
doing now rather than on Sunday. But contributions are the hackathon's core requirement,
so Supabase still has to land before submission.

Refresh the fallback whenever you reseed:

```bash
.venv/Scripts/python.exe scripts/seed.py
.venv/Scripts/python.exe scripts/seed_parts.py
.venv/Scripts/python.exe scripts/snapshot.py
```

---

## 1. Supabase (10 minutes, once)

**Create the project** at [supabase.com](https://supabase.com). Free tier is fine.

**Run the schema.** Dashboard → SQL Editor → New query → paste all of
[`db/schema.sql`](db/schema.sql) → Run. Every statement is idempotent, so re-running is
safe.

**Create the bucket.** Dashboard → Storage → New bucket → name `community-media`, tick
**Public**. Public so uploaded photos and clips render without signed URLs; uploads still
go through the backend's service key, so nobody can write to it from a browser.

**Copy the keys.** Project Settings → Data API for the URL, API Keys for the
`service_role` key.

```bash
# backend/.env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
SUPABASE_BUCKET=community-media
```

> The `service_role` key bypasses row-level security. Server-side only — never in
> frontend code, never in a `NEXT_PUBLIC_*` variable, never committed.

---

## 2. Seed it

The seeders write through whichever store is configured, so with the env above they
populate Postgres rather than the local file.

```bash
.venv/Scripts/python.exe scripts/seed.py
.venv/Scripts/python.exe scripts/seed_parts.py
.venv/Scripts/python.exe scripts/preflight.py     # should now pass
```

Expect 3 cars, 41 nodes, 93 posts, 15 replies, 70 parts.

---

## 3. Deploy

```bash
cd backend
vercel
```

Then add the same four variables in Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_KEY` | the `service_role` key |
| `SUPABASE_BUCKET` | `community-media` |
| `CORS_ORIGINS` | your Vercel **frontend** URL |

**`CORS_ORIGINS` is the one everyone forgets.** Leave it at `http://localhost:3000` and
the browser blocks every request from the deployed frontend — the API works fine in curl
and appears completely broken in the app.

Redeploy after setting them (`vercel --prod`), since env vars are read at build time.

---

## 4. Verify

```bash
.venv/Scripts/python.exe scripts/preflight.py https://your-app.vercel.app
```

Checks the live API reports `storage: supabase`, returns cars, and can search. If storage
reports `json`, the env vars did not reach the deployment.

Then point the frontend at it — Vercel → frontend project → `NEXT_PUBLIC_API_URL` = the
backend URL.

---

## What is different on serverless

| | Local (`uvicorn`) | Vercel |
|---|---|---|
| Startup | lifespan hook | at import — 0.56s, from the committed vPIC snapshot |
| Storage | `data/db.json` | Supabase Postgres, required |
| Uploads | local disk at `/media` | Supabase Storage, required |
| Large uploads | POST straight to the API | `POST /nodes/{id}/posts/upload-url`, then PUT direct — the request body cap is ~4.5MB |

The startup snapshot is why this works at all: fetching the vPIC catalogue took 6.4s,
which a serverless function would pay on every cold start. Rebuild it with
`scripts/build_vpic_cache.py` if model years go stale.

---

## If it breaks

**Empty site, no cars** — `storage` reports `json`. Env vars are missing from the Vercel
project, or you did not redeploy after adding them.

**Frontend gets CORS errors** — `CORS_ORIGINS` does not include the frontend's deployed
URL. It takes a comma-separated list.

**Uploads fail with 400** — the bucket does not exist, or is not named
`community-media`.

**Search works but nothing else** — search reads a committed file, everything else reads
the database. This is the signature of an unseeded or unreachable Supabase.
