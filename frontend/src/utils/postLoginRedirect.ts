/**
 * Destinos internos permitidos após o magic link.
 * Manter alinhado com `backend/src/utils/postLoginRedirect.ts`.
 */
const STATIC_PATHS = new Set([
  "/",
  "/conta",
  "/minhas-provas",
  "/meus-resultados",
  "/criar-prova",
  "/admin",
]);

const PROVA_PATH_RE = /^\/prova\/(G\d{2}-[0-9A-Za-z]{6})$/i;
const SUBMISSION_PATH_RE = /^\/submissao\/([0-9A-Za-z]{6})$/;

export function sanitizePostLoginPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\") || trimmed.includes("://")) return null;

  const pathOnly = trimmed.split("?")[0].split("#")[0];
  if (!pathOnly.startsWith("/") || pathOnly.startsWith("//")) return null;

  if (STATIC_PATHS.has(pathOnly)) return pathOnly;

  const provaMatch = pathOnly.match(PROVA_PATH_RE);
  if (provaMatch) return `/prova/${provaMatch[1].toUpperCase()}`;

  const submissionMatch = pathOnly.match(SUBMISSION_PATH_RE);
  if (submissionMatch) {
    return `/submissao/${submissionMatch[1].toUpperCase()}`;
  }

  return null;
}

export function getRedirectQueryParam(
  search = window.location.search,
): string | null {
  return sanitizePostLoginPath(new URLSearchParams(search).get("redirect"));
}

/** Monta `/entrar` preservando a página atual quando ela for um destino seguro. */
export function buildLoginPath(returnPath?: string): string {
  const candidate =
    returnPath ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const safe = sanitizePostLoginPath(candidate);
  if (!safe || safe === "/") {
    return "/entrar";
  }
  return `/entrar?redirect=${encodeURIComponent(safe)}`;
}

export function withUserAuthHeaders(
  sessionToken: string | null | undefined,
  headers?: HeadersInit,
): Headers {
  const next = new Headers(headers);
  if (sessionToken) {
    next.set("Authorization", `Bearer ${sessionToken}`);
  }
  return next;
}
