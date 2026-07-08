import { serve } from "@hono/node-server";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";

import { db, pingDatabase } from "./db/index.js";
import {
  examItems,
  exams,
  submissionAnswers,
  submissions,
} from "./db/schema.js";
import {
  accessLogger,
  hashIp,
  startAccessLogRetentionJob,
  writeAccessLog,
} from "./middleware/accessLogger.js";
import {
  getClientIp,
  getSubmissionRequestBody,
  submissionRateLimiter,
} from "./middleware/rateLimiter.js";
import { adminAuthRateLimiter } from "./middleware/authRateLimiter.js";
import { telemetryRateLimiter } from "./middleware/telemetryRateLimiter.js";
import superadmin from "./routes/superadmin.js";
import { isSuperadminEnabled } from "./middleware/superadminAuth.js";
import {
  categorizePagePath,
  normalizePagePath,
} from "./utils/pathNormalizer.js";
import {
  generateAdminToken,
  generatePublicCode,
  generateSubmissionId,
} from "./utils/generator.js";
import { gradeItemAnswer } from "./utils/grading.js";
import { recalculateExamScores } from "./utils/recalculate.js";
import { validateItemFields } from "./utils/validateItem.js";

const app = new Hono();

// Configuração de CORS: aberto em desenvolvimento, restrito em produção
const corsOrigin =
  process.env.CORS_ORIGIN ||
  (process.env.NODE_ENV === "production"
    ? "https://gabarito.sistema.pro.br"
    : "*");
app.use("/api/*", cors({ origin: corsOrigin }));
app.use("/api/*", accessLogger);
app.use("/api/admin/*", adminAuthRateLimiter);

// Limites de tamanho de payload
app.use("/api/exams", bodyLimit({ maxSize: 1024 * 1024 })); // 1 MB para criação de prova
app.use(
  "/api/exams/:public_code/submissions",
  bodyLimit({ maxSize: 512 * 1024 }),
); // 512 KB para submissões
app.use(
  "/api/admin/exams/:admin_token/items/:item_id",
  bodyLimit({ maxSize: 64 * 1024 }),
);
app.use("/api/telemetry/pageview", bodyLimit({ maxSize: 4 * 1024 }));

// Telemetria de page views do SPA (público, rate limited)
app.post("/api/telemetry/pageview", telemetryRateLimiter, async (c) => {
  try {
    const body = await c.req.json();
    const rawPath = typeof body.path === "string" ? body.path : "/";
    const normalizedPath = normalizePagePath(rawPath.split("?")[0]);
    const ipHash = hashIp(getClientIp(c));
    const userAgent = c.req.header("user-agent");

    writeAccessLog({
      eventType: "page_view",
      path: normalizedPath,
      routeCategory: categorizePagePath(normalizedPath),
      ipHash,
      userAgent,
    });

    return c.json({ ok: true });
  } catch {
    return c.json({ ok: true });
  }
});

// Rotas superadmin (somente leitura)
app.route("/api/superadmin", superadmin);

// Constantes de validação
const MAX_TITLE_LENGTH = 200;
const MAX_STUDENT_NAME_LENGTH = 150;
const MAX_STUDENT_IDENTIFIER_LENGTH = 50;
const MAX_ITEMS_PER_EXAM = 500;

import { findExamByAdminToken, hashAdminToken } from "./utils/adminAuth.js";

// ROTA: Health check público (liveness + conectividade do banco)
app.get("/health", (c) => {
  try {
    pingDatabase();
    return c.json({ status: "ok", database: "ok" });
  } catch (error: any) {
    console.error("Health check falhou:", error);
    return c.json({ status: "degraded", database: "error" }, 503);
  }
});

// ROTA: Criar Prova (Professor)
app.post("/api/exams", async (c) => {
  try {
    const body = await c.req.json();
    const { title, items } = body;

    if (!title || !Array.isArray(items) || items.length === 0) {
      return c.json(
        {
          error: "Parâmetros inválidos",
          message: "O título e pelo menos uma questão são obrigatórios.",
        },
        400,
      );
    }

    if (typeof title !== "string" || title.trim().length === 0) {
      return c.json(
        { error: "Validação", message: "O título da prova é inválido." },
        400,
      );
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return c.json(
        {
          error: "Validação",
          message: `O título da prova deve ter no máximo ${MAX_TITLE_LENGTH} caracteres.`,
        },
        400,
      );
    }

    if (items.length > MAX_ITEMS_PER_EXAM) {
      return c.json(
        {
          error: "Validação",
          message: `A prova pode ter no máximo ${MAX_ITEMS_PER_EXAM} itens.`,
        },
        400,
      );
    }

    // Validação dos itens da prova
    const qCount: Record<number, number> = {};
    for (const item of items) {
      const qNum = Number(item.question_number);
      if (isNaN(qNum) || qNum <= 0) {
        return c.json(
          {
            error: "Validação de itens",
            message: "O número da questão deve ser um inteiro positivo.",
          },
          400,
        );
      }

      const validationError = validateItemFields({
        points: item.points,
        answer_type: item.answer_type,
        answer_config: item.answer_config || { accepted: [] },
      });
      if (validationError) {
        return c.json(
          {
            error: "Validação de itens",
            message: `Questão ${qNum}${item.sub_label ? item.sub_label : ""}: ${validationError}`,
          },
          400,
        );
      }

      qCount[qNum] = (qCount[qNum] || 0) + 1;
    }

    const seenKeys = new Set<string>();
    for (const item of items) {
      const qNum = Number(item.question_number);
      const sub = (item.sub_label || "").trim().toLowerCase();
      const key = `${qNum}-${sub}`;

      if (qCount[qNum] > 1 && !sub) {
        return c.json(
          {
            error: "Validação de itens",
            message: `A questão ${qNum} aparece mais de uma vez e precisa ter subitens preenchidos (ex: A, B, C).`,
          },
          400,
        );
      }

      if (seenKeys.has(key)) {
        return c.json(
          {
            error: "Validação de itens",
            message: sub
              ? `A questão ${qNum} com subitem "${sub.toUpperCase()}" está duplicada.`
              : `A questão ${qNum} está duplicada (sem subitem).`,
          },
          400,
        );
      }
      seenKeys.add(key);
    }

    // Gerar códigos aleatórios seguros com detecção de colisão
    let publicCode = "";
    let isUniquePublic = false;
    let attempts = 0;
    while (!isUniquePublic && attempts < 10) {
      const currentYear = new Date().getFullYear();
      publicCode = generatePublicCode(currentYear);

      const [existing] = await db
        .select()
        .from(exams)
        .where(eq(exams.publicCode, publicCode));
      if (!existing) {
        isUniquePublic = true;
      }
      attempts++;
    }
    if (!isUniquePublic) {
      return c.json(
        {
          error: "Erro de geração",
          message: "Não foi possível gerar um código de prova único.",
        },
        500,
      );
    }

    let adminToken = "";
    let adminCodeHash = "";
    let isUniqueAdmin = false;
    attempts = 0;
    while (!isUniqueAdmin && attempts < 10) {
      adminToken = generateAdminToken();
      adminCodeHash = hashAdminToken(adminToken);

      const [existing] = await db
        .select()
        .from(exams)
        .where(eq(exams.adminCodeHash, adminCodeHash));
      if (!existing) {
        isUniqueAdmin = true;
      }
      attempts++;
    }
    if (!isUniqueAdmin) {
      return c.json(
        {
          error: "Erro de geração",
          message: "Não foi possível gerar um token administrativo único.",
        },
        500,
      );
    }

    const examId = crypto.randomUUID();
    const now = Date.now();

    // Inserir prova no BD
    await db.insert(exams).values({
      id: examId,
      title,
      publicCode,
      adminCodeHash,
      status: "open",
      createdAt: now,
    });

    // Inserir questões da prova
    let position = 1;
    for (const item of items) {
      const { question_number, sub_label, points, answer_type, answer_config } =
        item;

      await db.insert(examItems).values({
        id: crypto.randomUUID(),
        examId,
        questionNumber: Number(question_number),
        subLabel: sub_label || null,
        points: Number(points),
        answerType: answer_type,
        answerConfigJson: JSON.stringify(answer_config || { accepted: [] }),
        position: position++,
      });
    }

    return c.json(
      {
        id: examId,
        public_code: publicCode,
        admin_token: adminToken,
        message: "Prova criada com sucesso!",
      },
      201,
    );
  } catch (error: any) {
    console.error("Erro ao criar prova:", error);
    return c.json(
      { error: "Erro interno do servidor", message: error.message },
      500,
    );
  }
});

// ROTA: Buscar Prova pelo Código Público (Aluno)
app.get("/api/exams/:public_code", async (c) => {
  try {
    const publicCode = c.req.param("public_code").toUpperCase();

    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.publicCode, publicCode));
    if (!exam) {
      return c.json(
        {
          error: "Não encontrado",
          message: "Prova não encontrada com o código informado.",
        },
        404,
      );
    }

    // Buscar questões sem o gabarito aceito (answer_config_json é ocultado)
    const itemsList = await db
      .select({
        id: examItems.id,
        questionNumber: examItems.questionNumber,
        subLabel: examItems.subLabel,
        points: examItems.points,
        answerType: examItems.answerType,
        position: examItems.position,
      })
      .from(examItems)
      .where(eq(examItems.examId, exam.id))
      .orderBy(examItems.position);

    return c.json({
      id: exam.id,
      title: exam.title,
      status: exam.status,
      items: itemsList,
    });
  } catch (error: any) {
    console.error("Erro ao buscar prova:", error);
    return c.json(
      { error: "Erro interno do servidor", message: error.message },
      500,
    );
  }
});

// ROTA: Enviar Respostas (Aluno) com Rate Limiting e Prevenção de Duplicidade
app.post(
  "/api/exams/:public_code/submissions",
  submissionRateLimiter,
  async (c) => {
    try {
      const publicCode = (c.req.param("public_code") || "").toUpperCase();
      const body = getSubmissionRequestBody(c) as {
        student_name?: unknown;
        student_identifier?: unknown;
        answers?: unknown;
      };
      const { student_name, student_identifier, answers } = body;

      if (
        !student_name ||
        !student_identifier ||
        !answers ||
        typeof answers !== "object"
      ) {
        return c.json(
          {
            error: "Parâmetros inválidos",
            message: "Nome, matrícula e respostas são obrigatórios.",
          },
          400,
        );
      }

      if (
        typeof student_name !== "string" ||
        typeof student_identifier !== "string"
      ) {
        return c.json(
          { error: "Validação", message: "Nome e matrícula devem ser textos." },
          400,
        );
      }

      if (student_name.length > MAX_STUDENT_NAME_LENGTH) {
        return c.json(
          {
            error: "Validação",
            message: `O nome do aluno deve ter no máximo ${MAX_STUDENT_NAME_LENGTH} caracteres.`,
          },
          400,
        );
      }

      if (student_identifier.length > MAX_STUDENT_IDENTIFIER_LENGTH) {
        return c.json(
          {
            error: "Validação",
            message: `A matrícula deve ter no máximo ${MAX_STUDENT_IDENTIFIER_LENGTH} caracteres.`,
          },
          400,
        );
      }

      const [exam] = await db
        .select()
        .from(exams)
        .where(eq(exams.publicCode, publicCode));
      if (!exam) {
        return c.json(
          { error: "Não encontrado", message: "Prova não encontrada." },
          404,
        );
      }

      if (exam.status !== "open") {
        return c.json(
          {
            error: "Bloqueado",
            message: "Esta prova já foi encerrada e não aceita mais envios.",
          },
          403,
        );
      }

      // Verificar duplicidade: mesma matrícula na mesma prova
      const cleanIdentifier = student_identifier.trim().toUpperCase();
      const [existingSub] = await db
        .select()
        .from(submissions)
        .where(
          and(
            eq(submissions.examId, exam.id),
            eq(submissions.studentIdentifier, cleanIdentifier),
          ),
        );

      if (existingSub) {
        return c.json(
          {
            error: "Conflito",
            message:
              "Você já enviou as respostas para esta prova. O reenvio está bloqueado.",
            submission_id: existingSub.id,
            already_submitted: true,
          },
          409,
        );
      }

      // Buscar questões para validar
      const itemsList = await db
        .select()
        .from(examItems)
        .where(eq(examItems.examId, exam.id));

      let totalScore = 0;
      let submissionId = "";
      let isUniqueSubmission = false;
      let attempts = 0;
      while (!isUniqueSubmission && attempts < 10) {
        submissionId = generateSubmissionId();

        const [existing] = await db
          .select()
          .from(submissions)
          .where(eq(submissions.id, submissionId));
        if (!existing) {
          isUniqueSubmission = true;
        }
        attempts++;
      }
      if (!isUniqueSubmission) {
        return c.json(
          {
            error: "Erro de geração",
            message:
              "Não foi possível gerar um comprovante de submissão único.",
          },
          500,
        );
      }
      const now = Date.now();

      // Preparar registros de respostas
      const answerRecords = [];

      for (const item of itemsList) {
        const rawAnswer =
          answers[item.id] !== undefined ? String(answers[item.id]) : "";

        const { isCorrect, normalizedAnswer, scoreAwarded } = gradeItemAnswer(
          item,
          rawAnswer,
        );
        totalScore += scoreAwarded;

        answerRecords.push({
          id: crypto.randomUUID(),
          submissionId,
          itemId: item.id,
          rawAnswer,
          normalizedAnswer,
          isCorrect: isCorrect ? 1 : 0,
          scoreAwarded,
        });
      }

      try {
        db.transaction((tx) => {
          tx.insert(submissions)
            .values({
              id: submissionId,
              examId: exam.id,
              studentName: student_name.trim(),
              studentIdentifier: cleanIdentifier,
              submittedAt: now,
              totalScore,
            })
            .run();

          for (const record of answerRecords) {
            tx.insert(submissionAnswers).values(record).run();
          }
        });
      } catch (insertError: any) {
        const message = String(insertError?.message ?? "");
        if (message.includes("UNIQUE constraint failed")) {
          const [conflictSub] = await db
            .select()
            .from(submissions)
            .where(
              and(
                eq(submissions.examId, exam.id),
                eq(submissions.studentIdentifier, cleanIdentifier),
              ),
            );

          if (conflictSub) {
            return c.json(
              {
                error: "Conflito",
                message:
                  "Você já enviou as respostas para esta prova. O reenvio está bloqueado.",
                submission_id: conflictSub.id,
                already_submitted: true,
              },
              409,
            );
          }
        }

        throw insertError;
      }

      return c.json(
        {
          submission_id: submissionId,
          message:
            "Respostas registradas com sucesso. A nota será disponibilizada quando o professor encerrar a prova.",
        },
        201,
      );
    } catch (error: any) {
      console.error("Erro ao salvar submissão:", error);
      return c.json(
        { error: "Erro interno do servidor", message: error.message },
        500,
      );
    }
  },
);

// ROTA: Consultar Submissão Individual (Aluno) - Protege nota se aberta
app.get("/api/submissions/:submission_id", async (c) => {
  try {
    const submissionId = c.req.param("submission_id");

    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId));
    if (!sub) {
      return c.json(
        {
          error: "Não encontrado",
          message: "Submissão de prova não encontrada.",
        },
        404,
      );
    }

    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, sub.examId));

    // Se a prova ainda está aberta, oculta as notas detalhadas
    if (exam.status === "open") {
      return c.json({
        id: sub.id,
        student_name: sub.studentName,
        student_identifier: sub.studentIdentifier,
        submitted_at: sub.submittedAt,
        exam_title: exam.title,
        status: "open",
        total_score: null,
        message:
          "A nota e o gabarito estarão disponíveis assim que a prova for encerrada pelo professor.",
      });
    }

    // Se encerrada, retorna notas detalhadas e questões respondidas
    const answersList = await db
      .select({
        questionNumber: examItems.questionNumber,
        subLabel: examItems.subLabel,
        points: examItems.points,
        rawAnswer: submissionAnswers.rawAnswer,
        isCorrect: submissionAnswers.isCorrect,
        scoreAwarded: submissionAnswers.scoreAwarded,
        answerType: examItems.answerType,
        answerConfigJson: examItems.answerConfigJson,
      })
      .from(submissionAnswers)
      .innerJoin(examItems, eq(submissionAnswers.itemId, examItems.id))
      .where(eq(submissionAnswers.submissionId, sub.id))
      .orderBy(examItems.position);

    const formattedAnswers = answersList.map((a) => {
      let accepted: string[] = [];
      try {
        const parsed = JSON.parse(a.answerConfigJson);
        accepted = parsed.accepted || [];
      } catch (e) {}

      return {
        questionNumber: a.questionNumber,
        subLabel: a.subLabel,
        points: a.points,
        rawAnswer: a.rawAnswer,
        isCorrect: a.isCorrect === 1,
        scoreAwarded: a.scoreAwarded,
        answerType: a.answerType,
        acceptedAnswers: accepted,
      };
    });

    return c.json({
      id: sub.id,
      student_name: sub.studentName,
      student_identifier: sub.studentIdentifier,
      submitted_at: sub.submittedAt,
      exam_title: exam.title,
      status: "closed",
      total_score: sub.totalScore,
      answers: formattedAnswers,
    });
  } catch (error: any) {
    console.error("Erro ao consultar submissão:", error);
    return c.json(
      { error: "Erro interno do servidor", message: error.message },
      500,
    );
  }
});

// ROTA: Consultar Painel da Prova (Professor) - Requer Token Admin
app.get("/api/admin/exams/:admin_token", async (c) => {
  try {
    const adminToken = c.req.param("admin_token");
    const exam = await findExamByAdminToken(adminToken);
    if (!exam) {
      return c.json(
        { error: "Não autorizado", message: "Token administrativo inválido." },
        401,
      );
    }

    // Buscar questões com o gabarito original (liberado para o professor)
    const itemsList = await db
      .select()
      .from(examItems)
      .where(eq(examItems.examId, exam.id))
      .orderBy(examItems.position);

    const formattedItems = itemsList.map((item) => ({
      id: item.id,
      question_number: item.questionNumber,
      sub_label: item.subLabel,
      points: item.points,
      answer_type: item.answerType,
      answer_config: JSON.parse(item.answerConfigJson),
    }));

    // Buscar todas as submissões dos alunos
    const subsList = await db
      .select()
      .from(submissions)
      .where(eq(submissions.examId, exam.id))
      .orderBy(submissions.submittedAt);

    const formattedSubs = subsList.map((s) => ({
      id: s.id,
      student_name: s.studentName,
      student_identifier: s.studentIdentifier,
      submitted_at: s.submittedAt,
      total_score: s.totalScore,
    }));

    return c.json({
      id: exam.id,
      title: exam.title,
      public_code: exam.publicCode,
      status: exam.status,
      created_at: exam.createdAt,
      closed_at: exam.closedAt,
      items: formattedItems,
      submissions: formattedSubs,
    });
  } catch (error: any) {
    console.error("Erro no painel administrativo:", error);
    return c.json(
      { error: "Erro interno do servidor", message: error.message },
      500,
    );
  }
});

// ROTA: Editar Item do Gabarito (Professor) - Requer Token Admin
app.patch("/api/admin/exams/:admin_token/items/:item_id", async (c) => {
  try {
    const adminToken = c.req.param("admin_token");
    const itemId = c.req.param("item_id");
    const exam = await findExamByAdminToken(adminToken);
    if (!exam) {
      return c.json(
        { error: "Não autorizado", message: "Token administrativo inválido." },
        401,
      );
    }

    const [existingItem] = await db
      .select()
      .from(examItems)
      .where(eq(examItems.id, itemId));
    if (!existingItem || existingItem.examId !== exam.id) {
      return c.json(
        { error: "Não encontrado", message: "Item da prova não encontrado." },
        404,
      );
    }

    const body = await c.req.json();
    const { answer_config, points, answer_type } = body;

    if (
      !answer_config ||
      typeof answer_config !== "object" ||
      points === undefined ||
      !answer_type
    ) {
      return c.json(
        {
          error: "Parâmetros inválidos",
          message:
            "Os campos answer_config, points e answer_type são obrigatórios.",
        },
        400,
      );
    }

    const validationError = validateItemFields({
      points,
      answer_type,
      answer_config,
    });
    if (validationError) {
      return c.json({ error: "Validação", message: validationError }, 400);
    }

    const newAnswerConfigJson = JSON.stringify(answer_config);
    const newPoints = Number(points);
    const newAnswerType = answer_type as "choice" | "true_false" | "text_exact";

    const hasChanges =
      existingItem.answerConfigJson !== newAnswerConfigJson ||
      existingItem.points !== newPoints ||
      existingItem.answerType !== newAnswerType;

    if (!hasChanges) {
      return c.json({
        item: {
          id: existingItem.id,
          question_number: existingItem.questionNumber,
          sub_label: existingItem.subLabel,
          points: existingItem.points,
          answer_type: existingItem.answerType,
          answer_config: JSON.parse(existingItem.answerConfigJson),
        },
        recalculation: { submissions_updated: 0, answers_updated: 0 },
        message: "Nenhuma alteração detectada.",
      });
    }

    const recalculation = db.transaction((tx) => {
      tx.update(examItems)
        .set({
          points: newPoints,
          answerType: newAnswerType,
          answerConfigJson: newAnswerConfigJson,
        })
        .where(eq(examItems.id, itemId))
        .run();

      return recalculateExamScores(exam.id, tx);
    });

    return c.json({
      item: {
        id: existingItem.id,
        question_number: existingItem.questionNumber,
        sub_label: existingItem.subLabel,
        points: newPoints,
        answer_type: newAnswerType,
        answer_config,
      },
      recalculation: {
        submissions_updated: recalculation.submissionsUpdated,
        answers_updated: recalculation.answersUpdated,
      },
      message: "Gabarito atualizado e notas recalculadas.",
    });
  } catch (error: any) {
    console.error("Erro ao editar item do gabarito:", error);
    return c.json(
      { error: "Erro interno do servidor", message: error.message },
      500,
    );
  }
});

// ROTA: Encerrar Prova (Professor) - Requer Token Admin
app.post("/api/admin/exams/:admin_token/close", async (c) => {
  try {
    const adminToken = c.req.param("admin_token");
    const exam = await findExamByAdminToken(adminToken);
    if (!exam) {
      return c.json(
        { error: "Não autorizado", message: "Token administrativo inválido." },
        401,
      );
    }

    if (exam.status === "closed") {
      return c.json({
        message: "A prova já estava encerrada.",
        status: "closed",
        closed_at: exam.closedAt,
      });
    }

    const now = Date.now();

    await db
      .update(exams)
      .set({ status: "closed", closedAt: now })
      .where(eq(exams.id, exam.id));

    return c.json({
      status: "closed",
      closed_at: now,
      message: "Prova encerrada com sucesso. Notas liberadas para os alunos.",
    });
  } catch (error: any) {
    console.error("Erro ao encerrar prova:", error);
    return c.json(
      { error: "Erro interno do servidor", message: error.message },
      500,
    );
  }
});

// Inicialização do servidor Node.js
startAccessLogRetentionJob();

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(
      `[Servidor Hono] Rodando localmente em http://localhost:${info.port}`,
    );
    console.log(
      `[Servidor Hono] Superadmin: ${isSuperadminEnabled() ? "habilitado" : "desabilitado (SUPERADMIN_TOKEN ausente)"}`,
    );
  },
);
