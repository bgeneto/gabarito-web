const SESSION_KEY = "gabarito:admin:session";

export function getAdminSession(): string | null {
  try {
    const token = sessionStorage.getItem(SESSION_KEY);
    return token && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export function setAdminSession(sessionToken: string): void {
  sessionStorage.setItem(SESSION_KEY, sessionToken.trim());
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function hasAdminSession(): boolean {
  return Boolean(getAdminSession());
}

/** @deprecated Use getAdminSession */
export const getAdminToken = getAdminSession;

/** @deprecated Use setAdminSession */
export const setAdminToken = setAdminSession;

/** @deprecated Use clearAdminSession */
export const clearAdminToken = clearAdminSession;

/** @deprecated Use hasAdminSession */
export const hasAdminToken = hasAdminSession;
