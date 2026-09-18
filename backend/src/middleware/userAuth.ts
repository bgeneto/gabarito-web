import { Context, Next } from "hono";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, userSessions } from "../db/schema.js";
import { hashToken, USER_SESSION_TTL_MS } from "../utils/authTokens.js";

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

type SessionLookupResult =
  | {
      status: "ok";
      user: AuthenticatedUser;
      session: AuthenticatedSession;
    }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function resolveUserFromSessionToken(
  sessionToken: string,
): Promise<SessionLookupResult> {
  if (!sessionToken) return { status: "invalid" };
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
      return { status: "invalid" };
    }

    const row = results[0];
    const slidingExpiresAt = now + USER_SESSION_TTL_MS;

    // Renova a validade a cada uso (30 dias a partir da última atividade).
    db.update(userSessions)
      .set({ lastSeenAt: now, expiresAt: slidingExpiresAt })
      .where(eq(userSessions.id, row.sessionId))
      .run();

    return {
      status: "ok",
      user: {
        id: row.userId,
        email: row.userEmail,
        name: row.userName,
        createdAt: row.userCreatedAt,
      },
      session: {
        id: row.sessionId,
        userId: row.userId,
        expiresAt: slidingExpiresAt,
      },
    };
  } catch {
    return { status: "unavailable" };
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
  if (auth.status === "unavailable") {
    return c.json(
      {
        error: "Serviço indisponível",
        message:
          "Não foi possível validar a sessão no momento. Tente novamente em instantes.",
      },
      503,
    );
  }
  if (auth.status === "invalid") {
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
    if (auth.status === "ok") {
      c.set(AUTH_USER_KEY, auth.user);
      c.set(AUTH_SESSION_KEY, auth.session);
    }
  }
  await next();
}

export function getAuthenticatedUser(c: Context): AuthenticatedUser | null {
  return (c.get(AUTH_USER_KEY) as AuthenticatedUser) || null;
}
