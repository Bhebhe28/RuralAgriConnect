const rawApiUrl = import.meta.env.VITE_API_URL ?? '';

// Extract just the origin from the API URL so we can resolve image paths.
// Dev:  VITE_API_URL="/api"  → origin="" (Vite proxy handles /avatars & /community)
// Prod: VITE_API_URL="https://example.railway.app/api" → origin="https://example.railway.app"
function getApiOrigin(): string {
  if (!rawApiUrl || rawApiUrl.startsWith('/')) return '';
  try { return new URL(rawApiUrl).origin; } catch { return ''; }
}

const API_ORIGIN = getApiOrigin();

/**
 * Resolve an image URL that may be absolute (new uploads) or relative
 * (legacy rows written before the absolute-URL server fix).
 */
export function imgUrl(raw: string | null | undefined): string {
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `${API_ORIGIN}${raw.startsWith('/') ? '' : '/'}${raw}`;
}
