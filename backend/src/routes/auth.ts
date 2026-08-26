import crypto from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { db } from "../db/index.js";
import { magicLinks, users, userSessions } from "../db/schema.js";
import { getClientIp } from "../middleware/rateLimiter.js";
import { hashIp } from "../middleware/accessLogger.js";
import { magicLinkRateLimiter } from "../middleware/magicLinkRateLimiter.js";
import {
  getAuthenticatedUser,
  requireUserAuth,
} from "../middleware/userAuth.js";
import {
  generateMagicLinkToken,
  generateUserSessionToken,
  hashToken,
  isValidEmail,
  normalizeEmail,
} from "../utils/authTokens.js";
import { sendMagicLinkEmail } from "../services/mailer.js";
import { countUserActivity } from "../services/userActivity.js";
import { internalServerError } from "../utils/errorResponse.js";
import {
  resolvePostLoginDestination,
  sanitizePostLoginPath,
} from "../utils/postLoginRedirect.js";

const authRouter = new Hono();

authRouter.use("*", bodyLimit({ maxSize: 16 * 1024 }));

// ROTA: Solicitar envio de Magic Link por e-mail
authRouter.post("/magic-link/request", magicLinkRateLimiter, async (c) => {
  try {
    const body = (c.get("parsedAuthBody" as any) ||
      (await c.req.json().catch(() => ({})))) as Record<string, unknown>;
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const targetRoute = sanitizePostLoginPath(body.target_route) || "";

    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) {
      return c.json(
        {
          error: "Validação",
          message: "Por favor, informe um endereço de e-mail válido.",
        },
        400,
      );
    }

    const tokenData = generateMagicLinkToken();
    const ip = getClientIp(c);
    const ipHash = hashIp(ip);
    const now = Date.now();

    await db.insert(magicLinks).values({
      id: crypto.randomUUID(),
      email,
      tokenHash: tokenData.tokenHash,
      expiresAt: tokenData.expiresAt,
      usedAt: null,
      ipHash,
      targetRoute: targetRoute || null,
      createdAt: now,
    });

    await sendMagicLinkEmail({
      toEmail: email,
      rawToken: tokenData.rawToken,
      targetRoute: targetRoute || undefined,
    });

    return c.json({
      ok: true,
      message: "Link de acesso enviado com sucesso para seu e-mail.",
      ...(process.env.NODE_ENV !== "production"
        ? { dev_token: tokenData.rawToken }
        : {}),
    });
  } catch (error: unknown) {
    return internalServerError(c, "Erro ao solicitar link de acesso:", error);
  }
});

// ROTA: Validar token do Magic Link e criar sessão de usuário
authRouter.post("/magic-link/verify", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const rawToken = typeof body.token === "string" ? body.token.trim() : "";

    if (!rawToken) {
      return c.json(
        {
          error: "Parâmetros inválidos",
          message: "Token de acesso não informado.",
        },
        400,
      );
    }

    const tokenHash = hashToken(rawToken);
    const now = Date.now();

    const [link] = await db
      .select()
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.tokenHash, tokenHash),
          gt(magicLinks.expiresAt, now),
          isNull(magicLinks.usedAt),
        ),
      );

    if (!link) {
      return c.json(
        {
          error: "Link inválido ou expirado",
          message:
            "Este link de acesso é inválido, expirou ou já foi utilizado. Por favor, solicite um novo link.",
        },
        400,
      );
    }

    // Marca link como utilizado
    await db
      .update(magicLinks)
      .set({ usedAt: now })
      .where(eq(magicLinks.id, link.id));

    // Busca ou cria o usuário
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, link.email));

    if (!user) {
      const newUserId = crypto.randomUUID();
      await db.insert(users).values({
        id: newUserId,
        email: link.email,
        name: null,
        createdAt: now,
        lastLoginAt: now,
      });
      const [created] = await db
        .select()
        .from(users)
        .where(eq(users.id, newUserId));
      user = created;
    } else {
      await db
        .update(users)
        .set({ lastLoginAt: now })
        .where(eq(users.id, user.id));
    }

    // Cria nova sessão de usuário persistente
    const sessionData = generateUserSessionToken();
    const sessionId = crypto.randomUUID();
    const ip = getClientIp(c);
    const ipHash = hashIp(ip);
    const userAgent = c.req.header("user-agent") || null;

    await db.insert(userSessions).values({
      id: sessionId,
      userId: user.id,
      sessionTokenHash: sessionData.tokenHash,
      expiresAt: sessionData.expiresAt,
      createdAt: now,
      lastSeenAt: now,
      userAgent,
      ipHash,
    });

    return c.json({
      ok: true,
      session_token: sessionData.rawToken,
      expires_at: sessionData.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      redirect_to: resolvePostLoginDestination({
        targetRoute: link.targetRoute,
        ...(await countUserActivity(user.id, user.email)),
      }),
    });
  } catch (error: unknown) {
    return internalServerError(c, "Erro ao validar link de acesso:", error);
  }
});

// ROTA: Obter perfil do usuário autenticado
authRouter.get("/me", requireUserAuth, async (c) => {
  const user = getAuthenticatedUser(c);
  return c.json({ user });
});

// ROTA: Encerrar sessão (Logout)
authRouter.post("/logout", requireUserAuth, async (c) => {
  try {
    const session = c.get("currentSession" as any) as
      { id: string } | undefined;
    if (session?.id) {
      await db.delete(userSessions).where(eq(userSessions.id, session.id));
    }
    return c.json({ ok: true, message: "Sessão encerrada com sucesso." });
  } catch (error: unknown) {
    return internalServerError(c, "Erro ao encerrar sessão:", error);
  }
});

export default authRouter;
