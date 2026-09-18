export type UserSessionProbeAction = "authenticated" | "invalid" | "retry";

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 10000];

/**
 * Decide o que fazer com GET /api/auth/me.
 * Só 401 é sessão inválida (logout). 502/503/5xx/rede devem preservar o token.
 */
export function interpretAuthMeStatus(status: number): UserSessionProbeAction {
  if (status === 401) return "invalid";
  if (status >= 200 && status < 300) return "authenticated";
  return "retry";
}

/** Delay após a N-ésima falha transitória (0-based). */
export function nextSessionProbeDelayMs(failedAttemptIndex: number): number {
  const index = Math.max(0, failedAttemptIndex);
  return RETRY_DELAYS_MS[Math.min(index, RETRY_DELAYS_MS.length - 1)];
}
