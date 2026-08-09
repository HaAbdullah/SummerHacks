# Ecosystem Analytics Dashboard — Implementation Plan

**Source design:** [MODSTR - Ecosystem Analytics Dashboard](https://p.superdesign.dev/draft/d6521315-068b-4ac1-9154-fefa1f9899c3)  
**Draft ID:** `d6521315-068b-4ac1-9154-fefa1f9899c3`  
**HTML snapshot:** `.superdesign/analytics-dashboard.html`  
**App brand:** BuildaMod (existing tokens / fonts; design used “MODSTR” labels)

---

## Design inventory (what to build)

| Section | Content | Visual notes |
|---|---|---|
| Sticky header | Logo, “Ecosystem Pulse”, range chip (Last 30 days), bell, user | glass `bg-black/50`, `border-white/5` |
| KPI row (4) | Total Forks, Active Builders, New Seeds, Total Merges | glass cards, red/blue icon chips, % deltas green/red |
| Activity chart (2/3) | Weekly commits (red) vs merges (blue) bar pairs | CSS bars, future days muted |
| Network Health (1/3) | Radar dots + STABLE status, depth + diversity meters | dashed rings, pulsing dots |
| Trending Branches | Ranked car/path list with growth % + progress bars | links to garage |
| Top Branch Builders | 2×2 avatar grid, contribution counts | decorative only for now |
| CTA banner | “Transform data into real builds” + Explore API / Report | red/blue blurs |
| Footer | Brand + experimental tagline | minimal |

Tokens already in `globals.css`: `--bg #050505`, `--surface #121212`, `--accent #ff3c3c`, `--accent-blue #3c7eff`, Space Grotesk + Plus Jakarta, `.floating-modal` / glass.

---

## Route & file map

```
app/ecosystem/page.tsx                 # route shell
components/analytics/
  AnalyticsDashboard.tsx               # page composition
  AnalyticsHeader.tsx
  StatCard.tsx
  ActivityChart.tsx
  NetworkHealth.tsx
  TrendingBranches.tsx
  TopBuilders.tsx
  AnalyticsCta.tsx
lib/types.ts                           # + EcosystemAnalytics types
lib/api/index.ts                       # + getEcosystemAnalytics() mock
lib/api/analytics-seed.ts              # mock numbers matching the draft
```

**URL:** `/ecosystem`  
**Nav:** Landing “Explore Branches” (or a dedicated link) → `/ecosystem`

---

## Data contract (mock now → real API later)

```ts
// GET /api/ecosystem/analytics?range=30d  (future)
interface EcosystemAnalytics {
  range: "7d" | "30d" | "90d";
  kpis: {
    totalForks: { value: number; deltaPct: number };
    activeBuilders: { value: number; deltaPct: number };
    newSeeds: { value: number; deltaPct: number };
    totalMerges: { value: number; deltaPct: number };
  };
  activity: { day: string; commits: number; merges: number; isFuture?: boolean }[];
  network: {
    status: "STABLE" | "DEGRADED" | "HOT";
    avgBranchDepth: number;
    depthPct: number;        // 0–100 meter fill
    diversityPct: number;
  };
  trending: {
    rank: number;
    carId: string;
    label: string;
    growthPct: number;
    heatPct: number;         // bar width
    accent: "red" | "blue" | "yellow";
  }[];
  builders: {
    handle: string;
    avatarSeed: string;
    contributions: number;
    ring: "red" | "blue" | "neutral";
  }[];
}
```

**Backend note (other session):** car-level `GET /cars/{id}/stats` already exists. Ecosystem rollup can aggregate across cars or ship a dedicated `/ecosystem/analytics` later. Frontend only calls `getEcosystemAnalytics()` so the swap is one function.

---

## Implementation phases

### Phase 1 — UI shell (this PR / session) ✅ done
- [x] Route + mock data + all sections per design
- [x] No new chart library (CSS bars only, matches draft)
- [x] Link from landing (`Ecosystem Pulse` → `/ecosystem`)
- [x] `getEcosystemAnalytics()` mock contract ready for backend swap

### Phase 2 — Wire backend when ready ✅
- [x] `GET /api/ecosystem/analytics?range=7d|30d|90d` (real rollup from store)
- [x] Frontend `getEcosystemAnalytics` → live API
- [x] Trending rows link to `/garage/{carId}`
- Optional: range selector drives query param (UI chip still fixed at 30d)

### Phase 3 — Polish (optional)
- Count-up animation on KPIs
- Live refresh / SSE
- Download report export

---

## Non-goals (v1)
- Real auth / user menu
- Functional date-range dropdown (UI only)
- Explore API / Download report backends
- Mobile-first layout (desktop-first like rest of app)
