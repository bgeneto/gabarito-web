import { Context, Next } from "hono";

import { getClientIp, getRateLimitInfo } from "./rateLimiter.js";

export const MAX_ADMIN_AUTH_FAILURES_PER_MINUTE = 10;
export const MAX_SUPERADMIN_AUTH_FAILURES_PER_MINUTE = 10;
export const MAX_SUPERADMIN_API_REQUESTS_PER_MINUTE = 60;

const AUTH_RATE_LIMIT_MESSAGE =
  "Muitas tentativas de acesso. Aguarde um minuto e tente novamente.";

const SUPERADMIN_RATE_LIMIT_MESSAGE =
  "Limite de requisições excedido. Aguarde um minuto.";

function setTooManyRequests(c: Context, message: string) {
  c.res = c.json(
    {
      error: "Too Many Requests",
      message,
    },
    429,
  );
  c.res.headers.set("Cache-Control", "no-store");
  c.res.headers.set("Pragma", "no-cache");
}

function preventAdminResponseCaching(c: Context) {
  c.res.headers.set("Cache-Control", "no-store");
  c.res.headers.set("Pragma", "no-cache");
}

export async function adminAuthRateLimiter(c: Context, next: Next) {
  const ip = getClientIp(c);
  const failKey = `admin-auth-fail:${ip}`;
  const failInfo = getRateLimitInfo(failKey);
  const lockedOut = failInfo.count >= MAX_ADMIN_AUTH_FAILURES_PER_MINUTE;

  if (lockedOut) {
    preventAdminResponseCaching(c);
    setTooManyRequests(c, AUTH_RATE_LIMIT_MESSAGE);
    return;
  }

  await next();

  preventAdminResponseCaching(c);

  if (c.res.status === 401) {
    failInfo.count++;
  }
}

export async function enforceSuperadminRateLimits(
  c: Context,
  next: Next,
): Promise<void> {
  const ip = getClientIp(c);
  const failKey = `superadmin-auth-fail:${ip}`;
  const useKey = `superadmin-api:${ip}`;
  const failLocked =
    getRateLimitInfo(failKey).count >= MAX_SUPERADMIN_AUTH_FAILURES_PER_MINUTE;
  const useLocked =
    getRateLimitInfo(useKey).count >= MAX_SUPERADMIN_API_REQUESTS_PER_MINUTE;

  if (useLocked) {
    setTooManyRequests(c, SUPERADMIN_RATE_LIMIT_MESSAGE);
    return;
  }

  await next();

  if (c.res.status === 401) {
    if (failLocked) {
      setTooManyRequests(c, AUTH_RATE_LIMIT_MESSAGE);
      return;
    }
    getRateLimitInfo(failKey).count++;
    return;
  }

  getRateLimitInfo(useKey).count++;
}
