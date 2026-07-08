import { Context, Next } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";

import { normalizeStudentIdentifier } from "../utils/normalizer.js";

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitInfo>();

const WINDOW_MS = 60 * 1000; // 1 minuto
export const MAX_SUBMISSION_ATTEMPTS_PER_STUDENT = 5;
export const MAX_SUBMISSION_ATTEMPTS_PER_EXAM_IP = 60;
export const SUBMISSION_BODY_KEY = "submissionBody";

function shouldTrustProxyHeaders(c: Context): boolean {
  if (process.env.TRUST_PROXY_HEADERS === "true") {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  try {
    const remote = getConnInfo(c).remote.address;
    if (!remote) {
      return false;
    }

    return (
      remote === "127.0.0.1" ||
      remote === "::1" ||
      remote === "::ffff:127.0.0.1" ||
      remote.startsWith("10.") ||
      remote.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(remote)
    );
  } catch {
    return false;
  }
}

export function getClientIp(c: Context): string {
  if (shouldTrustProxyHeaders(c)) {
    const xForwardedFor = c.req.header("x-forwarded-for");
    if (xForwardedFor) {
      return xForwardedFor.split(",")[0].trim();
    }
    const realIp = c.req.header("x-real-ip");
    if (realIp) {
      return realIp;
    }
  }

  try {
    const remote = getConnInfo(c).remote.address;
    if (remote) {
      return remote;
    }
  } catch {
    // Test harnesses may not provide connection metadata.
  }

  return "unknown";
}

export function resetRateLimitStateForTests(): void {
  rateLimitMap.clear();
}

export function getRateLimitInfo(key: string, now = Date.now()): RateLimitInfo {
  let info = rateLimitMap.get(key);

  if (!info || now > info.resetTime) {
    info = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
    rateLimitMap.set(key, info);
  }

  return info;
}

export function acquireRateLimitSlot(
  key: string,
  maxRequests: number,
): boolean {
  const info = getRateLimitInfo(key);

  if (info.count >= maxRequests) {
    return false;
  }

  info.count++;
  return true;
}

function tryAcquireRateLimitSlot(key: string, maxRequests: number): boolean {
  return acquireRateLimitSlot(key, maxRequests);
}

export function refundRateLimitSlot(key: string): void {
  const info = rateLimitMap.get(key);
  if (!info) return;
  info.count = Math.max(0, info.count - 1);
}

function extractStudentIdentifier(body: unknown): string {
  if (typeof body !== "object" || body === null) {
    return "";
  }

  const studentIdentifier = (body as Record<string, unknown>)
    .student_identifier;
  if (typeof studentIdentifier !== "string") {
    return "";
  }

  return normalizeStudentIdentifier(studentIdentifier);
}

export function getSubmissionRequestBody(c: Context): unknown {
  return c.get(SUBMISSION_BODY_KEY);
}

export async function submissionRateLimiter(c: Context, next: Next) {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "Requisição inválida",
        message: "Corpo da requisição deve ser um JSON válido.",
      },
      400,
    );
  }

  c.set(SUBMISSION_BODY_KEY, body);

  const publicCode = (c.req.param("public_code") || "").toUpperCase();
  const ip = getClientIp(c);
  const studentIdentifier = extractStudentIdentifier(body);

  const trackedKeys: { key: string; max: number }[] = [
    {
      key: `exam:${ip}:${publicCode}`,
      max: MAX_SUBMISSION_ATTEMPTS_PER_EXAM_IP,
    },
  ];

  if (studentIdentifier) {
    trackedKeys.push({
      key: `student:${ip}:${publicCode}:${studentIdentifier}`,
      max: MAX_SUBMISSION_ATTEMPTS_PER_STUDENT,
    });
  }

  for (const { key, max } of trackedKeys) {
    if (!tryAcquireRateLimitSlot(key, max)) {
      return c.json(
        {
          error: "Too Many Requests",
          message:
            "Você excedeu o limite de submissões. Por favor, aguarde um minuto e tente novamente.",
        },
        429,
      );
    }
  }

  await next();

  if (c.res.status === 409) {
    for (const { key } of trackedKeys) {
      refundRateLimitSlot(key);
    }
  }
}
