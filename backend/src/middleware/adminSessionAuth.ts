import { Context, Next } from "hono";

import { resolveAdminSession } from "../utils/adminSessions.js";

export const ADMIN_EXAM_ID_KEY = "adminExamId";

function extractBearerToken(c: Context): string | null {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

export async function requireAdminSession(c: Context, next: Next) {
  const sessionToken = extractBearerToken(c);
  if (!sessionToken) {
    return c.json(
      {
        error: "Não autorizado",
        message: "Sessão administrativa inválida ou expirada.",
      },
      401,
    );
  }

  const examId = resolveAdminSession(sessionToken);
  if (!examId) {
    return c.json(
      {
        error: "Não autorizado",
        message: "Sessão administrativa inválida ou expirada.",
      },
      401,
    );
  }

  c.set(ADMIN_EXAM_ID_KEY, examId);
  await next();
}
