/**
 * API base URL. Configurable via build-time replacement or env-style override.
 * Defaults to the local backend on port 5180.
 */
/**
 * Read the backend origin from a global injected by index.html or the build
 * (so we can switch dev ↔ production without recompiling). Falls back to
 * localhost:5180 in development.
 */
function resolveBackendOrigin(): string {
  const g = (globalThis as unknown as { __EDUFLOW_API__?: string }).__EDUFLOW_API__;
  if (g && /^https?:\/\//.test(g)) return g.replace(/\/$/, '');
  return 'http://localhost:5180';
}

export const BACKEND_ORIGIN = resolveBackendOrigin();
export const API_BASE_URL   = `${BACKEND_ORIGIN}/api`;

/** Base URL for static assets served by the backend (e.g. uploaded videos at /media/...). */
export const MEDIA_BASE_URL = BACKEND_ORIGIN;

/**
 * Resolve a stored video/media reference to a URL the browser can load.
 * - http(s)://... → returned as-is (YouTube/Vimeo/external)
 * - /media/...   → prefixed with MEDIA_BASE_URL
 * - null/empty   → null
 */
export function resolveMediaUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (/^https?:\/\//i.test(ref)) return ref;
  if (ref.startsWith('/')) return MEDIA_BASE_URL + ref;
  return ref;
}
