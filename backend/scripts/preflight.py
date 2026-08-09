"""Check everything a deploy needs, before deploying.

    python scripts/preflight.py

Every check names the exact fix. Run it locally with your production env loaded, then
again against the deployed URL:

    python scripts/preflight.py https://your-app.vercel.app
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

BACKEND = Path(__file__).resolve().parent.parent

PASS, FAIL, WARN = "PASS", "FAIL", "WARN"
results: list[tuple[str, str, str]] = []


def check(name: str, ok: bool | None, detail: str) -> None:
    status = PASS if ok else (WARN if ok is None else FAIL)
    results.append((status, name, detail))


def check_local() -> None:
    from app.core.config import settings

    # --- static data files, committed and shipped with the deploy ---
    for filename, why in (
        ("vpic_cache.json", "car search; rebuild with scripts/build_vpic_cache.py"),
        ("generations.json", "generation lookup"),
        ("parts.json", "parts catalogue source"),
        ("seed_snapshot.json", "read-only fallback; refresh with scripts/snapshot.py"),
    ):
        path = BACKEND / "data" / filename
        check(f"data/{filename}", path.exists(), why if not path.exists()
              else f"{path.stat().st_size // 1024}KB")

    # --- storage ---
    if settings.use_supabase:
        check("Supabase configured", True, settings.supabase_url)
        try:
            from app.repositories import supabase_store

            counts = {
                table: len(supabase_store.all_of(table))
                for table in ("cars", "nodes", "posts", "parts")
            }
            reachable = sum(counts.values()) >= 0
            check("Supabase reachable", reachable, str(counts))
            check(
                "Supabase seeded",
                counts["nodes"] > 0 and counts["parts"] > 0,
                "run scripts/seed.py and scripts/seed_parts.py"
                if not counts["nodes"] else f"{counts['nodes']} nodes, {counts['parts']} parts",
            )
        except Exception as exc:  # noqa: BLE001
            check("Supabase reachable", False, f"{type(exc).__name__}: {exc}")
    else:
        # Not a hard failure: the site deploys and is fully browsable from the
        # committed snapshot. It is a warning because writes - the hackathon's core
        # requirement - do not work without it.
        check(
            "Supabase configured", None,
            "unset. Deploy still works and the site is browsable, but every write "
            "returns 503 - no contributions, forks or uploads. See db/README.md.",
        )

    # --- uploads ---
    check(
        "Upload storage", settings.use_supabase or None,
        f"bucket '{settings.supabase_bucket}'" if settings.use_supabase
        else "falls back to local disk, which does not work on serverless — uploads "
             "will fail until Supabase Storage is configured",
    )

    # --- AI chatbox ---
    check(
        "AI_API_KEY", bool(settings.ai_api_key.strip()) or None,
        f"set, model {settings.ai_model}" if settings.ai_api_key.strip()
        else "unset — the chatbox falls back to an answer built from the node's own "
             "mods and notes. Works, but it is not the AI feature you want to demo.",
    )

    # --- CORS ---
    origins = settings.cors_origins_list
    has_prod = any(not o.startswith("http://localhost") for o in origins)
    check(
        "CORS origins", has_prod or None,
        ", ".join(origins) if has_prod
        else f"only {origins} — add the deployed frontend URL or the browser will block "
             "every request",
    )

    # --- vercel wiring ---
    check("vercel.json", (BACKEND / "vercel.json").exists(), "deploy config")
    check("api/index.py", (BACKEND / "api" / "index.py").exists(), "serverless entrypoint")

    reqs = (BACKEND / "requirements.txt").read_text(encoding="utf-8")
    for pkg, why in (("supabase", "database client"), ("python-multipart", "file uploads")):
        check(f"requirements: {pkg}", pkg in reqs, why)


def check_remote(base: str) -> None:
    import httpx

    base = base.rstrip("/")
    try:
        health = httpx.get(f"{base}/api/health", timeout=20)
        data = health.json()
        check("live /api/health", health.status_code == 200, str(data))
        check(
            "live storage backend", data.get("storage") == "supabase",
            f"reports '{data.get('storage')}' — on serverless anything but supabase "
            "means data will not persist",
        )
    except Exception as exc:  # noqa: BLE001
        check("live /api/health", False, f"{type(exc).__name__}: {exc}")
        return

    for path, name in (
        ("/api/cars", "live cars"),
        ("/api/vehicles/search?q=corolla", "live search"),
    ):
        try:
            resp = httpx.get(f"{base}{path}", timeout=20)
            body = resp.json()
            count = len(body if isinstance(body, list) else body.get("results", []))
            check(name, resp.status_code == 200 and count > 0,
                  f"{count} results" if count else "returned nothing — is it seeded?")
        except Exception as exc:  # noqa: BLE001
            check(name, False, f"{type(exc).__name__}: {exc}")


def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else None

    if target:
        print(f"Checking deployed API at {target}\n")
        check_remote(target)
    else:
        print("Checking local deploy readiness\n")
        check_local()

    width = max(len(name) for _, name, _ in results)
    for status, name, detail in results:
        print(f"  [{status}] {name:{width}}  {detail}")

    failures = sum(1 for s, _, _ in results if s == FAIL)
    print()
    if failures:
        print(f"{failures} blocking issue(s). Fix these before deploying.")
        sys.exit(1)

    if target:
        print("Deployed API is up.")
        return

    from app.core.config import settings

    if settings.use_supabase:
        print("Ready to deploy. Reads and writes both work.")
    else:
        print("Ready to deploy READ-ONLY.")
        print("  Works:      browsing every car, build, post, reply and part; search;")
        print("              stats; the AI compare and build-guide endpoints.")
        print("  Does not:   contributing, forking, replying, uploading — all 503.")
        print("  To fix:     create the Supabase project (backend/db/README.md), then")
        print("              re-run this check.")


if __name__ == "__main__":
    main()
