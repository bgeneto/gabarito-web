const SESSION_KEY = "gabarito:superadmin:token";

export function getSuperadminToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSuperadminToken(token: string): void {
  sessionStorage.setItem(SESSION_KEY, token);
}

export function clearSuperadminToken(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function hasSuperadminToken(): boolean {
  return Boolean(getSuperadminToken());
}
