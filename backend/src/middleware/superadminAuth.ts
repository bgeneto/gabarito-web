import crypto from "crypto";
import { Context, Next } from "hono";

import { enforceSuperadminRateLimits } from "./authRateLimiter.js";
import { normalizeSuperadminToken } from "../utils/superadminToken.js";
import { getClientIp } from "./rateLimiter.js";

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

export function isSuperadminBackupEnabled(): boolean {
  if (!isSuperadminEnabled()) return false;
  const raw = process.env.SUPERADMIN_BACKUP_ENABLED;
  if (raw === undefined || raw.trim() === "") return true;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
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

export async function superadminAuth(c: Context, next: Next) {
  if (!isSuperadminEnabled()) {
    return c.json({ error: "Não encontrado" }, 404);
  }

  await enforceSuperadminRateLimits(c, async () => {
    const ip = getClientIp(c);

    if (allowedIps && !allowedIps.includes(ip)) {
      c.res = c.json(
        { error: "Não autorizado", message: "Acesso negado." },
        401,
      );
      return;
    }

    const token = normalizeSuperadminToken(extractBearerToken(c) ?? undefined);
    if (!token) {
      c.res = c.json(
        { error: "Não autorizado", message: "Token de superadmin ausente." },
        401,
      );
      return;
    }

    const tokenHash = hashToken(token);
    if (!timingSafeEqualHex(tokenHash, superadminTokenHash!)) {
      c.res = c.json(
        { error: "Não autorizado", message: "Token de superadmin inválido." },
        401,
      );
      return;
    }

    await next();
  });
}
