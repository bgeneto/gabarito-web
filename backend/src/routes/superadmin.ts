import { Hono } from "hono";

import {
  getAccessReport,
  getExamDetail,
  getExamsList,
  getOverview,
} from "../services/superadminStats.js";
import { exportExams, restoreExams } from "../services/superadminBackup.js";
import {
  getSuperadminSessionTtlMs,
  isSuperadminBackupEnabled,
  isSuperadminEnabled,
  superadminAuth,
} from "../middleware/superadminAuth.js";
import { internalServerError } from "../utils/errorResponse.js";

const superadmin = new Hono();

function isBackupPath(path: string): boolean {
  return path.endsWith("/backup/export") || path.endsWith("/backup/restore");
}

superadmin.use("*", async (c, next) => {
  if (c.req.method !== "GET") {
    if (!isSuperadminEnabled()) {
      return c.json({ error: "Não encontrado" }, 404);
    }
    if (!isBackupPath(c.req.path)) {
      return c.json(
        {
          error: "Método não permitido",
          message: "Área superadmin é somente leitura.",
        },
        405,
      );
    }
    if (!isSuperadminBackupEnabled()) {
      return c.json(
        {
          error: "Não encontrado",
          message: "Backup superadmin desabilitado.",
        },
        404,
      );
    }
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
  } catch (error: unknown) {
    return internalServerError(c, "Erro no overview superadmin:", error);
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
  } catch (error: unknown) {
    return internalServerError(c, "Erro na listagem superadmin:", error);
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
  } catch (error: unknown) {
    return internalServerError(c, "Erro no detalhe superadmin:", error);
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
  } catch (error: unknown) {
    return internalServerError(c, "Erro no relatório de acesso:", error);
  }
});

superadmin.post("/backup/export", async (c) => {
  try {
    const body = await c.req.json();
    const examIds = Array.isArray(body.exam_ids)
      ? body.exam_ids.map(String)
      : [];

    const { buffer, filename } = await exportExams(examIds);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro ao exportar backup.";
    if (
      message.includes("Informe") ||
      message.includes("Máximo") ||
      message.includes("Nenhuma prova")
    ) {
      return c.json({ error: "Requisição inválida", message }, 400);
    }
    return internalServerError(c, "Erro no backup superadmin:", error);
  }
});

superadmin.post("/backup/restore", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || typeof file === "string") {
      return c.json(
        {
          error: "Requisição inválida",
          message: "Envie um arquivo no campo 'file'.",
        },
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await restoreExams(buffer);
    return c.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro ao restaurar backup.";
    if (
      message.includes("inválido") ||
      message.includes("não reconhecido") ||
      message.includes("Versão")
    ) {
      return c.json({ error: "Requisição inválida", message }, 400);
    }
    return internalServerError(c, "Erro na restauração superadmin:", error);
  }
});

export default superadmin;
