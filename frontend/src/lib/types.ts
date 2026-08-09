export type MediaKind = "text" | "image" | "sketch" | "voice" | "video" | "blueprint";

export interface Note {
  id: string;
  nodeId: string;
  author: string;
  avatarColor: string;
  kind: MediaKind;
  body?: string;
  mediaUrl?: string;
  durationSec?: number;
  createdAt: string;
  /** Milanote-style freeform position on the node canvas */
  canvasX?: number;
  canvasY?: number;
  canvasW?: number;
  canvasH?: number;
}

/** A reply on a single community contribution's dedicated page (distinct
 *  from ChatMessage, which is the node-level Community/AI chat). */
export interface NoteReply {
  id: string;
  noteId: string;
  author: string;
  avatarColor: string;
  body: string;
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

export interface BuildNodeData {
  id: string;
  carId: string;
  title: string;
  parentIds: string[];
  attributes: string[];
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
  /** Mechanical state and graph placement supplied by the backend graph API. */
  mods?: CompareMods;
  isRoot?: boolean;
  slot?: string | null;
  level?: number;
}

export interface Car {
  id: string;
  make: string;
  model: string;
  yearRange: string;
  rootNodeId: string;
}

export interface AttributeGroup {
  id: string;
  label: string;
  options: { id: string; label: string }[];
}

export interface BuildGuide {
  nodeId: string;
  title: string;
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
