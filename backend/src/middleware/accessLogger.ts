import crypto from "crypto";
import { eq, lt } from "drizzle-orm";
import { Context, Next } from "hono";

import { db } from "../db/index.js";
import { accessLogs, exams } from "../db/schema.js";
import {
  categorizeApiPath,
  normalizeApiPath,
} from "../utils/pathNormalizer.js";
import { getClientIp } from "./rateLimiter.js";

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

async function resolveExamIdFromPublicCode(
  publicCode: string,
): Promise<string | null> {
  try {
    const [exam] = await db
      .select({ id: exams.id })
      .from(exams)
      .where(eq(exams.publicCode, publicCode.toUpperCase()));
    return exam?.id ?? null;
  } catch {
    return null;
  }
}

function extractPublicCodeFromPath(path: string): string | null {
  const match = path.match(/\/api\/exams\/([^/]+)/);
  if (!match) return null;
  const segment = match[1];
  if (segment === ":code" || segment === "submissions") return null;
  return segment;
}

export function writeAccessLog(entry: {
  eventType: "api_request" | "page_view";
  method?: string;
  path: string;
  routeCategory: string;
  statusCode?: number;
  ipHash: string;
  userAgent?: string;
  examId?: string | null;
  responseTimeMs?: number;
}) {
  setImmediate(() => {
    try {
      db.insert(accessLogs)
        .values({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          eventType: entry.eventType,
          method: entry.method ?? null,
          path: entry.path,
          routeCategory: entry.routeCategory,
          statusCode: entry.statusCode ?? null,
          ipHash: entry.ipHash,
          userAgent: entry.userAgent?.slice(0, 200) ?? null,
          examId: entry.examId ?? null,
          responseTimeMs: entry.responseTimeMs ?? null,
        })
        .run();
    } catch (err: any) {
      if (err?.code === "SQLITE_ERROR" && String(err.message).includes("no such table")) {
        return;
      }
      console.error("Erro ao gravar access_log:", err);
    }
  });
}

export async function accessLogger(c: Context, next: Next) {
  const rawPath = c.req.path;
  if (rawPath.startsWith("/api/telemetry/")) {
    await next();
    return;
  }

  const start = Date.now();
  await next();
  const elapsed = Date.now() - start;

  const normalizedPath = normalizeApiPath(rawPath);
  const method = c.req.method;
  const ipHash = hashIp(getClientIp(c));
  const userAgent = c.req.header("user-agent");

  let examId: string | null = null;
  const publicCode = extractPublicCodeFromPath(rawPath);
  if (publicCode) {
    examId = await resolveExamIdFromPublicCode(publicCode);
  }

  writeAccessLog({
    eventType: "api_request",
    method,
    path: normalizedPath,
    routeCategory: categorizeApiPath(normalizedPath, method),
    statusCode: c.res.status,
    ipHash,
    userAgent,
    examId,
    responseTimeMs: elapsed,
  });
}

const RETENTION_DAYS = Number(process.env.ACCESS_LOG_RETENTION_DAYS) || 90;

export function purgeOldAccessLogs() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  try {
    db.delete(accessLogs).where(lt(accessLogs.timestamp, cutoff)).run();
  } catch (err: any) {
    if (err?.code === "SQLITE_ERROR" && String(err.message).includes("no such table")) {
      return;
    }
    console.error("Erro ao purgar access_logs:", err);
  }
}

export function startAccessLogRetentionJob() {
  purgeOldAccessLogs();
  setInterval(purgeOldAccessLogs, 24 * 60 * 60 * 1000);
}
