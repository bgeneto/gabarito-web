import { Context, Next } from "hono";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, userSessions } from "../db/schema.js";
import { hashToken } from "../utils/authTokens.js";

export const AUTH_USER_KEY = "currentUser";
export const AUTH_SESSION_KEY = "currentSession";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: number;
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  expiresAt: number;
}

function extractBearerToken(c: Context): string | null {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token) return token;
  }
  return null;
}

export async function resolveUserFromSessionToken(
  sessionToken: string,
): Promise<{
  user: AuthenticatedUser;
  session: AuthenticatedSession;
} | null> {
  if (!sessionToken) return null;
  const tokenHash = hashToken(sessionToken);
  const now = Date.now();

  try {
    const results = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        userName: users.name,
        userCreatedAt: users.createdAt,
        sessionId: userSessions.id,
        sessionExpiresAt: userSessions.expiresAt,
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(userSessions.sessionTokenHash, tokenHash),
          gt(userSessions.expiresAt, now),
        ),
      );

    if (!results || results.length === 0) {
      return null;
    }

    const row = results[0];

    // Atualiza lastSeenAt em background (silencioso)
    db.update(userSessions)
      .set({ lastSeenAt: now })
      .where(eq(userSessions.id, row.sessionId))
      .run();

    return {
      user: {
        id: row.userId,
        email: row.userEmail,
        name: row.userName,
        createdAt: row.userCreatedAt,
      },
      session: {
        id: row.sessionId,
        userId: row.userId,
        expiresAt: row.sessionExpiresAt,
      },
    };
  } catch {
    return null;
  }
}

export async function requireUserAuth(c: Context, next: Next) {
  const token = extractBearerToken(c);
  if (!token) {
    return c.json(
      {
        error: "Não autorizado",
        message: "É necessário fazer login para acessar este recurso.",
      },
      401,
    );
  }

  const auth = await resolveUserFromSessionToken(token);
  if (!auth) {
    return c.json(
      {
        error: "Não autorizado",
        message:
          "Sessão de usuário inválida ou expirada. Por favor, faça login novamente.",
      },
      401,
    );
  }

  c.set(AUTH_USER_KEY, auth.user);
  c.set(AUTH_SESSION_KEY, auth.session);
  await next();
}

export async function optionalUserAuth(c: Context, next: Next) {
  const token = extractBearerToken(c);
  if (token) {
    const auth = await resolveUserFromSessionToken(token);
    if (auth) {
      c.set(AUTH_USER_KEY, auth.user);
      c.set(AUTH_SESSION_KEY, auth.session);
    }
  }
  await next();
}

export function getAuthenticatedUser(c: Context): AuthenticatedUser | null {
  return (c.get(AUTH_USER_KEY) as AuthenticatedUser) || null;
}
