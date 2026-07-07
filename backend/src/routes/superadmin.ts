import { Hono } from "hono";

import {
  getAccessReport,
  getExamDetail,
  getExamsList,
  getOverview,
} from "../services/superadminStats.js";
import {
  getSuperadminSessionTtlMs,
  isSuperadminEnabled,
  superadminAuth,
} from "../middleware/superadminAuth.js";

const superadmin = new Hono();

superadmin.use("*", async (c, next) => {
  if (c.req.method !== "GET") {
    if (!isSuperadminEnabled()) {
      return c.json({ error: "Não encontrado" }, 404);
    }
    return c.json(
      {
        error: "Método não permitido",
        message: "Área superadmin é somente leitura.",
      },
      405,
    );
  }
  await next();
});

superadmin.use("*", superadminAuth);

superadmin.get("/session", (c) => {
  const ttlMs = getSuperadminSessionTtlMs();
  const now = Date.now();
  return c.json({
    ok: true,
    session_ttl_seconds: ttlMs === 0 ? null : Math.floor(ttlMs / 1000),
    expires_at: ttlMs === 0 ? null : now + ttlMs,
  });
});

superadmin.get("/overview", async (c) => {
  try {
    const data = await getOverview();
    return c.json(data);
  } catch (error: any) {
    console.error("Erro no overview superadmin:", error);
    return c.json(
      { error: "Erro interno do servidor", message: error.message },
      500,
    );
  }
});

superadmin.get("/exams", async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(c.req.query("limit")) || 25),
    );
    const status = (c.req.query("status") || "all") as
      "all" | "open" | "closed";
    const sort = (c.req.query("sort") || "created_at") as
      "created_at" | "submissions" | "title" | "last_activity";
    const order = (c.req.query("order") || "desc") as "asc" | "desc";
    const q = c.req.query("q") || undefined;

    const data = await getExamsList({
      page,
      limit,
      status: ["all", "open", "closed"].includes(status) ? status : "all",
      sort: ["created_at", "submissions", "title", "last_activity"].includes(
        sort,
      )
        ? sort
        : "created_at",
      order: order === "asc" ? "asc" : "desc",
      q,
    });
    return c.json(data);
  } catch (error: any) {
    console.error("Erro na listagem superadmin:", error);
    return c.json(
      { error: "Erro interno do servidor", message: error.message },
      500,
    );
  }
});

superadmin.get("/exams/:examId", async (c) => {
  try {
    const examId = c.req.param("examId");
    const data = await getExamDetail(examId);
    if (!data) {
      return c.json(
        { error: "Não encontrado", message: "Prova não encontrada." },
        404,
      );
    }
    return c.json(data);
  } catch (error: any) {
    console.error("Erro no detalhe superadmin:", error);
    return c.json(
      { error: "Erro interno do servidor", message: error.message },
      500,
    );
  }
});

superadmin.get("/access", async (c) => {
  try {
    const from = c.req.query("from") ? Number(c.req.query("from")) : undefined;
    const to = c.req.query("to") ? Number(c.req.query("to")) : undefined;
    const eventType = c.req.query("event_type") as
      "api_request" | "page_view" | undefined;

    const data = await getAccessReport({
      from,
      to,
      eventType:
        eventType === "api_request" || eventType === "page_view"
          ? eventType
          : undefined,
    });
    return c.json(data);
  } catch (error: any) {
    console.error("Erro no relatório de acesso:", error);
    return c.json(
      { error: "Erro interno do servidor", message: error.message },
      500,
    );
  }
});

export default superadmin;
