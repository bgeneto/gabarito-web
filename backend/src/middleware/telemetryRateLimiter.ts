import { Context, Next } from "hono";

import { getClientIp } from "./rateLimiter.js";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function telemetryRateLimiter(c: Context, next: Next) {
  const ip = getClientIp(c);
  const now = Date.now();

  let info = rateLimitMap.get(ip);

  if (!info || now > info.resetTime) {
    info = { count: 1, resetTime: now + WINDOW_MS };
    rateLimitMap.set(ip, info);
  } else {
    info.count++;
  }

  if (info.count > MAX_REQUESTS) {
    return c.json({ error: "Too Many Requests" }, 429);
  }

  await next();
}
