/**
 * Real FastAPI backend client. Every function here hits the server your
 * teammate built — no mocking, no local state.
 */

import type {
  AnalyticsRange,
  AttributeGroup,
  Car,
  CarParts,
  EcosystemAnalytics,
  Graph,
  Mods,
  Note,
  NodeDetail,
  NoteReply,
  Stats,
  VehicleSearchResponse,
} from "../types";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
const API = `${BASE_URL}/api`;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      /* body wasn't JSON — keep statusText */
    }
    throw new Error(`${res.status} ${path}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function searchVehicles(
  q: string,
  limit = 8,
): Promise<VehicleSearchResponse> {
  return apiFetch(
    `/vehicles/search?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
}

export async function getCar(carId: string): Promise<Car> {
  return apiFetch(`/cars/${encodeURIComponent(carId)}`);
}

export async function getGraphByCarId(carId: string): Promise<Graph> {
  return apiFetch(`/cars/${encodeURIComponent(carId)}/graph`);
}

/**
 * getDAG by make/model(/generation/year) — creates the car (and its stock
 * root) on first visit, same as `getGraphByCarId`, but also works for cars
 * with no curated generation data, where `/cars/{carId}/graph` 404s because
 * there's no way to reverse an "All years" fallback id back to a make/model.
 */
export async function getOrCreateGraphByName(
  make: string,
  model: string,
  generation?: string,
  year?: number,
): Promise<Graph> {
  const params = new URLSearchParams({ make, model });
  if (generation) params.set("generation", generation);
  if (year != null) params.set("year", String(year));
  return apiFetch(`/graph?${params.toString()}`);
}

export async function getCarStats(carId: string): Promise<Stats> {
  return apiFetch(`/cars/${encodeURIComponent(carId)}/stats`);
}

export async function getEcosystemAnalytics(
  range: AnalyticsRange = "30d",
): Promise<EcosystemAnalytics> {
  return apiFetch(`/ecosystem/analytics?range=${encodeURIComponent(range)}`);
}

export async function getCarAttributeGroups(
  carId: string,
): Promise<AttributeGroup[]> {
  return apiFetch(`/cars/${encodeURIComponent(carId)}/attributes`);
}

export async function getAllAttributeGroups(): Promise<AttributeGroup[]> {
  return apiFetch(`/attributes`);
}

export async function getCarParts(carId: string): Promise<CarParts> {
  return apiFetch(`/cars/${encodeURIComponent(carId)}/parts`);
}

export async function getNodeDetail(nodeId: string): Promise<NodeDetail> {
  return apiFetch(`/nodes/${encodeURIComponent(nodeId)}`);
}

export interface CreateNodeRequest {
  title: string;
  mods: Mods;
  summary?: string;
  heroImage?: string | null;
  createdBy?: string;
  parentIds?: string[];
}

export async function createNode(
  carId: string,
  req: CreateNodeRequest,
): Promise<NodeDetail> {
  return apiFetch(`/cars/${encodeURIComponent(carId)}/nodes`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getPosts(nodeId: string): Promise<Note[]> {
  return apiFetch(`/nodes/${encodeURIComponent(nodeId)}/posts`);
}

export async function getPost(postId: string): Promise<Note> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}`);
}

export interface CreatePostRequest {
  kind: string;
  title: string;
  body?: string;
  mediaUrl?: string;
  durationSec?: number;
  author?: string;
  canvasX?: number;
  canvasY?: number;
  canvasW?: number;
  canvasH?: number;
}

export async function createPost(
  nodeId: string,
  req: CreatePostRequest,
): Promise<Note> {
  return apiFetch(`/nodes/${encodeURIComponent(nodeId)}/posts`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function uploadPost(
  nodeId: string,
  form: FormData,
): Promise<Note> {
  return apiFetch(`/nodes/${encodeURIComponent(nodeId)}/posts/upload`, {
    method: "POST",
    body: form,
  });
}

export async function movePost(
  postId: string,
  pos: { canvasX: number; canvasY: number; canvasW?: number; canvasH?: number },
): Promise<Note> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}/position`, {
    method: "PATCH",
    body: JSON.stringify(pos),
  });
}

export async function getReplies(postId: string): Promise<NoteReply[]> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}/replies`);
}

export async function createReply(
  postId: string,
  body: string,
  author = "You",
): Promise<NoteReply> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}/replies`, {
    method: "POST",
    body: JSON.stringify({ body, author }),
  });
}
