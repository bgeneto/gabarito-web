import { Context, Next } from "hono";
import { getClientIp } from "./rateLimiter.js";
import { normalizeEmail } from "../utils/authTokens.js";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const magicLinkLimits = new Map<string, RateLimitRecord>();

const MAGIC_LINK_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
export const MAX_MAGIC_LINK_REQUESTS_PER_IP = 20; // máx 20 por IP em 15m
export const MAX_MAGIC_LINK_REQUESTS_PER_EMAIL = 10; // máx 10 por email em 15m

export function resetMagicLinkRateLimitsForTests(): void {
  magicLinkLimits.clear();
}

function checkRateLimit(key: string, max: number, now = Date.now()): boolean {
  let record = magicLinkLimits.get(key);
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + MAGIC_LINK_WINDOW_MS };
    magicLinkLimits.set(key, record);
  }

  if (record.count >= max) {
    return false;
  }

  record.count++;
  return true;
}

export async function magicLinkRateLimiter(c: Context, next: Next) {
  const ip = getClientIp(c);
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: "Requisição inválida", message: "JSON inválido." },
      400,
    );
  }

  // Armazena no contexto para a rota não precisar parsear novamente
  c.set("parsedAuthBody", body);

  const email = normalizeEmail(
    typeof body?.email === "string" ? body.email : "",
  );

  const ipAllowed = checkRateLimit(
    `magic-ip:${ip}`,
    MAX_MAGIC_LINK_REQUESTS_PER_IP,
  );
  if (!ipAllowed) {
    return c.json(
      {
        error: "Too Many Requests",
        message:
          "Muitas solicitações de link mágico deste endereço. Aguarde 15 minutos e tente novamente.",
      },
      429,
    );
  }

  if (email) {
    const emailAllowed = checkRateLimit(
      `magic-email:${email}`,
      MAX_MAGIC_LINK_REQUESTS_PER_EMAIL,
    );
    if (!emailAllowed) {
      return c.json(
        {
          error: "Too Many Requests",
          message:
            "Muitas solicitações para este e-mail. Aguarde 15 minutos e tente novamente.",
        },
        429,
      );
    }
  }

  await next();
}
