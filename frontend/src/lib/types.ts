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
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estCost: string;
  estTime: string;
  parts: { name: string; note: string; approxPrice: string }[];
  steps: { title: string; detail: string }[];
  renderImage?: string;
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
