/**
 * Resolve media URLs for <img src>.
 *
 * - Frontend static assets (`/cars/...`, `/blueprints/...`) stay on the Next
 *   origin so they work on Vercel without the API.
 * - Backend local uploads (`/media/...`) must hit the API host.
 * - Absolute / data / blob URLs pass through (except localhost API media
 *   rewritten to the current NEXT_PUBLIC_API_URL for deploy).
 */

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

/** Paths served from frontend/public — do not prefix with the API origin. */
const FRONTEND_STATIC_PREFIXES = ["/cars/", "/blueprints/", "/audio/"];

export function resolveMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;

  // Absolute API media from local seed (`http://localhost:8000/media/...`)
  // → rewrite to the configured API host so production still works if old
  // rows linger in the DB. Same for relative /media after rewrite.
  if (
    url.startsWith("http://localhost:8000/") ||
    url.startsWith("http://127.0.0.1:8000/")
  ) {
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    if (FRONTEND_STATIC_PREFIXES.some((p) => path.startsWith(p))) {
      // Was wrongly stored as API-absolute frontend asset
      return path;
    }
    if (path.startsWith("/media/cars/")) {
      // Old seed: API media cars → frontend public cars
      return path.replace("/media/cars/", "/cars/");
    }
    return `${API_ORIGIN}${path}`;
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  const path = url.startsWith("/") ? url : `/${url}`;

  // Demo car photos and other Next public assets
  if (FRONTEND_STATIC_PREFIXES.some((p) => path.startsWith(p))) {
    return path;
  }
  // Legacy path form for demo cars
  if (path.startsWith("/media/cars/")) {
    return path.replace("/media/cars/", "/cars/");
  }

  // Backend-hosted uploads
  return `${API_ORIGIN}${path}`;
}
