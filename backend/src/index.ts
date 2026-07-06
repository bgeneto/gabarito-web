import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

import { db } from "./db/index.js";
import {
  exams,
  examItems,
  submissions,
  submissionAnswers,
} from "./db/schema.js";
import { checkAnswer } from "./utils/normalizer.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import {
  generatePublicCode,
  generateAdminToken,
  generateSubmissionId,
} from "./utils/generator.js";

const app = new Hono();

// Habilita CORS para facilitar desenvolvimento
app.use("/api/*", cors());

// Função utilitária para gerar hash SHA-256 do token administrativo
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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
      adminCodeHash = hashToken(adminToken);

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
app.post("/api/exams/:public_code/submissions", rateLimiter, async (c) => {
  try {
    const publicCode = (c.req.param("public_code") || "").toUpperCase();
    const body = await c.req.json();
    const { student_name, student_identifier, answers } = body; // answers: { [itemId]: raw_answer }

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
          message: "Não foi possível gerar um comprovante de submissão único.",
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

      const { isCorrect, normalizedAnswer } = checkAnswer(
        rawAnswer,
        item.answerType,
        item.answerConfigJson,
      );

      const scoreAwarded = isCorrect ? item.points : 0.0;
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

    // Inserir submissão principal
    await db.insert(submissions).values({
      id: submissionId,
      examId: exam.id,
      studentName: student_name.trim(),
      studentIdentifier: cleanIdentifier,
      submittedAt: now,
      totalScore,
    });

    // Inserir todas as respostas
    for (const record of answerRecords) {
      await db.insert(submissionAnswers).values(record);
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
});

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
      })
      .from(submissionAnswers)
      .innerJoin(examItems, eq(submissionAnswers.itemId, examItems.id))
      .where(eq(submissionAnswers.submissionId, sub.id))
      .orderBy(examItems.position);

    const formattedAnswers = answersList.map((a) => ({
      ...a,
      isCorrect: a.isCorrect === 1,
    }));

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
    const adminCodeHash = hashToken(adminToken);

    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.adminCodeHash, adminCodeHash));
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

// ROTA: Encerrar Prova (Professor) - Requer Token Admin
app.post("/api/admin/exams/:admin_token/close", async (c) => {
  try {
    const adminToken = c.req.param("admin_token");
    const adminCodeHash = hashToken(adminToken);

    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.adminCodeHash, adminCodeHash));
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
serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(
      `[Servidor Hono] Rodando localmente em http://localhost:${info.port}`,
    );
  },
);
