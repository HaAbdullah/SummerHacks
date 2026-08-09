export type MediaKind = "text" | "image" | "sketch" | "voice" | "video" | "blueprint";

export interface Note {
  id: string;
  nodeId: string;
  author: string;
  avatarColor: string;
  kind: MediaKind;
  /** Required by the backend; most flows derive this from `body`. */
  title: string;
  body?: string;
  mediaUrl?: string;
  /** Bucket/disk path for the file — kept for later delete/lookup, not used client-side. */
  storagePath?: string;
  durationSec?: number;
  /** False while media is uploaded but not yet transcribed — `body` holds a placeholder. */
  transcribed?: boolean;
  createdAt: string;
  /** Milanote-style freeform position on the node canvas */
  canvasX?: number;
  canvasY?: number;
  canvasW?: number;
  canvasH?: number;
  replyCount?: number;
}

/** A reply on a single community contribution's dedicated page (distinct
 *  from ChatMessage, which is the node-level Community/AI chat). */
export interface NoteReply {
  id: string;
  postId: string;
  author: string;
  avatarColor: string;
  kind: MediaKind;
  body: string;
  mediaUrl?: string;
  storagePath?: string;
  durationSec?: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  nodeId: string;
  author: string;
  avatarColor: string;
  body: string;
  createdAt: string;
  role?: "user" | "ai" | "community";
}

/** An auto-generated conversation starter for a node's AI chatbox, grounded in its
 *  own community notes where there are any. */
export interface PromptSuggestion {
  id: string;
  prompt: string;
}

/** The four mod slots. Empty string means stock / unspecified in that slot. */
export interface Mods {
  engine: string;
  exhaust: string;
  wheels: string;
  brakes: string;
}

export interface BuildNodeData {
  id: string;
  carId: string;
  title: string;
  parentIds: string[];
  attributes: string[];
  /** Structured slots — the source of truth `attributes` is derived from. */
  mods: Mods;
  summary: string;
  heroImage?: string;
  stats: {
    forks: number;
    notes: number;
    contributors: number;
    heat: number;
  };
  createdBy: string;
  createdAt: string;
  isRoot: boolean;
  /** Which mod slot this node introduces; null for the stock root. */
  slot: string | null;
  /** Graph layer: 0 = root, 1 = engine, 2 = exhaust, 3 = wheels, 4 = brakes. */
  level: number;
}

/** One build's full detail: itself, its children, and its posts. */
export interface NodeDetail extends BuildNodeData {
  childIds: string[];
  posts: Note[];
}

export interface Graph {
  car: Car;
  nodes: BuildNodeData[];
}

export interface Car {
  id: string;
  make: string;
  model: string;
  generation?: string;
  yearStart?: number | null;
  yearEnd?: number | null;
  yearRange: string;
  rootNodeId: string;
  /** False when this car has no curated generation data — an open-ended fallback. */
  curated?: boolean;
}

export interface VehicleSearchResult {
  id: string;
  make: string;
  model: string;
  generation: string;
  yearStart: number;
  yearEnd: number | null;
  years: string;
  label: string;
  heroImage: string | null;
  curated: boolean;
  matchedYear: number | null;
}

export interface VehicleSearchResponse {
  query: string;
  results: VehicleSearchResult[];
}

export interface Stats {
  carId: string;
  builds: number;
  mods: number;
  contributors: number;
  active24h: number;
  contributions24h: number;
  posts: number;
  replies: number;
  merges: number;
  modsBySlot: Record<string, number>;
  postsByKind: Record<string, number>;
  deepestChain: number;
  hottestNodeId: string;
}

export interface Part {
  name: string;
  price: number;
  brand: string;
  category: string;
}

export interface CarParts {
  carId: string;
  slots: Record<string, Part[]>;
}

export interface AttributeGroup {
  id: string;
  label: string;
  /** Graph layer this slot occupies — mirrors the node's own `level`. */
  level?: number;
  options: { id: string; label: string; count?: number }[];
}

export interface BuildGuide {
  nodeId: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estCost: string;
  estTime: string;
  parts: { name: string; note: string; approxPrice: string }[];
  steps: { title: string; detail: string }[];
  renderImage?: string;
}

/* --- POST /api/ai/compare --------------------------------------------------- */

export type CompareModKey = "engine" | "exhaust" | "wheels" | "brakes";
export type CompareOperation = "add" | "remove" | "replace" | "unchanged";

export interface CompareMods {
  engine: string | null;
  exhaust: string | null;
  wheels: string | null;
  brakes: string | null;
}

/** Complete snake_case node accepted by the comparison endpoint. */
export interface CompareNode {
  id: string;
  car_id: string;
  title: string;
  parent_ids: string[];
  attributes: string[];
  mods: CompareMods;
  summary: string;
  hero_image?: string | null;
  stats: BuildNodeData["stats"];
  created_by: string;
  created_at: string;
  is_root: boolean;
  slot?: string | null;
  level: number;
}

export interface ModChange {
  mod_key: CompareModKey;
  current: string | null;
  target: string | null;
  operation: CompareOperation;
}

export interface ModOperation {
  operation: Exclude<CompareOperation, "unchanged">;
  mod_key: CompareModKey;
  added?: string | null;
  removed?: string | null;
}

export interface ComparePricing {
  new_parts_cost: number;
  removed_parts_value: number;
  /** Catalogue value delta only; it is not necessarily the owner's upgrade cost. */
  build_value_difference: number;
  pricing_complete: boolean;
  unresolved_added_parts: string[];
  unresolved_removed_parts: string[];
}

export interface CompareResult {
  base_node_id: string;
  target_node_id: string;
  car_id: string;
  changes: ModChange[];
  operations: ModOperation[];
  pricing: ComparePricing;
  resulting_mods: CompareMods;
  matches_target: boolean;
}

/* --- POST /api/ai/build-guide --------------------------------------------- */

export type BuildGuideAction = "add" | "replace" | "remove" | "modify";

export interface TransitionBuildGuidePart {
  name: string;
  category: CompareModKey;
  action: BuildGuideAction;
  replaces?: string | null;
}

export interface TransitionBuildGuideStep {
  instruction: string;
  details?: string | null;
  evidence_ids: string[];
  warnings: string[];
}

export interface TransitionBuildGuideStage {
  order: number;
  title: string;
  components: string[];
  steps: TransitionBuildGuideStep[];
}

export interface TransitionBuildGuide {
  node_a_id: string;
  node_b_id: string;
  title: string;
  summary: string;
  required_changes: TransitionBuildGuidePart[];
  stages: TransitionBuildGuideStage[];
  community_tips: { text: string; evidence_ids: string[] }[];
  dependencies: string[];
  warnings: string[];
  unknowns: { description: string }[];
}

export interface PulseData {
  totalNodes: number;
  contributions24h: number;
  contributors: number;
  hottestNodeId: string;
}

export interface AiSearchResult {
  nodeIds: string[];
  explanation: string;
}

/* --- POST /api/blueprints/engine/analyze ---------------------------------- */

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface EngineImageContext {
  image_type: "ENGINE_BAY" | "ISOLATED_ENGINE" | "INVALID";
  engine_detected: boolean;
  engine_bbox: BoundingBox | null;
  confidence: number;
}

export interface EngineComponent {
  id: string;
  name: string;
  category: string;
  confidence: number;
  description: string;
  bbox: BoundingBox;
  possible_modification: boolean;
  modification_description: string | null;
}

export interface EngineAnalysisResponse {
  success: true;
  image_context: EngineImageContext;
  analysis: {
    image_type: "ENGINE_BAY" | "ISOLATED_ENGINE";
    engine_description: string;
    engine_type: string | null;
    components: EngineComponent[];
    observations: string[];
  };
  component_confidence_threshold: number;
}

/** Ecosystem-wide analytics (hackathon “surfacing data” dashboard).
 *  Backed by GET /api/ecosystem/analytics — real counts from stored data. */
export type AnalyticsRange = "7d" | "30d" | "90d";

export interface AnalyticsKpi {
  value: number;
  deltaPct: number;
}

export interface ActivityDay {
  day: string;
  commits: number;
  merges: number;
  /** Future / not-yet days render muted in the chart. */
  isFuture?: boolean;
}

export interface TrendingBranch {
  rank: number;
  carId: string;
  label: string;
  growthPct: number;
  heatPct: number;
  accent: "red" | "blue" | "yellow";
}

export interface TopBuilder {
  handle: string;
  avatarSeed: string;
  contributions: number;
  ring: "red" | "blue" | "neutral";
}

export interface EcosystemAnalytics {
  range: AnalyticsRange;
  kpis: {
    totalForks: AnalyticsKpi;
    activeBuilders: AnalyticsKpi;
    newSeeds: AnalyticsKpi;
    totalMerges: AnalyticsKpi;
  };
  activity: ActivityDay[];
  network: {
    status: "STABLE" | "DEGRADED" | "HOT";
    avgBranchDepth: number;
    depthPct: number;
    diversityPct: number;
  };
  trending: TrendingBranch[];
  builders: TopBuilder[];
}
