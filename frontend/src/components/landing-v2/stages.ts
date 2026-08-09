/**
 * Scroll choreography for the /landing-v2 experiment.
 *
 * The page's premise: scrolling *is* walking down a build branch. Each stage
 * below is one level of the graph the backend actually stores — engine, then
 * exhaust, then wheels, then brakes, then a merge — so the camera move and the
 * copy describe the same data model the rest of the app runs on.
 *
 * Kept free of `three` imports on purpose: this module is pulled into the main
 * page bundle, while the WebGL scene is a lazy client-only chunk.
 */

export interface Spec {
  k: string;
  v: string;
}

export interface Stage {
  key: string;
  /** Two-digit marker, rendered oversized as the section index. */
  index: string;
  /** Small all-caps line naming the mod slot. */
  eyebrow: string;
  title: string;
  blurb: string;
  /** Spec-sheet rows. Real part vocabulary for the four slots the graph stores.
   *  Omitted on the hero stage, which carries the search field instead. */
  specs?: Spec[];
  /** Drives both the copy accent and the moving rim light in the 3D scene. */
  accent: string;
  /** Camera placement in spherical coords around the car, interpolated per
   *  frame. Spherical rather than cartesian so the path arcs *around* the car
   *  instead of cutting a straight line through it. */
  azimuth: number;
  elevation: number;
  radius: number;
  /** Point the camera looks at — car centre, nudged per stage. */
  target: [number, number, number];
}

export const STAGES: Stage[] = [
  {
    key: "root",
    index: "00",
    eyebrow: "Baseline",
    title: "EVERY MOD\nIS A COMMIT",
    blurb:
      "Fork someone's car. Change one thing. Push it back. The community's entire build history sits in one graph you can walk, branch by branch.",
    accent: "#ffffff",
    azimuth: 0.85,
    elevation: 0.3,
    radius: 6.6,
    target: [0, 0, 0],
  },
  {
    key: "engine",
    index: "01",
    eyebrow: "Engine",
    title: "THE FIRST\nCOMMIT",
    blurb:
      "Every branch opens with what's under the hood. Swap it, boost it, or leave it — that decision becomes the node everyone downstream forks from.",
    specs: [
      { k: "Swap", v: "K24A2" },
      { k: "Induction", v: "Garrett GT2871R" },
      { k: "Fuel", v: "E85 conversion" },
      { k: "Tune", v: "Stage 2" },
    ],
    accent: "#ff3c3c",
    azimuth: 2.5,
    elevation: 0.2,
    radius: 4.3,
    target: [0, 0.1, 0],
  },
  {
    key: "exhaust",
    index: "02",
    eyebrow: "Exhaust",
    title: "PROOF YOU\nCAN HEAR",
    blurb:
      "Builders attach real recordings to their nodes — stock and modded, same car, same day. The argument that usually runs forty replies settles in two clips.",
    specs: [
      { k: "Catback", v: "3in stainless" },
      { k: "Mid-pipe", v: "Resonator delete" },
      { k: "Cat", v: "High-flow 200-cell" },
      { k: "Tips", v: "Burnt titanium" },
    ],
    accent: "#f2c94c",
    azimuth: 4.3,
    elevation: 0.11,
    radius: 4.0,
    target: [0, -0.12, 0],
  },
  {
    key: "wheels",
    index: "03",
    eyebrow: "Wheels",
    title: "WHERE BUILDS\nDIVERGE",
    blurb:
      "Fitment is the slot that splits a branch hardest. Same engine, same exhaust, two completely different cars from the axle down.",
    specs: [
      { k: "Wheel", v: "18×9.5 Enkei RPF1" },
      { k: "Tyre", v: "235/40 R18" },
      { k: "Offset", v: "+15" },
      { k: "Finish", v: "Bronze" },
    ],
    accent: "#3c7eff",
    azimuth: 5.6,
    elevation: 0.05,
    radius: 3.3,
    target: [0, -0.34, 0],
  },
  {
    key: "brakes",
    index: "04",
    eyebrow: "Brakes",
    title: "THE SLOT\nEVERYONE SKIPS",
    blurb:
      "Four hundred horsepower on factory pads is a branch nobody should merge. Laid out as a graph, that gap is visible before the money is spent.",
    specs: [
      { k: "Front", v: "Brembo 4-pot" },
      { k: "Rotors", v: "340mm slotted" },
      { k: "Lines", v: "Braided stainless" },
      { k: "Fluid", v: "DOT 4 racing" },
    ],
    accent: "#27a644",
    azimuth: 6.9,
    elevation: 0.12,
    radius: 2.9,
    target: [0, -0.28, 0],
  },
  {
    key: "merge",
    index: "05",
    eyebrow: "Merge",
    title: "TWO PARENTS,\nONE CAR",
    blurb:
      "Take the turbo setup from one build and the suspension from another. The node keeps both parents on record, and the diff between them is computed, not guessed.",
    specs: [
      { k: "Parents", v: "2" },
      { k: "Diff", v: "Deterministic" },
      { k: "Summary", v: "AI-explained" },
    ],
    accent: "#8b5cf6",
    azimuth: 8.3,
    elevation: 0.42,
    radius: 7.6,
    target: [0, 0, 0],
  },
];

/** Mutable, deliberately outside React. The scroll handler writes it and the
 *  render loop reads it, so scrolling never triggers a React re-render. */
export const scrollState = { progress: 0 };

export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/** Ease the hand-off between stages so the camera settles rather than
 *  arriving at constant speed. */
const smooth = (x: number) => x * x * (3 - 2 * x);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface CameraFrame {
  position: [number, number, number];
  target: [number, number, number];
}

/**
 * Camera pose at `t`, a continuous position along the stage list
 * (0 = first stage, STAGES.length - 1 = last).
 */
export function cameraAt(t: number): CameraFrame {
  const clamped = clamp(t, 0, STAGES.length - 1);
  const i = Math.min(Math.floor(clamped), STAGES.length - 2);
  const f = smooth(clamped - i);
  const a = STAGES[i];
  const b = STAGES[i + 1];

  const azimuth = lerp(a.azimuth, b.azimuth, f);
  const elevation = lerp(a.elevation, b.elevation, f);
  const radius = lerp(a.radius, b.radius, f);
  const horizontal = radius * Math.cos(elevation);

  return {
    position: [
      horizontal * Math.sin(azimuth),
      radius * Math.sin(elevation),
      horizontal * Math.cos(azimuth),
    ],
    target: [
      lerp(a.target[0], b.target[0], f),
      lerp(a.target[1], b.target[1], f),
      lerp(a.target[2], b.target[2], f),
    ],
  };
}
