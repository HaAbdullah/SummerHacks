import type {
  AttributeGroup,
  BuildGuide,
  BuildNodeData,
  Car,
  Note,
} from "../types";

const CAR_ID = "toyota-corolla";
const NOW = "2026-07-01T12:00:00.000Z";

function daysAgo(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hues = [24, 200, 140, 320, 40, 180];
  const hue = hues[h % hues.length];
  return `hsl(${hue} 45% 42%)`;
}

function hashPos(id: string): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return {
    x: 80 + (h % 14) * 72,
    y: 80 + ((h >> 4) % 10) * 64,
  };
}

function note(
  id: string,
  nodeId: string,
  author: string,
  kind: Note["kind"],
  body: string,
  days: number,
  extra: Partial<Note> = {},
): Note {
  const pos = hashPos(id);
  const isMedia =
    kind === "image" || kind === "sketch" || kind === "video" || kind === "blueprint";
  return {
    id,
    nodeId,
    author,
    avatarColor: avatarColor(author),
    kind,
    body,
    createdAt: daysAgo(days),
    mediaUrl: isMedia
      ? `https://picsum.photos/seed/${nodeId}-${id}/800/500`
      : undefined,
    canvasX: pos.x,
    canvasY: pos.y,
    canvasW: isMedia ? 280 : kind === "voice" ? 240 : 220,
    canvasH: isMedia ? 180 : kind === "voice" ? 96 : 120,
    ...extra,
  };
}

export const cars: Car[] = [
  {
    id: CAR_ID,
    make: "Toyota",
    model: "Corolla",
    yearRange: "2018–2024",
    rootNodeId: "n-root",
  },
  {
    id: "honda-civic",
    make: "Honda",
    model: "Civic",
    yearRange: "2016–2024",
    rootNodeId: "civic-root",
  },
  {
    id: "mazda-miata",
    make: "Mazda",
    model: "Miata",
    yearRange: "2016–2024",
    rootNodeId: "miata-root",
  },
];

export const attributeGroups: AttributeGroup[] = [
  {
    id: "style",
    label: "Style",
    options: [
      { id: "offroad", label: "Off-road" },
      { id: "street", label: "Street" },
      { id: "sleek", label: "Sleek" },
      { id: "wildcard", label: "Wildcard" },
    ],
  },
  {
    id: "wrap",
    label: "Wrap",
    options: [
      { id: "red", label: "Red" },
      { id: "blue", label: "Blue" },
      { id: "black", label: "Black" },
      { id: "none", label: "None" },
    ],
  },
  {
    id: "engine",
    label: "Engine",
    options: [
      { id: "stock", label: "Stock" },
      { id: "turbo", label: "Turbo" },
      { id: "v8", label: "V8 swap" },
    ],
  },
  {
    id: "stance",
    label: "Stance",
    options: [
      { id: "lifted", label: "Lifted" },
      { id: "lowered", label: "Lowered" },
      { id: "stock-height", label: "Stock height" },
    ],
  },
  {
    id: "extras",
    label: "Extras",
    options: [
      { id: "led-dash", label: "LED dash" },
      { id: "underglow", label: "Underglow" },
      { id: "widebody", label: "Widebody" },
      { id: "roof-rack", label: "Roof rack" },
      { id: "livery", label: "Livery" },
    ],
  },
];

function n(
  partial: Omit<BuildNodeData, "carId" | "createdAt" | "stats"> & {
    stats?: Partial<BuildNodeData["stats"]>;
    createdAt?: string;
  },
): BuildNodeData {
  const heat = partial.stats?.heat ?? 0.4;
  return {
    carId: CAR_ID,
    createdAt: partial.createdAt ?? daysAgo(30),
    ...partial,
    stats: {
      forks: partial.stats?.forks ?? 0,
      notes: partial.stats?.notes ?? 3,
      contributors: partial.stats?.contributors ?? 2,
      heat,
    },
    heroImage:
      partial.heroImage ??
      `https://picsum.photos/seed/${partial.id}-hero/1000/560`,
  };
}

/** ~30-node Corolla DAG with exactly one merge (Night Runner). */
export const seedNodes: BuildNodeData[] = [
  n({
    id: "n-root",
    title: "Stock Corolla",
    parentIds: [],
    attributes: ["stock", "stock-height", "none"],
    summary: "Factory baseline. The trunk everything grows from.",
    createdBy: "modbranch",
    stats: { forks: 5, notes: 8, contributors: 12, heat: 1.0 },
  }),
  // OFF-ROAD
  n({
    id: "n-trail",
    title: "Trail Spec",
    parentIds: ["n-root"],
    attributes: ["offroad", "stock", "stock-height", "none"],
    summary: "Skid plates, A/T tires, first taste of dirt.",
    createdBy: "trail_dan",
    stats: { forks: 2, notes: 6, contributors: 8, heat: 0.72 },
  }),
  n({
    id: "n-trail-lift",
    title: "Trail Spec + 2in Lift",
    parentIds: ["n-trail"],
    attributes: ["offroad", "lifted", "stock", "none"],
    summary: "2in spacer lift, longer shocks, mild poke.",
    createdBy: "lift_lab",
    stats: { forks: 2, notes: 9, contributors: 11, heat: 0.8 },
  }),
  n({
    id: "n-red-dirt",
    title: "Lifted / Red Dirt",
    parentIds: ["n-trail-lift"],
    attributes: ["offroad", "lifted", "red", "stock"],
    summary: "Red wrap over lifted bones. Heat starts here.",
    createdBy: "wrap_wiz",
    stats: { forks: 1, notes: 12, contributors: 14, heat: 0.9 },
  }),
  n({
    id: "n-tiger",
    title: "Tiger Spec V8",
    parentIds: ["n-red-dirt"],
    attributes: ["offroad", "red", "v8", "lifted", "led-dash", "livery"],
    summary: "THE demo hero. V8 swap, red wrap, tiger livery, LED dash.",
    createdBy: "tiger_crew",
    stats: { forks: 0, notes: 18, contributors: 14, heat: 0.98 },
  }),
  n({
    id: "n-arctic",
    title: "Lifted / Arctic Blue",
    parentIds: ["n-trail-lift"],
    attributes: ["offroad", "lifted", "blue", "stock"],
    summary: "Arctic blue vinyl, white letter tires.",
    createdBy: "frost_fox",
    stats: { forks: 2, notes: 5, contributors: 6, heat: 0.55 },
  }),
  n({
    id: "n-arctic-wrap",
    title: "Arctic + Full Wrap",
    parentIds: ["n-arctic"],
    attributes: ["offroad", "lifted", "blue", "stock", "livery"],
    summary: "Full print wrap, glacier graphics.",
    createdBy: "frost_fox",
    stats: { forks: 0, notes: 4, contributors: 3, heat: 0.42 },
  }),
  n({
    id: "n-arctic-bare",
    title: "Arctic / No Wrap",
    parentIds: ["n-arctic"],
    attributes: ["offroad", "lifted", "none", "stock"],
    summary: "Paint-matched, no vinyl. Clean trail mule.",
    createdBy: "bare_metal",
    stats: { forks: 0, notes: 3, contributors: 2, heat: 0.28 },
  }),
  n({
    id: "n-overland",
    title: "Overland Camper",
    parentIds: ["n-trail"],
    attributes: ["offroad", "stock-height", "none", "roof-rack", "stock"],
    summary: "Roof rack, tent, drawer system.",
    createdBy: "camp_corolla",
    stats: { forks: 1, notes: 7, contributors: 5, heat: 0.6 },
  }),
  n({
    id: "n-overland-solar",
    title: "Overland + Solar",
    parentIds: ["n-overland"],
    attributes: ["offroad", "stock-height", "none", "roof-rack", "stock"],
    summary: "100W panel, dual battery, fridge.",
    createdBy: "camp_corolla",
    stats: { forks: 0, notes: 4, contributors: 3, heat: 0.38 },
  }),
  // STREET
  n({
    id: "n-city",
    title: "City Commuter",
    parentIds: ["n-root"],
    attributes: ["street", "stock", "stock-height", "none"],
    summary: "Quiet upgrades for daily miles.",
    createdBy: "daily_driver",
    stats: { forks: 2, notes: 5, contributors: 7, heat: 0.5 },
  }),
  n({
    id: "n-stanced",
    title: "Stanced Daily",
    parentIds: ["n-city"],
    attributes: ["street", "lowered", "none", "stock"],
    summary: "Coilovers, camber arms, fitment drama.",
    createdBy: "camber_kid",
    stats: { forks: 1, notes: 10, contributors: 9, heat: 0.7 },
  }),
  n({
    id: "n-neon",
    title: "Stanced / Neon Underglow",
    parentIds: ["n-stanced"],
    attributes: ["street", "lowered", "none", "stock", "underglow"],
    summary: "Underglow kit, smoked tails, night posture.",
    createdBy: "neon_nate",
    stats: { forks: 0, notes: 8, contributors: 6, heat: 0.75 },
  }),
  n({
    id: "n-eco",
    title: "Eco Tuner",
    parentIds: ["n-city"],
    attributes: ["street", "stock-height", "none", "stock"],
    summary: "Intake, tune, hypermiling setup.",
    createdBy: "mpg_max",
    stats: { forks: 1, notes: 4, contributors: 4, heat: 0.35 },
  }),
  n({
    id: "n-eco-turbo",
    title: "Eco Turbo Sipper",
    parentIds: ["n-eco"],
    attributes: ["street", "stock-height", "none", "turbo"],
    summary: "Mild turbo, keep the economy.",
    createdBy: "mpg_max",
    stats: { forks: 0, notes: 3, contributors: 2, heat: 0.4 },
  }),
  // SLEEK
  n({
    id: "n-vip",
    title: "VIP Sleek",
    parentIds: ["n-root"],
    attributes: ["sleek", "stock", "stock-height", "none"],
    summary: "Chrome delete energy, quiet luxury.",
    createdBy: "vip_crew",
    stats: { forks: 2, notes: 5, contributors: 6, heat: 0.58 },
  }),
  n({
    id: "n-murdered",
    title: "Murdered Out",
    parentIds: ["n-vip"],
    attributes: ["sleek", "black", "stock-height", "stock"],
    summary: "Black wrap, tint, no chrome.",
    createdBy: "shadow_shop",
    stats: { forks: 1, notes: 9, contributors: 8, heat: 0.78 },
  }),
  n({
    id: "n-murdered-wide",
    title: "Murdered Out / Widebody",
    parentIds: ["n-murdered"],
    attributes: ["sleek", "black", "stock-height", "stock", "widebody"],
    summary: "Widebody kit, flush fitment.",
    createdBy: "shadow_shop",
    stats: { forks: 0, notes: 7, contributors: 5, heat: 0.65 },
  }),
  n({
    id: "n-chrome-delete",
    title: "Chrome Delete",
    parentIds: ["n-vip"],
    attributes: ["sleek", "none", "stock-height", "stock"],
    summary: "Plastidip blackout, OEM lines.",
    createdBy: "dip_dan",
    stats: { forks: 1, notes: 3, contributors: 3, heat: 0.32 },
  }),
  n({
    id: "n-chrome-tinted",
    title: "Chrome Delete + Tint",
    parentIds: ["n-chrome-delete"],
    attributes: ["sleek", "none", "stock-height", "stock"],
    summary: "5% ceramic all around.",
    createdBy: "dip_dan",
    stats: { forks: 0, notes: 2, contributors: 2, heat: 0.25 },
  }),
  // WILDCARD
  n({
    id: "n-bat",
    title: "Batmobile",
    parentIds: ["n-root"],
    attributes: ["wildcard", "black", "stock", "stock-height"],
    summary: "Community wildcard. Bat-signal energy.",
    createdBy: "gotham_garage",
    stats: { forks: 1, notes: 11, contributors: 10, heat: 0.68 },
  }),
  n({
    id: "n-bat-fins",
    title: "Batmobile / Fins + Afterburner",
    parentIds: ["n-bat"],
    attributes: ["wildcard", "black", "stock", "stock-height", "livery"],
    summary: "Fins, fake jet, LED 'afterburner'.",
    createdBy: "gotham_garage",
    stats: { forks: 0, notes: 6, contributors: 4, heat: 0.52 },
  }),
  // MERGE — exactly one
  n({
    id: "n-night-runner",
    title: "Night Runner",
    parentIds: ["n-murdered", "n-neon"],
    attributes: ["sleek", "street", "black", "lowered", "underglow", "widebody"],
    summary: "Fusion: black widebody + neon underglow. Night posture.",
    createdBy: "fusion_lab",
    stats: { forks: 0, notes: 10, contributors: 9, heat: 0.88 },
  }),
  // Extra leaves to ~30
  n({
    id: "n-trail-skid",
    title: "Trail + Full Skids",
    parentIds: ["n-trail"],
    attributes: ["offroad", "stock-height", "none", "stock"],
    summary: "Belly armor, rock sliders.",
    createdBy: "trail_dan",
    stats: { forks: 0, notes: 3, contributors: 2, heat: 0.3 },
  }),
  n({
    id: "n-city-wheels",
    title: "City / Aftermarket Wheels",
    parentIds: ["n-city"],
    attributes: ["street", "stock-height", "none", "stock"],
    summary: "17s, mild offset, stock height.",
    createdBy: "daily_driver",
    stats: { forks: 0, notes: 2, contributors: 2, heat: 0.22 },
  }),
  n({
    id: "n-stanced-track",
    title: "Stanced Track Day",
    parentIds: ["n-stanced"],
    attributes: ["street", "lowered", "none", "stock"],
    summary: "Pads, lines, one hard day at the park.",
    createdBy: "camber_kid",
    stats: { forks: 0, notes: 4, contributors: 3, heat: 0.45 },
  }),
  n({
    id: "n-vip-interior",
    title: "VIP Interior Quilt",
    parentIds: ["n-vip"],
    attributes: ["sleek", "none", "stock-height", "stock"],
    summary: "Diamond stitch, ambient strips.",
    createdBy: "vip_crew",
    stats: { forks: 0, notes: 3, contributors: 2, heat: 0.33 },
  }),
  n({
    id: "n-red-mud",
    title: "Red Dirt / Mud Flaps",
    parentIds: ["n-red-dirt"],
    attributes: ["offroad", "lifted", "red", "stock"],
    summary: "Heavy flaps, trail manners.",
    createdBy: "wrap_wiz",
    stats: { forks: 0, notes: 2, contributors: 2, heat: 0.36 },
  }),
  n({
    id: "n-bat-stealth",
    title: "Batmobile / Stealth Matte",
    parentIds: ["n-bat"],
    attributes: ["wildcard", "black", "stock", "stock-height"],
    summary: "Matte black, no chrome, quiet menace.",
    createdBy: "gotham_garage",
    stats: { forks: 0, notes: 3, contributors: 2, heat: 0.4 },
  }),
  n({
    id: "n-turbo-street",
    title: "Street Turbo Punch",
    parentIds: ["n-city"],
    attributes: ["street", "stock-height", "none", "turbo"],
    summary: "Bolt-on turbo, street manners mostly.",
    createdBy: "boost_boy",
    stats: { forks: 0, notes: 5, contributors: 4, heat: 0.48 },
  }),
];

const forumLines = [
  "swapped to 15x8 -20 offset, rubs on full lock, rolling fenders this weekend",
  "torque specs in the notes — don't guess the hub nuts",
  "this setup ate a CV on the second trail day. uprated axle next",
  "wrap shop took 3 days, edges look clean under the lights",
  "LED dash is gimmicky until night hits. then it's gospel",
  "alignment shop hated me. camber is intentional",
  "parts list is in the pinned note — prices are 2025-ish",
  "if you're forking this, start with the lift kit first",
  "underglow gets looks. also gets cops. ymmv",
  "V8 swap is not a weekend. budget time twice",
];

function buildNotes(): Note[] {
  const notes: Note[] = [];
  let i = 0;
  for (const node of seedNodes) {
    const count = Math.min(6, Math.max(2, Math.round(node.stats.notes / 2)));
    for (let k = 0; k < count; k++) {
      const id = `note-${node.id}-${k}`;
      const authorPool = [
        "turbo_dan",
        "wrap_wiz",
        "trail_dan",
        "camber_kid",
        "neon_nate",
        "shadow_shop",
        "tiger_crew",
        "frost_fox",
      ];
      const author = authorPool[(i + k) % authorPool.length];
      const kindCycle: Note["kind"][] = [
        "text",
        "image",
        "text",
        "sketch",
        "text",
        "voice",
      ];
      const kind = kindCycle[k % kindCycle.length];
      notes.push(
        note(
          id,
          node.id,
          author,
          kind,
          forumLines[(i + k) % forumLines.length],
          2 + ((i + k) % 40),
          kind === "voice" ? { durationSec: 12 + ((i + k) % 30) } : {},
        ),
      );
    }
    i++;
  }

  // Hero extras: video + more community noise
  notes.push(
    note(
      "note-tiger-video",
      "n-tiger",
      "tiger_crew",
      "video",
      "First fire of the LS — cold start on the lift.",
      1,
      { durationSec: 48 },
    ),
    note(
      "note-tiger-voice",
      "n-tiger",
      "trail_dan",
      "voice",
      "Trail notes after the swap — gearing talk.",
      3,
      { durationSec: 22 },
    ),
    note(
      "note-tiger-img",
      "n-tiger",
      "wrap_wiz",
      "image",
      "Tiger livery close-up under sodium lights.",
      2,
    ),
  );

  // A couple more voice notes across dataset
  notes.push(
    note(
      "note-neon-voice",
      "n-neon",
      "neon_nate",
      "voice",
      "Underglow wiring path under the rockers.",
      5,
      { durationSec: 18 },
    ),
    note(
      "note-merge-voice",
      "n-night-runner",
      "fusion_lab",
      "voice",
      "How we fused murdered + neon without fighting fitment.",
      4,
      { durationSec: 27 },
    ),
  );

  return notes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export const seedNotes: Note[] = buildNotes();

export const buildGuideTemplates: Record<
  "offroad" | "street" | "sleek",
  Omit<BuildGuide, "nodeId" | "title" | "renderImage">
> = {
  offroad: {
    difficulty: "Advanced",
    estCost: "$4,200–$9,800",
    estTime: "3–6 weekends",
    parts: [
      {
        name: "2in spacer lift kit",
        note: "Match shock length to travel",
        approxPrice: "$380",
      },
      {
        name: "A/T all-terrains 215/65R16",
        note: "Load range C preferred",
        approxPrice: "$720",
      },
      {
        name: "Skid plate set",
        note: "Oil pan + fuel + mid",
        approxPrice: "$410",
      },
      {
        name: "LED interior dash kit",
        note: "Fuse-tapped, no splicing dash harness",
        approxPrice: "$90",
      },
    ],
    steps: [
      {
        title: "Baseline the trunk",
        detail:
          "Align stock, photo every bay, torque-map the underbody. You will thank yourself.",
      },
      {
        title: "Lift + tires",
        detail:
          "Install lift, re-torque after 50 miles, set toe. Confirm no liner rub on lock.",
      },
      {
        title: "Armor + power",
        detail:
          "Skids, then any engine work. Wire LED dash last so you can see under the hood at night.",
      },
      {
        title: "Wrap / livery",
        detail:
          "Only after panels fit. Heat edges, post-heat the work in sun or booth.",
      },
    ],
  },
  street: {
    difficulty: "Intermediate",
    estCost: "$1,800–$4,500",
    estTime: "2–4 weekends",
    parts: [
      {
        name: "Coilovers (32-way)",
        note: "Street spring rates",
        approxPrice: "$980",
      },
      {
        name: "Camber arms",
        note: "Front + rear if slamming",
        approxPrice: "$260",
      },
      {
        name: "Underglow kit (RGB)",
        note: "Waterproof controllers",
        approxPrice: "$140",
      },
      {
        name: "Street pads + lines",
        note: "If track days creep in",
        approxPrice: "$220",
      },
    ],
    steps: [
      {
        title: "Suspension first",
        detail: "Coilovers, then alignment. Don't wrap a car that still rubs.",
      },
      {
        title: "Fitment loop",
        detail: "Wheels, poke, roll if needed. Measure fender gap in mono numbers.",
      },
      {
        title: "Night package",
        detail: "Underglow routing, fuse block, grommets. No pinching harnesses.",
      },
    ],
  },
  sleek: {
    difficulty: "Beginner",
    estCost: "$900–$3,200",
    estTime: "1–3 weekends",
    parts: [
      {
        name: "Black wrap film",
        note: "Cast film for complex curves",
        approxPrice: "$650",
      },
      {
        name: "Chrome delete kit",
        note: "Or plastidip for trial",
        approxPrice: "$80",
      },
      {
        name: "Ceramic tint 5–15%",
        note: "Legal limits vary",
        approxPrice: "$400",
      },
      {
        name: "Widebody kit (bolt-on)",
        note: "Only if fusing with stance",
        approxPrice: "$1,400",
      },
    ],
    steps: [
      {
        title: "Surface prep",
        detail: "Clay, alcohol wipe, garage at 65°F+. Dust kills gloss.",
      },
      {
        title: "Delete + wrap",
        detail: "Chrome delete first, full wrap second. Post-heat every edge.",
      },
      {
        title: "Stance or leave it",
        detail:
          "If fusing with street neon, dial ride height before widebody screws go final.",
      },
    ],
  },
};

export function familyForNode(node: BuildNodeData): "offroad" | "street" | "sleek" {
  if (node.attributes.includes("offroad") || node.attributes.includes("wildcard"))
    return "offroad";
  if (node.attributes.includes("street")) return "street";
  return "sleek";
}
