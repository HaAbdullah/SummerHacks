"""Download real Corolla / Civic photos from Wikimedia Commons into /media.

Run from backend/:
  .venv/Scripts/python.exe scripts/fetch_car_images.py

Then patch db.json heroes + community mediaUrl to local /media/... paths.
"""

from __future__ import annotations

import json
import ssl
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UPLOAD = ROOT / "data" / "uploads" / "cars"
DB_PATH = ROOT / "data" / "db.json"
UA = "BuildaModHackathon/1.0 (local demo; educational use)"
# Some local Python installs hit expired system CA bundles — fine for demo asset fetch.
ctx = ssl._create_unverified_context()


def api(params: dict) -> dict:
    q = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        f"https://commons.wikimedia.org/w/api.php?{q}",
        headers={"User-Agent": UA},
    )
    with urllib.request.urlopen(req, context=ctx, timeout=45) as r:
        return json.loads(r.read().decode())


def search_files(query: str, limit: int = 16) -> list[dict]:
    data = api(
        {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": f"filetype:bitmap {query}",
            "gsrnamespace": "6",
            "gsrlimit": str(limit),
            "prop": "imageinfo",
            "iiprop": "url|mime|size",
            "iiurlwidth": "1200",
        }
    )
    pages = data.get("query", {}).get("pages", {})
    out: list[dict] = []
    for p in pages.values():
        info = (p.get("imageinfo") or [{}])[0]
        mime = info.get("mime", "")
        if not str(mime).startswith("image/"):
            continue
        url = info.get("thumburl") or info.get("url")
        title = p.get("title", "")
        # Prefer files that actually mention the car in the title
        if url:
            out.append({"title": title, "url": url, "mime": mime})
    return out


def download(url: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, context=ctx, timeout=60) as r:
            data = r.read()
        if len(data) < 5000:
            return False
        dest.write_bytes(data)
        return True
    except Exception as e:
        print(f"  download fail {dest.name}: {e}")
        return False


def collect(query: str, key_terms: list[str], need: int) -> list[dict]:
    raw = search_files(query, limit=24)
    # rank: title contains key terms
    scored = []
    for item in raw:
        t = item["title"].lower()
        score = sum(1 for k in key_terms if k in t)
        # skip logos / interiors when possible
        if any(x in t for x in ("logo", "badge", "interior", "engine bay only", "diagram")):
            score -= 2
        scored.append((score, item))
    scored.sort(key=lambda x: -x[0])
    picked = []
    for score, item in scored:
        if score < 1:
            continue
        picked.append(item)
        if len(picked) >= need:
            break
    # fill remaining with whatever
    if len(picked) < need:
        for _, item in scored:
            if item not in picked:
                picked.append(item)
            if len(picked) >= need:
                break
    return picked[:need]


def main() -> None:
    print("Searching Wikimedia Commons…")
    corolla = collect("Toyota Corolla", ["corolla", "toyota"], need=16)
    time.sleep(1.2)
    civic = collect("Honda Civic", ["civic", "honda"], need=14)
    print(f"candidates corolla={len(corolla)} civic={len(civic)}")

    corolla_paths: list[str] = []
    civic_paths: list[str] = []

    for i, item in enumerate(corolla):
        ext = ".jpg"
        if "png" in item.get("mime", ""):
            ext = ".png"
        dest = UPLOAD / f"corolla-{i+1:02d}{ext}"
        print(f"Corolla {i+1}: {item['title'][:60]}")
        if download(item["url"], dest):
            corolla_paths.append(f"/media/cars/{dest.name}")
        time.sleep(0.35)

    for i, item in enumerate(civic):
        ext = ".jpg"
        if "png" in item.get("mime", ""):
            ext = ".png"
        dest = UPLOAD / f"civic-{i+1:02d}{ext}"
        print(f"Civic {i+1}: {item['title'][:60]}")
        if download(item["url"], dest):
            civic_paths.append(f"/media/cars/{dest.name}")
        time.sleep(0.35)

    if len(corolla_paths) < 4:
        raise SystemExit(f"Not enough Corolla images: {len(corolla_paths)}")
    if len(civic_paths) < 4:
        raise SystemExit(f"Not enough Civic images: {len(civic_paths)}")

    # absolute URL for frontend (different origin)
    def abs_url(path: str) -> str:
        return f"http://localhost:8000{path}"

    corolla_abs = [abs_url(p) for p in corolla_paths]
    civic_abs = [abs_url(p) for p in civic_paths]

    db = json.loads(DB_PATH.read_text(encoding="utf-8"))

    # cars
    for cid, car in db.get("cars", {}).items():
        cl = cid.lower()
        if "corolla" in cl:
            car["heroImage"] = corolla_abs[0]
        elif "civic" in cl:
            car["heroImage"] = civic_abs[0]

    # nodes
    c_i = 0
    v_i = 0
    for nid, node in db.get("nodes", {}).items():
        cid = (node.get("carId") or "").lower()
        if "corolla" in cid or "corolla" in nid.lower():
            node["heroImage"] = corolla_abs[c_i % len(corolla_abs)]
            c_i += 1
        elif "civic" in cid or "civic" in nid.lower():
            node["heroImage"] = civic_abs[v_i % len(civic_abs)]
            v_i += 1

    # community posts media — by parent node car
    nodes = db.get("nodes", {})
    p_c = 0
    p_v = 0
    for pid, post in db.get("posts", {}).items():
        kind = post.get("kind")
        if kind not in ("image", "sketch", "video", "blueprint"):
            continue
        node = nodes.get(post.get("nodeId", ""), {})
        cid = (node.get("carId") or "").lower()
        # user-uploaded local sketches under node folders — leave them if under /media/n-
        url = post.get("mediaUrl") or ""
        if "/media/" in url and "/media/cars/" not in url and not url.startswith("http://localhost:8000/media/cars/"):
            # keep genuine user uploads that aren't our car pool
            if "sketch" in url or "/n-" in url or "post-n-" in pid:
                continue
        if "corolla" in cid:
            post["mediaUrl"] = corolla_abs[p_c % len(corolla_abs)]
            p_c += 1
        elif "civic" in cid:
            post["mediaUrl"] = civic_abs[p_v % len(civic_abs)]
            p_v += 1

    DB_PATH.write_text(json.dumps(db, indent=2) + "\n", encoding="utf-8")
    manifest = {
        "corolla": corolla_abs,
        "civic": civic_abs,
        "local_dir": str(UPLOAD),
    }
    (ROOT / "data" / "car_images_manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    print(f"Wrote {DB_PATH}")
    print(f"  Corolla images: {len(corolla_abs)}")
    print(f"  Civic images:   {len(civic_abs)}")
    print("Restart the API so it reloads db.json from disk.")


if __name__ == "__main__":
    main()
