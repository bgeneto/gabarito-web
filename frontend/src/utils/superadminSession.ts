const TOKEN_KEY = "gabarito:superadmin:token";
const EXPIRES_KEY = "gabarito:superadmin:expires_at";

function isSessionExpired(): boolean {
  try {
    const expiresAt = sessionStorage.getItem(EXPIRES_KEY);
    if (!expiresAt) return false;
    return Date.now() > Number(expiresAt);
  } catch {
    return true;
  }
}

export function getSuperadminToken(): string | null {
  try {
    if (isSessionExpired()) {
      clearSuperadminToken();
      return null;
    }
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSuperadminToken(
  token: string,
  expiresAt?: number | null,
): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  if (expiresAt != null && expiresAt > 0) {
    sessionStorage.setItem(EXPIRES_KEY, String(expiresAt));
  } else {
    sessionStorage.removeItem(EXPIRES_KEY);
  }
}

export function clearSuperadminToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_KEY);
}

export function hasSuperadminToken(): boolean {
  return Boolean(getSuperadminToken());
}

export function getSuperadminSessionExpiresAt(): number | null {
  try {
    if (isSessionExpired()) {
      clearSuperadminToken();
      return null;
    }
    const expiresAt = sessionStorage.getItem(EXPIRES_KEY);
    return expiresAt ? Number(expiresAt) : null;
  } catch {
    return null;
  }
}
