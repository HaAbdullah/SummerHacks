import type { BuildGuide } from "../types";

/**
 * The only thing left here is the mock build-guide catalogue — everything
 * else (cars, graph, notes, attributes) now comes from the real backend.
 * See `../index.ts`.
 */

export type GuideTier = "offroad" | "street" | "sleek";

export const buildGuideTemplates: Record<
  GuideTier,
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
