/** Normaliza token lido do .env ou digitado pelo usuário (trim, aspas, BOM). */
export function normalizeSuperadminToken(
  raw: string | undefined,
): string | null {
  if (!raw) return null;
  let token = raw.trim();
  if (token.charCodeAt(0) === 0xfeff) {
    token = token.slice(1).trim();
  }
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  return token.length > 0 ? token : null;
}
