import crypto from "crypto";

interface AdminSession {
  examId: string;
  expiresAt: number;
}

const sessions = new Map<string, AdminSession>();

export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function createAdminSession(examId: string): {
  sessionToken: string;
  expiresAt: number;
} {
  const sessionToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  sessions.set(sessionToken, { examId, expiresAt });
  return { sessionToken, expiresAt };
}

export function resolveAdminSession(sessionToken: string): string | null {
  const session = sessions.get(sessionToken);
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionToken);
    return null;
  }

  return session.examId;
}

export function resetAdminSessionsForTests(): void {
  sessions.clear();
}
