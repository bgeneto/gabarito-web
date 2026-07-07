import crypto from "crypto";
import { Context, Next } from "hono";

import { normalizeSuperadminToken } from "../utils/superadminToken.js";
import { getClientIp } from "./rateLimiter.js";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const configuredToken = normalizeSuperadminToken(process.env.SUPERADMIN_TOKEN);
const superadminTokenHash = configuredToken ? hashToken(configuredToken) : null;

const allowedIps = process.env.SUPERADMIN_ALLOWED_IPS
  ? process.env.SUPERADMIN_ALLOWED_IPS.split(",").map((ip) => ip.trim())
  : null;

export function isSuperadminEnabled(): boolean {
  return superadminTokenHash !== null;
}

const DEFAULT_SESSION_TTL_MINUTES = 0;

/** 0 = sem expiração por tempo (apenas até fechar a aba do navegador). */
export function getSuperadminSessionTtlMinutes(): number {
  const raw = process.env.SUPERADMIN_SESSION_TTL_MINUTES;
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_SESSION_TTL_MINUTES;
  }
  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes < 0) {
    return DEFAULT_SESSION_TTL_MINUTES;
  }
  return Math.floor(minutes);
}

export function getSuperadminSessionTtlMs(): number {
  const minutes = getSuperadminSessionTtlMinutes();
  return minutes === 0 ? 0 : minutes * 60 * 1000;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function extractBearerToken(c: Context): string | null {
  const auth = c.req.header("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let info = rateLimitMap.get(ip);

  if (!info || now > info.resetTime) {
    info = { count: 1, resetTime: now + WINDOW_MS };
    rateLimitMap.set(ip, info);
    return true;
  }

  info.count++;
  return info.count <= MAX_REQUESTS;
}

export async function superadminAuth(c: Context, next: Next) {
  if (!isSuperadminEnabled()) {
    return c.json({ error: "Não encontrado" }, 404);
  }

  const ip = getClientIp(c);
  if (!checkRateLimit(ip)) {
    return c.json(
      {
        error: "Too Many Requests",
        message: "Limite de requisições excedido. Aguarde um minuto.",
      },
      429,
    );
  }

  if (allowedIps && !allowedIps.includes(ip)) {
    return c.json({ error: "Não autorizado", message: "Acesso negado." }, 401);
  }

  const token = normalizeSuperadminToken(extractBearerToken(c) ?? undefined);
  if (!token) {
    return c.json(
      { error: "Não autorizado", message: "Token de superadmin ausente." },
      401,
    );
  }

  const tokenHash = hashToken(token);
  if (!timingSafeEqualHex(tokenHash, superadminTokenHash!)) {
    return c.json(
      { error: "Não autorizado", message: "Token de superadmin inválido." },
      401,
    );
  }

  await next();
}
