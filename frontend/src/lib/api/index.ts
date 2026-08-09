/**
 * BuildaMod API layer.
 *
 * Graph / nodes / posts / replies / stats / attributes / vehicle search / the
 * node AI chatbox are real — backed by the FastAPI service in `backend/` via
 * `./backend`.
 *
 * AI search and build-guide generation stay mocked client-side: the backend
 * only exposes structured data for those (`/ai/compare`, `/ai/build-mod`),
 * not an actual generation call. Each mocked function below reads *live*
 * graph/node data instead of static fixtures, so it still behaves sensibly
 * against the real backend.
 */

import type {
  AiSearchResult,
  AnalyticsRange,
  AttributeGroup,
  BuildGuide,
  BuildNodeData,
  Car,
  ChatMessage,
  EcosystemAnalytics,
  EngineAnalysisResponse,
  MediaKind,
  Mods,
  Note,
  NoteReply,
  PromptSuggestion,
  PulseData,
} from "../types";
import * as backend from "./backend";
import { buildGuideTemplates, type GuideTier } from "./seed";

export { CompareError, compareNodes, toCompareNode } from "./compare";

export async function analyzeEngineImage(
  image: File,
): Promise<EngineAnalysisResponse> {
  return backend.analyzeEngineImage(image);
}

export async function renderEngineBlueprint(
  image: File,
  analysis: EngineAnalysisResponse,
): Promise<Blob> {
  return backend.renderEngineBlueprint(image, analysis);
}

// Local-only mock store — node-level Community/AI chat has no backend yet.
let chats: ChatMessage[] = [];

function delay(ms?: number): Promise<void> {
  const t = ms ?? 150 + Math.floor(Math.random() * 250);
  return new Promise((r) => setTimeout(r, t));
}

// --- vehicles / cars ----------------------------------------------------

export async function searchCars(query: string): Promise<Car[]> {
  if (!query.trim()) return [];
  const { results } = await backend.searchVehicles(query);
  return results.map((r) => ({
    id: r.id,
    make: r.make,
    model: r.model,
    generation: r.generation,
    yearStart: r.yearStart,
    yearEnd: r.yearEnd,
    yearRange: r.years,
    rootNodeId: "",
    curated: r.curated,
  }));
}

/** make/model(/generation) to fall back to when a bare carId can't be
 * resolved — needed for cars with no curated generation data, whose id
 * can't be reversed back into a make/model server-side. */
export interface CarFallback {
  make: string;
  model: string;
  generation?: string;
}

async function resolveGraph(
  carId: string,
  fallback?: CarFallback,
): Promise<{ car: Car; nodes: BuildNodeData[] }> {
  // Route through getGraphByCarId (auto-creates on first visit) instead of
  // GET /cars/{id} directly — that endpoint 404s until a graph exists, which
  // races the create-on-first-visit sequence for a brand-new carId.
  try {
    const graph = await backend.getGraphByCarId(carId);
    return { car: graph.car, nodes: graph.nodes };
  } catch (err) {
    if (!fallback) throw err;
    // Uncurated cars 404 on the by-id route (their id can't be reversed back
    // into a make/model), so retry by name — this creates the same carId.
    const graph = await backend.getOrCreateGraphByName(
      fallback.make,
      fallback.model,
      fallback.generation,
    );
    return { car: graph.car, nodes: graph.nodes };
  }
}

export async function getCar(carId: string, fallback?: CarFallback): Promise<Car> {
  const { car } = await resolveGraph(carId, fallback);
  return car;
}

// --- graph / nodes -------------------------------------------------------

export async function getGraph(
  carId: string,
  fallback?: CarFallback,
): Promise<BuildNodeData[]> {
  const { nodes } = await resolveGraph(carId, fallback);
  return nodes;
}

export async function getNode(nodeId: string): Promise<BuildNodeData> {
  return backend.getNodeDetail(nodeId);
}

export async function createBranch(
  carId: string,
  parentIds: string[],
  input: {
    title: string;
    mods: Mods;
    summary?: string;
    heroImage?: string;
    createdBy?: string;
  },
): Promise<BuildNodeData> {
  return backend.createNode(carId, {
    title: input.title,
    mods: input.mods,
    summary: input.summary,
    heroImage: input.heroImage,
    createdBy: input.createdBy ?? "You",
    parentIds,
  });
}

export async function getAttributeGroups(
  carId: string,
): Promise<AttributeGroup[]> {
  return backend.getCarAttributeGroups(carId);
}

export async function getCarParts(carId: string) {
  return backend.getCarParts(carId);
}

// --- community: posts / replies ------------------------------------------

export async function getNotes(nodeId: string): Promise<Note[]> {
  return backend.getPosts(nodeId);
}

function defaultTitle(kind: MediaKind, body?: string): string {
  const trimmed = body?.trim();
  if (trimmed) return trimmed.slice(0, 60);
  return (
    { text: "Note", image: "Photo", sketch: "Sketch", voice: "Voice note", video: "Video", blueprint: "Blueprint" }[
      kind
    ] ?? "Note"
  );
}

export async function addNote(
  nodeId: string,
  input: Omit<Note, "id" | "createdAt" | "title"> & { title?: string },
): Promise<Note> {
  return backend.createPost(nodeId, {
    kind: input.kind,
    title: input.title ?? defaultTitle(input.kind, input.body),
    body: input.body,
    mediaUrl: input.mediaUrl,
    durationSec: input.durationSec,
    author: input.author,
    canvasX: input.canvasX,
    canvasY: input.canvasY,
    canvasW: input.canvasW,
    canvasH: input.canvasH,
  });
}

/** Upload a real file (image/voice/sketch) instead of a client-only blob URL. */
export async function uploadNote(
  nodeId: string,
  file: File | Blob,
  meta: {
    kind: MediaKind;
    author: string;
    body?: string;
    durationSec?: number;
    filename?: string;
  },
): Promise<Note> {
  const filename =
    meta.filename ?? (file instanceof File ? file.name : `${meta.kind}-${Date.now()}`);
  const form = new FormData();
  form.append("file", file, filename);
  form.append("kind", meta.kind);
  form.append("title", defaultTitle(meta.kind, meta.body));
  form.append("body", meta.body ?? "");
  form.append("author", meta.author);
  if (meta.durationSec != null) form.append("durationSec", String(meta.durationSec));
  return backend.uploadPost(nodeId, form);
}

export async function updateNotePosition(
  noteId: string,
  pos: { canvasX: number; canvasY: number; canvasW?: number; canvasH?: number },
): Promise<Note> {
  return backend.movePost(noteId, pos);
}

/** A single community contribution (posting) by id — for its dedicated page. */
export async function getContribution(noteId: string): Promise<Note> {
  return backend.getPost(noteId);
}

export async function getContributionReplies(
  noteId: string,
): Promise<NoteReply[]> {
  return backend.getReplies(noteId);
}

export async function addContributionReply(
  noteId: string,
  body: string,
  author = "You",
): Promise<NoteReply> {
  return backend.createReply(noteId, body, author);
}

// --- pulse (real stats, reshaped) -----------------------------------------

export async function getPulse(carId: string): Promise<PulseData> {
  const s = await backend.getCarStats(carId);
  return {
    totalNodes: s.builds,
    contributions24h: s.contributions24h,
    contributors: s.contributors,
    hottestNodeId: s.hottestNodeId,
  };
}

// --- mocked: node-level community chat (no backend endpoint for this one) -

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
    author: "You",
    avatarColor: "#d5001c",
    body,
    createdAt: new Date().toISOString(),
    role,
  };
  chats = [...chats, msg];
  return structuredClone(msg);
}

// --- AI chatbox (real backend) --------------------------------------------
//
// Grounded server-side in the node's mod info + community notes. Stateless on
// the server, so the full prior thread is sent back as `history` on every
// call — that's what gives the model multi-turn context.

export async function askAiChat(
  nodeId: string,
  question: string,
  priorThread: ChatMessage[] = [],
): Promise<ChatMessage[]> {
  const history = priorThread
    .filter((m): m is ChatMessage & { role: "user" | "ai" } => m.role === "user" || m.role === "ai")
    .map((m) => ({ role: m.role, body: m.body }));
  return backend.askAiChat(nodeId, question, "You", history);
}

/** Auto-generated conversation starters for a node's AI chatbox, grounded in
 * its own community notes where there are any. */
export async function getChatSuggestions(
  nodeId: string,
): Promise<PromptSuggestion[]> {
  return backend.getChatSuggestions(nodeId);
}

// --- mocked: AI search (heuristic scoring over live graph data) -----------

export async function aiSearch(
  carId: string,
  query: string,
): Promise<AiSearchResult> {
  await delay(400);
  const q = query.toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter(Boolean);

  const [graph, groups] = await Promise.all([
    getGraph(carId),
    getAttributeGroups(carId),
  ]);
  const labelMap = new Map<string, string>();
  for (const g of groups) {
    for (const o of g.options) labelMap.set(o.id, o.label.toLowerCase());
  }

  const scored = graph
    .map((n) => {
      const attrLabels = n.attributes.map((a) => labelMap.get(a) ?? a).join(" ");
      const modsText = [n.mods.engine, n.mods.exhaust, n.mods.wheels, n.mods.brakes]
        .filter(Boolean)
        .join(" ");
      const hay =
        `${n.title} ${n.summary} ${n.attributes.join(" ")} ${attrLabels} ${modsText}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 2;
        if (n.title.toLowerCase().includes(t)) score += 2;
        if (modsText.toLowerCase().includes(t)) score += 3;
      }
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
    : `No builds matched "${query.trim()}". Try mod terms like turbo, big brake kit, or all-terrain.`;

  return { nodeIds, explanation };
}

// --- mocked: build guide (heuristic tier from real mod completeness) ------

function tierForNode(node: BuildNodeData): GuideTier {
  const filled = [node.mods.engine, node.mods.exhaust, node.mods.wheels, node.mods.brakes].filter(
    (v) => v.trim(),
  ).length;
  if (filled >= 3) return "offroad";
  if (filled === 2) return "street";
  return "sleek";
}

export async function generateBuildGuide(nodeId: string): Promise<BuildGuide> {
  await delay(2500);
  const node = await getNode(nodeId);
  const tmpl = buildGuideTemplates[tierForNode(node)];
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

// --- ecosystem analytics (real backend rollup) ---------------------------

/** Platform-wide Ecosystem Pulse — GET /api/ecosystem/analytics */
export async function getEcosystemAnalytics(
  range: AnalyticsRange = "30d",
): Promise<EcosystemAnalytics> {
  return backend.getEcosystemAnalytics(range);
}
