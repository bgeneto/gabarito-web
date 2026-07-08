const ADMIN_TOKEN_PATTERN = /^adm_[0-9A-Z]{6}$/;

export function isAdminToken(value: string): boolean {
  return ADMIN_TOKEN_PATTERN.test(normalizeAdminToken(value) ?? "");
}

export function normalizeAdminToken(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^adm_([0-9A-Za-z]{6})$/i);
  if (!match) {
    return null;
  }

  return `adm_${match[1].toUpperCase()}`;
}

function base64UrlToString(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

export function encodeAdminTokenForUrl(adminToken: string): string {
  const normalized = normalizeAdminToken(adminToken);
  if (!normalized) {
    throw new Error("Token administrativo inválido.");
  }

  return btoa(normalized)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Accepts raw adm_XXXXXX links and legacy/base64url-encoded deep links.
 * Encoding is cosmetic only — not a security control.
 */
export function parseAdminTokenFromUrlSegment(segment: string): string | null {
  const trimmed = segment.trim();
  if (!trimmed) return null;

  const rawCandidate = normalizeAdminToken(trimmed);
  if (rawCandidate) {
    return rawCandidate;
  }

  const decoded = base64UrlToString(trimmed);
  if (!decoded) return null;

  return normalizeAdminToken(decoded);
}
