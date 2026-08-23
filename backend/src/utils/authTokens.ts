import crypto from "crypto";

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutos
export const USER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/**
 * Normaliza e valida um endereço de e-mail (lowercase, trim).
 */
export function normalizeEmail(email: string): string {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

/**
 * Validação simples de formato de e-mail.
 */
export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 254) return false;
  // Regex RFC 5322 básica
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(normalized);
}

/**
 * Gera hash SHA-256 de um token qualquer (magic link ou session token).
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Gera um token criptográfico aleatório para Magic Link (URL-safe base64).
 */
export function generateMagicLinkToken(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: number;
} {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = Date.now() + MAGIC_LINK_TTL_MS;
  return { rawToken, tokenHash, expiresAt };
}

/**
 * Gera um token de sessão de usuário persistente.
 */
export function generateUserSessionToken(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: number;
} {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = Date.now() + USER_SESSION_TTL_MS;
  return { rawToken, tokenHash, expiresAt };
}
