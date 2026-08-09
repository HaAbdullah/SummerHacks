"""Ecosystem-wide analytics for the Pulse dashboard.

Every number is counted from stored cars / nodes / posts / replies.
No invented baselines, no chart padding, no mock seed data.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from app.models.schemas import (
    ActivityDay,
    AnalyticsKpi,
    EcosystemAnalytics,
    EcosystemKpis,
    EcosystemNetwork,
    TopBuilder,
    TrendingBranch,
)
from app.repositories import store
from app.services import graph_service

RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90}
ACCENTS = ("red", "blue", "yellow")
DAY_LABELS = ("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN")


def _parse(iso: str | None) -> datetime | None:
    if not iso:
        return None
    try:
        parsed = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _in_window(iso: str | None, start: datetime, end: datetime) -> bool:
    t = _parse(iso)
    return t is not None and start <= t < end


def _delta_pct(current: int, previous: int) -> float:
    """Real % change only when a previous baseline exists. Else 0 — never invent +100%."""
    if previous <= 0:
        return 0.0
    return round(((current - previous) / previous) * 100.0, 1)


def _deepest(nodes: list[dict]) -> int:
    return graph_service._deepest(nodes)  # noqa: SLF001 — shared pure helper


def get_ecosystem_analytics(range_key: str = "30d") -> EcosystemAnalytics:
    if range_key not in RANGE_DAYS:
        range_key = "30d"
    days = RANGE_DAYS[range_key]

    now = datetime.now(timezone.utc)
    cur_start = now - timedelta(days=days)
    prev_start = cur_start - timedelta(days=days)

    cars = store.all_of("cars")
    nodes = store.all_of("nodes")
    posts = store.all_of("posts")
    replies = store.all_of("replies")

    # --- KPIs: all-time totals; deltas from real windowed counts --------------
    forks_all = sum(1 for n in nodes if len(n.get("parentIds") or []) == 1)
    merges_all = sum(1 for n in nodes if len(n.get("parentIds") or []) > 1)
    seeds_all = len(cars)

    people_all: set[str] = set()
    for n in nodes:
        if n.get("createdBy"):
            people_all.add(n["createdBy"])
    for p in posts:
        if p.get("author"):
            people_all.add(p["author"])
    for r in replies:
        if r.get("author"):
            people_all.add(r["author"])

    def count_forks(start: datetime, end: datetime) -> int:
        return sum(
            1
            for n in nodes
            if len(n.get("parentIds") or []) == 1
            and _in_window(n.get("createdAt"), start, end)
        )

    def count_merges(start: datetime, end: datetime) -> int:
        return sum(
            1
            for n in nodes
            if len(n.get("parentIds") or []) > 1
            and _in_window(n.get("createdAt"), start, end)
        )

    def count_seeds(start: datetime, end: datetime) -> int:
        roots = [n for n in nodes if not (n.get("parentIds") or [])]
        return sum(1 for n in roots if _in_window(n.get("createdAt"), start, end))

    def active_builders(start: datetime, end: datetime) -> int:
        who: set[str] = set()
        for n in nodes:
            if _in_window(n.get("createdAt"), start, end) and n.get("createdBy"):
                who.add(n["createdBy"])
        for p in posts:
            if _in_window(p.get("createdAt"), start, end) and p.get("author"):
                who.add(p["author"])
        for r in replies:
            if _in_window(r.get("createdAt"), start, end) and r.get("author"):
                who.add(r["author"])
        return len(who)

    kpis = EcosystemKpis(
        totalForks=AnalyticsKpi(
            value=forks_all,
            deltaPct=_delta_pct(
                count_forks(cur_start, now), count_forks(prev_start, cur_start)
            ),
        ),
        activeBuilders=AnalyticsKpi(
            value=len(people_all),
            deltaPct=_delta_pct(
                active_builders(cur_start, now),
                active_builders(prev_start, cur_start),
            ),
        ),
        newSeeds=AnalyticsKpi(
            value=seeds_all,
            deltaPct=_delta_pct(
                count_seeds(cur_start, now), count_seeds(prev_start, cur_start)
            ),
        ),
        totalMerges=AnalyticsKpi(
            value=merges_all,
            deltaPct=_delta_pct(
                count_merges(cur_start, now), count_merges(prev_start, cur_start)
            ),
        ),
    )

    # --- activity: raw daily counts for this calendar week -------------------
    weekday = now.weekday()  # Mon=0
    week_start = (now - timedelta(days=weekday)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    activity: list[ActivityDay] = []
    for i, label in enumerate(DAY_LABELS):
        day_start = week_start + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        is_future = day_start.date() > now.date()
        is_today = day_start.date() == now.date()
        day_label = f"{label} (NOW)" if is_today else label

        if is_future:
            activity.append(
                ActivityDay(day=day_label, commits=0, merges=0, isFuture=True)
            )
            continue

        commits = 0
        merges = 0
        for n in nodes:
            if not _in_window(n.get("createdAt"), day_start, day_end):
                continue
            if len(n.get("parentIds") or []) > 1:
                merges += 1
            else:
                # non-merge nodes (root + forks) count as commits that day
                commits += 1
        for p in posts:
            if _in_window(p.get("createdAt"), day_start, day_end):
                commits += 1
        activity.append(
            ActivityDay(day=day_label, commits=commits, merges=merges, isFuture=False)
        )

    # --- network: measured from graphs only ----------------------------------
    depths: list[int] = []
    unique_mod_values: set[str] = set()
    filled_slots = 0
    for car in cars:
        car_nodes = [n for n in nodes if n.get("carId") == car["id"]]
        if car_nodes:
            depths.append(_deepest(car_nodes))
        for n in car_nodes:
            for slot, value in (n.get("mods") or {}).items():
                if str(value).strip():
                    filled_slots += 1
                    unique_mod_values.add(f"{slot}:{str(value).strip().lower()}")

    avg_depth = round(sum(depths) / len(depths), 1) if depths else 0.0
    # Meter fills: depth relative to deepest chain in the system (not a fixed 5)
    max_depth = max(depths) if depths else 0
    depth_pct = (
        round((avg_depth / max_depth) * 100.0, 1) if max_depth > 0 else 0.0
    )
    diversity_pct = (
        round((len(unique_mod_values) / filled_slots) * 100.0, 1)
        if filled_slots
        else 0.0
    )

    active_24h = active_builders(now - timedelta(hours=24), now)
    if len(people_all) == 0:
        status = "DEGRADED"
    elif active_24h >= max(2, int(len(people_all) * 0.4)):
        status = "HOT"
    elif active_24h == 0:
        status = "DEGRADED"
    else:
        status = "STABLE"

    network = EcosystemNetwork(
        status=status,  # type: ignore[arg-type]
        avgBranchDepth=avg_depth,
        depthPct=depth_pct,
        diversityPct=diversity_pct,
    )

    # --- trending: real activity only (nodes+posts in window) ----------------
    car_by_id = {c["id"]: c for c in cars}
    scores: dict[str, int] = defaultdict(int)
    prev_scores: dict[str, int] = defaultdict(int)

    for n in nodes:
        cid = n.get("carId")
        if not cid:
            continue
        if _in_window(n.get("createdAt"), cur_start, now):
            scores[cid] += 1
        if _in_window(n.get("createdAt"), prev_start, cur_start):
            prev_scores[cid] += 1
    for p in posts:
        node = store.get("nodes", p.get("nodeId", ""))
        if not node:
            continue
        cid = node.get("carId")
        if not cid:
            continue
        if _in_window(p.get("createdAt"), cur_start, now):
            scores[cid] += 1
        if _in_window(p.get("createdAt"), prev_start, cur_start):
            prev_scores[cid] += 1

    # If nothing happened in the window, rank cars by actual node count (still real)
    if not scores:
        for n in nodes:
            cid = n.get("carId")
            if cid:
                scores[cid] += 1

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:5]
    top_score = ranked[0][1] if ranked else 0
    trending: list[TrendingBranch] = []
    for i, (cid, score) in enumerate(ranked):
        car = car_by_id.get(cid)
        if not car:
            continue
        gen = car.get("generation") or ""
        label = f"{car['make']} {car['model']}"
        if gen and gen != "All years":
            label = f"{label} ({gen})"

        car_nodes = [
            n
            for n in nodes
            if n.get("carId") == cid and (n.get("parentIds") or [])
        ]
        if car_nodes:
            hottest = max(
                car_nodes,
                key=lambda n: (
                    n.get("stats", {}).get("notes", 0),
                    n.get("stats", {}).get("forks", 0),
                ),
                default=None,
            )
            if hottest and hottest.get("title"):
                label = f"{car['make']} {car['model']} ({hottest['title']})"

        heat = (
            round((score / top_score) * 100.0, 1) if top_score > 0 else 0.0
        )
        trending.append(
            TrendingBranch(
                rank=i + 1,
                carId=cid,
                label=label,
                growthPct=_delta_pct(score, prev_scores.get(cid, 0)),
                heatPct=heat,
                accent=ACCENTS[i % len(ACCENTS)],  # type: ignore[arg-type]
            )
        )

    # --- builders: real contribution counts ----------------------------------
    contrib: Counter[str] = Counter()
    for n in nodes:
        who = n.get("createdBy")
        if who:
            contrib[who] += 1
    for p in posts:
        who = p.get("author")
        if who:
            contrib[who] += 1
    for r in replies:
        who = r.get("author")
        if who:
            contrib[who] += 1

    builders: list[TopBuilder] = []
    rings = ("red", "blue", "neutral", "neutral")
    for i, (who, count) in enumerate(contrib.most_common(8)):
        handle = who if str(who).startswith("@") else f"@{who}"
        builders.append(
            TopBuilder(
                handle=handle,
                avatarSeed=str(who),
                contributions=count,
                ring=rings[min(i, len(rings) - 1)],  # type: ignore[arg-type]
            )
        )

    return EcosystemAnalytics(
        range=range_key,  # type: ignore[arg-type]
        kpis=kpis,
        activity=activity,  # raw counts only
        network=network,
        trending=trending,
        builders=builders,
    )
