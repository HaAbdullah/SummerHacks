/**
 * Mock API contract for MODBRANCH.
 * Backend will later swap these internals for fetch() calls.
 *
 * Future REST mapping:
 * | Function            | Method + path                      |
 * |---------------------|------------------------------------|
 * | searchCars          | GET /api/cars?q=                   |
 * | getCar              | GET /api/cars/:carId               |
 * | getGraph            | GET /api/cars/:carId/graph         |
 * | getNode / getNotes  | GET /api/nodes/:id, .../notes      |
 * | addNote             | POST /api/nodes/:id/notes          |
 * | createBranch        | POST /api/branches                 |
 * | aiSearch            | POST /api/ai/search                |
 * | generateBuildGuide  | POST /api/ai/build-guide           |
 * | getAttributeGroups  | GET /api/cars/:carId/attributes    |
 * | getPulse            | GET /api/cars/:carId/pulse         |
 */

import type {
  AiSearchResult,
  AttributeGroup,
  BuildGuide,
  BuildNodeData,
  Car,
  ChatMessage,
  Note,
  NoteReply,
  PulseData,
} from "../types";
import {
  attributeGroups,
  buildGuideTemplates,
  cars,
  familyForNode,
  seedNodes,
  seedNotes,
} from "./seed";

// In-memory session store (mutated by createBranch / addNote)
let nodes: BuildNodeData[] = structuredClone(seedNodes);
let notes: Note[] = structuredClone(seedNotes);
let noteReplies: NoteReply[] = [];
let chats: ChatMessage[] = seedNotes.slice(0, 40).map((n, i) => ({
  id: `chat-${n.id}`,
  nodeId: n.nodeId,
  author: n.author,
  avatarColor: n.avatarColor,
  body: n.body ?? "Nice build.",
  createdAt: n.createdAt,
  role: "community" as const,
  // spread uniqueness
  ...(i % 7 === 0 ? {} : {}),
}));

function delay(ms?: number): Promise<void> {
  const t = ms ?? 150 + Math.floor(Math.random() * 250);
  return new Promise((r) => setTimeout(r, t));
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function searchCars(query: string): Promise<Car[]> {
  await delay();
  const q = query.trim().toLowerCase();
  if (!q) return cars.slice(0, 3);
  return cars.filter((c) => {
    const hay = `${c.make} ${c.model} ${c.id}`.toLowerCase();
    return hay.includes(q) || q.includes(c.make.toLowerCase().slice(0, 3));
  });
}

export async function getCar(carId: string): Promise<Car> {
  await delay();
  const found = cars.find((c) => c.id === carId);
  if (found) return found;
  // Unknown car → synthesize empty garage entry
  const [make = "Unknown", ...rest] = carId.split("-");
  return {
    id: carId,
    make: make.charAt(0).toUpperCase() + make.slice(1),
    model: rest.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") || "Model",
    yearRange: "—",
    rootNodeId: "",
  };
}

export async function getGraph(carId: string): Promise<BuildNodeData[]> {
  await delay();
  return nodes.filter((n) => n.carId === carId).map((n) => structuredClone(n));
}

export async function getNode(nodeId: string): Promise<BuildNodeData> {
  await delay();
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  return structuredClone(node);
}

export async function getNotes(nodeId: string): Promise<Note[]> {
  await delay();
  return notes
    .filter((n) => n.nodeId === nodeId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .map((n) => structuredClone(n));
}

export async function addNote(
  nodeId: string,
  input: Omit<Note, "id" | "createdAt">,
): Promise<Note> {
  await delay();
  const created: Note = {
    canvasX: input.canvasX ?? 120 + Math.random() * 400,
    canvasY: input.canvasY ?? 100 + Math.random() * 300,
    canvasW: input.canvasW ?? (input.kind === "image" || input.kind === "sketch" ? 280 : 220),
    canvasH: input.canvasH ?? (input.kind === "image" || input.kind === "sketch" ? 180 : 120),
    ...input,
    nodeId,
    id: `note-${nodeId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  notes = [created, ...notes];
  nodes = nodes.map((n) =>
    n.id === nodeId
      ? {
          ...n,
          stats: {
            ...n.stats,
            notes: n.stats.notes + 1,
          },
        }
      : n,
  );
  return structuredClone(created);
}

export async function updateNotePosition(
  noteId: string,
  pos: { canvasX: number; canvasY: number; canvasW?: number; canvasH?: number },
): Promise<Note> {
  await delay(80);
  const idx = notes.findIndex((n) => n.id === noteId);
  if (idx < 0) throw new Error(`Note not found: ${noteId}`);
  notes[idx] = { ...notes[idx], ...pos };
  return structuredClone(notes[idx]);
}

/** A single community contribution (posting) by id — for its dedicated page. */
export async function getContribution(noteId: string): Promise<Note> {
  await delay();
  const found = notes.find((n) => n.id === noteId);
  if (!found) throw new Error(`Contribution not found: ${noteId}`);
  return structuredClone(found);
}

export async function getContributionReplies(
  noteId: string,
): Promise<NoteReply[]> {
  await delay();
  return noteReplies
    .filter((r) => r.noteId === noteId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((r) => structuredClone(r));
}

export async function addContributionReply(
  noteId: string,
  body: string,
  author = "You",
): Promise<NoteReply> {
  await delay(120);
  const reply: NoteReply = {
    id: `reply-${noteId}-${Date.now()}`,
    noteId,
    author,
    avatarColor: "#d5001c",
    body,
    createdAt: new Date().toISOString(),
  };
  noteReplies = [...noteReplies, reply];
  return structuredClone(reply);
}

export async function getChat(nodeId: string): Promise<ChatMessage[]> {
  await delay();
  return chats
    .filter((c) => c.nodeId === nodeId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((c) => structuredClone(c));
}

export async function sendChatMessage(
  nodeId: string,
  body: string,
  role: "user" | "community" = "community",
): Promise<ChatMessage> {
  await delay(120);
  const msg: ChatMessage = {
    id: `chat-${Date.now()}`,
    nodeId,
    author: role === "user" ? "You" : "You",
    avatarColor: "#d5001c",
    body,
    createdAt: new Date().toISOString(),
    role,
  };
  chats = [...chats, msg];
  return structuredClone(msg);
}

export async function askAiChat(
  nodeId: string,
  question: string,
): Promise<ChatMessage[]> {
  await delay(600);
  const node = nodes.find((n) => n.id === nodeId);
  const user: ChatMessage = {
    id: `ai-u-${Date.now()}`,
    nodeId,
    author: "You",
    avatarColor: "#1d1d1f",
    body: question,
    createdAt: new Date().toISOString(),
    role: "user",
  };
  const reply: ChatMessage = {
    id: `ai-a-${Date.now() + 1}`,
    nodeId,
    author: "BuildaMod AI",
    avatarColor: "#0071e3",
    body: node
      ? `For **${node.title}**: based on community notes, prioritize ${node.attributes.slice(0, 3).join(", ") || "core mods"} first. Est. difficulty tracks heat (${Math.round(node.stats.heat * 100)}). Want a full build guide or a part list?`
      : "I can help plan this build — ask about parts, cost, or steps.",
    createdAt: new Date().toISOString(),
    role: "ai",
  };
  chats = [...chats, user, reply];
  return [structuredClone(user), structuredClone(reply)];
}

export async function createBranch(
  parentIds: string[],
  input: {
    title: string;
    attributes: string[];
    summary: string;
    /** Required when planting a root (parentIds empty). */
    carId?: string;
  },
): Promise<BuildNodeData> {
  await delay(300);
  let carId = input.carId;
  if (parentIds.length === 0) {
    if (!carId) throw new Error("carId required when planting a root");
  } else {
    const parents = nodes.filter((n) => parentIds.includes(n.id));
    if (parents.length !== parentIds.length) throw new Error("Invalid parents");
    carId = parents[0].carId;
  }
  const id = `n-${slugify(input.title)}-${Date.now().toString(36)}`;
  const node: BuildNodeData = {
    id,
    carId: carId!,
    title: input.title,
    parentIds: [...parentIds],
    attributes: [...input.attributes],
    summary: input.summary,
    heroImage: `https://picsum.photos/seed/${id}-hero/1000/560`,
    stats: {
      forks: 0,
      notes: 0,
      contributors: 1,
      heat: parentIds.length > 1 ? 0.7 : parentIds.length === 0 ? 1 : 0.45,
    },
    createdBy: "You",
    createdAt: new Date().toISOString(),
  };
  nodes = [...nodes, node];
  for (const pid of parentIds) {
    nodes = nodes.map((n) =>
      n.id === pid
        ? { ...n, stats: { ...n.stats, forks: n.stats.forks + 1 } }
        : n,
    );
  }
  return structuredClone(node);
}

export async function aiSearch(
  carId: string,
  query: string,
): Promise<AiSearchResult> {
  await delay(400);
  const q = query.toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter(Boolean);
  const labelMap = new Map<string, string>();
  for (const g of attributeGroups) {
    for (const o of g.options) labelMap.set(o.id, o.label.toLowerCase());
  }

  const scored = nodes
    .filter((n) => n.carId === carId)
    .map((n) => {
      const attrLabels = n.attributes
        .map((a) => labelMap.get(a) ?? a)
        .join(" ");
      const hay = `${n.title} ${n.summary} ${n.attributes.join(" ")} ${attrLabels}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 2;
        if (n.title.toLowerCase().includes(t)) score += 2;
        if (n.attributes.some((a) => a.includes(t) || (labelMap.get(a) ?? "").includes(t)))
          score += 3;
      }
      // synonym helpers for demo query "red wrap v8"
      if (q.includes("red") && n.attributes.includes("red")) score += 4;
      if ((q.includes("v8") || q.includes("engine")) && n.attributes.includes("v8"))
        score += 4;
      if (q.includes("wrap") && (n.attributes.includes("red") || n.attributes.includes("black") || n.attributes.includes("blue")))
        score += 2;
      score += n.stats.heat;
      return { n, score };
    })
    .filter((x) => x.score > 1)
    .sort((a, b) => b.score - a.score || b.n.stats.heat - a.n.stats.heat);

  const top = scored.slice(0, 8);
  const nodeIds = top.map((x) => x.n.id);
  const hottest = top[0]?.n;
  const explanation = hottest
    ? `Found ${nodeIds.length} build${nodeIds.length === 1 ? "" : "s"} matching ${query.trim()}. The hottest is ${hottest.title} with ${hottest.stats.contributors} contributors.`
    : `No builds matched "${query.trim()}". Try attributes like red wrap or V8 swap.`;

  return { nodeIds, explanation };
}

export async function generateBuildGuide(nodeId: string): Promise<BuildGuide> {
  await delay(2500);
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  const family = familyForNode(node);
  const tmpl = buildGuideTemplates[family];
  const attrLabels = node.attributes.join(", ");
  return {
    nodeId,
    title: `Build guide — ${node.title}`,
    difficulty: tmpl.difficulty,
    estCost: tmpl.estCost,
    estTime: tmpl.estTime,
    parts: tmpl.parts.map((p) => ({
      ...p,
      note: `${p.note} · tags: ${attrLabels}`,
    })),
    steps: tmpl.steps.map((s) => ({
      ...s,
      detail: s.detail.replace(/\.$/, "") + ` (${node.title}).`,
    })),
    renderImage: `https://picsum.photos/seed/${nodeId}-render/1000/560`,
  };
}

export async function getAttributeGroups(
  _carId: string,
): Promise<AttributeGroup[]> {
  await delay();
  return structuredClone(attributeGroups);
}

export async function getPulse(carId: string): Promise<PulseData> {
  await delay();
  const graph = nodes.filter((n) => n.carId === carId);
  const hottest = [...graph].sort((a, b) => b.stats.heat - a.stats.heat)[0];
  const contributors = new Set(graph.map((n) => n.createdBy)).size + 20;
  return {
    totalNodes: graph.length,
    contributions24h: Math.min(48, 12 + graph.reduce((s, n) => s + n.stats.notes, 0) % 30),
    contributors,
    hottestNodeId: hottest?.id ?? "",
  };
}

/** Test helper — not part of public contract */
export function __resetMockDb(): void {
  nodes = structuredClone(seedNodes);
  notes = structuredClone(seedNotes);
  chats = [];
  noteReplies = [];
}
