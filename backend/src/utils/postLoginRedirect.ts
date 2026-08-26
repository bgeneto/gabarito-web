/**
 * Destinos internos permitidos após o magic link.
 * Rejeita URLs absolutas, protocol-relative (`//`) e rotas de auth/superadmin.
 * Manter alinhado com `frontend/src/utils/postLoginRedirect.ts`.
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

export function resolvePostLoginDestination(options: {
  targetRoute?: string | null;
  examCount: number;
  submissionCount: number;
}): string {
  const explicit = sanitizePostLoginPath(options.targetRoute);
  if (explicit) return explicit;

  const hasExams = options.examCount > 0;
  const hasSubmissions = options.submissionCount > 0;

  if (hasExams && !hasSubmissions) return "/minhas-provas";
  if (hasSubmissions && !hasExams) return "/meus-resultados";
  return "/conta";
}
