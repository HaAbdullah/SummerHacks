/** Real backend adapters for graph, node, community, and garage reads/writes.
 *
 * Components keep their existing camelCase contracts. Translation and HTTP errors stay
 * at this boundary so connecting comparison does not force unrelated UI rewrites.
 */

import type {
  AttributeGroup,
  BuildNodeData,
  Car,
  ChatMessage,
  Note,
  NoteReply,
  PulseData,
} from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body?.detail)
      .catch(() => null);
    throw new Error(detail ?? `Backend request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function asNote(post: Record<string, unknown>): Note {
  return {
    id: String(post.id),
    nodeId: String(post.nodeId),
    author: String(post.author),
    avatarColor: String(post.avatarColor ?? "#5e6ad2"),
    kind: post.kind as Note["kind"],
    body: String(post.body ?? ""),
    mediaUrl: post.mediaUrl ? String(post.mediaUrl) : undefined,
    durationSec:
      typeof post.durationSec === "number" ? post.durationSec : undefined,
    createdAt: String(post.createdAt),
    canvasX: typeof post.canvasX === "number" ? post.canvasX : undefined,
    canvasY: typeof post.canvasY === "number" ? post.canvasY : undefined,
    canvasW: typeof post.canvasW === "number" ? post.canvasW : undefined,
    canvasH: typeof post.canvasH === "number" ? post.canvasH : undefined,
  };
}

export async function searchCars(query: string): Promise<Car[]> {
  const payload = await request<{
    results: Array<{
      id: string;
      make: string;
      model: string;
      years?: string;
      yearRange?: string;
    }>;
  }>(`/vehicles/search?q=${encodeURIComponent(query)}`);
  return payload.results.map((result) => ({
    id: result.id,
    make: result.make,
    model: result.model,
    yearRange: result.years ?? result.yearRange ?? "—",
    rootNodeId: "",
  }));
}

export async function getCar(carId: string): Promise<Car> {
  // The graph endpoint creates a searched generation on first visit; the direct car
  // endpoint intentionally returns 404 until that has happened.
  const graph = await request<{ car: Car }>(
    `/cars/${encodeURIComponent(carId)}/graph`,
  );
  return graph.car;
}

export async function getGraph(carId: string): Promise<BuildNodeData[]> {
  const graph = await request<{ car: Car; nodes: BuildNodeData[] }>(
    `/cars/${encodeURIComponent(carId)}/graph`,
  );
  return graph.nodes;
}

export function getNode(nodeId: string): Promise<BuildNodeData> {
  return request<BuildNodeData>(`/nodes/${encodeURIComponent(nodeId)}`);
}

export async function getNotes(nodeId: string): Promise<Note[]> {
  const posts = await request<Record<string, unknown>[]>(
    `/nodes/${encodeURIComponent(nodeId)}/posts`,
  );
  return posts.map(asNote);
}

export async function addNote(
  nodeId: string,
  input: Omit<Note, "id" | "createdAt">,
): Promise<Note> {
  const post = await request<Record<string, unknown>>(
    `/nodes/${encodeURIComponent(nodeId)}/posts`,
    {
      method: "POST",
      body: JSON.stringify({
        kind: input.kind,
        title: input.body?.slice(0, 60) || `${input.kind} contribution`,
        body: input.body ?? "",
        mediaUrl: input.mediaUrl,
        durationSec: input.durationSec,
        author: input.author,
        canvasX: input.canvasX,
        canvasY: input.canvasY,
        canvasW: input.canvasW,
        canvasH: input.canvasH,
      }),
    },
  );
  return asNote(post);
}

export async function updateNotePosition(
  noteId: string,
  pos: {
    canvasX: number;
    canvasY: number;
    canvasW?: number;
    canvasH?: number;
  },
): Promise<Note> {
  const post = await request<Record<string, unknown>>(
    `/posts/${encodeURIComponent(noteId)}/position`,
    { method: "PATCH", body: JSON.stringify(pos) },
  );
  return asNote(post);
}

export async function createBranch(
  parentIds: string[],
  input: {
    title: string;
    attributes: string[];
    summary: string;
    carId?: string;
  },
): Promise<BuildNodeData> {
  let carId = input.carId;
  let inheritedMods: BuildNodeData["mods"];
  if (!carId && parentIds[0]) {
    const parent = await getNode(parentIds[0]);
    carId = parent.carId;
    inheritedMods = parent.mods;
  }
  if (!carId) throw new Error("carId required when creating a root node");

  return request<BuildNodeData>(`/cars/${encodeURIComponent(carId)}/nodes`, {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      parentIds,
      attributes: input.attributes,
      summary: input.summary,
      mods: inheritedMods,
      createdBy: "You",
    }),
  });
}

export function getAttributeGroups(carId: string): Promise<AttributeGroup[]> {
  return request<AttributeGroup[]>(
    `/cars/${encodeURIComponent(carId)}/attributes`,
  );
}

export async function getPulse(carId: string): Promise<PulseData> {
  const stats = await request<{
    builds: number;
    contributions24h: number;
    contributors: number;
    hottestNodeId: string;
  }>(`/cars/${encodeURIComponent(carId)}/stats`);
  return {
    totalNodes: stats.builds,
    contributions24h: stats.contributions24h,
    contributors: stats.contributors,
    hottestNodeId: stats.hottestNodeId,
  };
}

export async function getChat(nodeId: string): Promise<ChatMessage[]> {
  const notes = await getNotes(nodeId);
  return notes.map((note) => ({
    id: `chat-${note.id}`,
    nodeId,
    author: note.author,
    avatarColor: note.avatarColor,
    body: note.body ?? "",
    createdAt: note.createdAt,
    role: "community",
  }));
}

export async function sendChatMessage(
  nodeId: string,
  body: string,
  role: "user" | "community" = "community",
): Promise<ChatMessage> {
  const note = await addNote(nodeId, {
    nodeId,
    author: "You",
    avatarColor: "#d5001c",
    kind: "text",
    body,
  });
  return {
    id: `chat-${note.id}`,
    nodeId,
    author: note.author,
    avatarColor: note.avatarColor,
    body: note.body ?? "",
    createdAt: note.createdAt,
    role,
  };
}

export async function getContribution(noteId: string): Promise<Note> {
  return asNote(
    await request<Record<string, unknown>>(
      `/posts/${encodeURIComponent(noteId)}`,
    ),
  );
}

export function getContributionReplies(noteId: string): Promise<NoteReply[]> {
  return request<NoteReply[]>(
    `/posts/${encodeURIComponent(noteId)}/replies`,
  );
}

export function addContributionReply(
  noteId: string,
  body: string,
  author = "You",
): Promise<NoteReply> {
  return request<NoteReply>(
    `/posts/${encodeURIComponent(noteId)}/replies`,
    { method: "POST", body: JSON.stringify({ body, author }) },
  );
}
