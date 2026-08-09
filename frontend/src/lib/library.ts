/**
 * Local-only "Save to Library" store.
 * Persists lightweight node snapshots in localStorage — no API.
 */

import type { BuildNodeData } from "./types";

const STORAGE_KEY = "buildamod:library";
export const LIBRARY_CHANGED_EVENT = "buildamod:library-changed";

export type SavedMod = {
  nodeId: string;
  carId: string;
  title: string;
  summary: string;
  heroImage?: string;
  attributes: string[];
  savedAt: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readAll(): SavedMod[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SavedMod =>
        !!x &&
        typeof x === "object" &&
        typeof (x as SavedMod).nodeId === "string" &&
        typeof (x as SavedMod).carId === "string" &&
        typeof (x as SavedMod).title === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(items: SavedMod[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(LIBRARY_CHANGED_EVENT));
}

export function getLibrary(): SavedMod[] {
  return readAll().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

export function getLibraryForCar(carId: string): SavedMod[] {
  return getLibrary().filter((m) => m.carId === carId);
}

export function isInLibrary(nodeId: string): boolean {
  return readAll().some((m) => m.nodeId === nodeId);
}

export function saveToLibrary(node: BuildNodeData): SavedMod {
  const items = readAll().filter((m) => m.nodeId !== node.id);
  const entry: SavedMod = {
    nodeId: node.id,
    carId: node.carId,
    title: node.title,
    summary: node.summary,
    heroImage: node.heroImage,
    attributes: [...node.attributes],
    savedAt: new Date().toISOString(),
  };
  writeAll([entry, ...items]);
  return entry;
}

export function removeFromLibrary(nodeId: string): void {
  writeAll(readAll().filter((m) => m.nodeId !== nodeId));
}

export function toggleLibrary(node: BuildNodeData): boolean {
  if (isInLibrary(node.id)) {
    removeFromLibrary(node.id);
    return false;
  }
  saveToLibrary(node);
  return true;
}
