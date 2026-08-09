/**
 * Backend local uploads return relative paths like `/media/nodeId/file.png`.
 * Those must be loaded from the API host (e.g. localhost:8000), not the
 * Next.js origin (localhost:3000) — otherwise <img> shows a broken icon.
 */

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export function resolveMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  // Absolute or data/blob URLs — leave alone
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  // "/media/..." or "media/..."
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_ORIGIN}${path}`;
}
