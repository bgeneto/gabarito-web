import { desc, eq, or, sum } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { db } from "../db/index.js";
import { examItems, exams, submissions } from "../db/schema.js";
import {
  getAuthenticatedUser,
  requireUserAuth,
} from "../middleware/userAuth.js";
import {
  findExamByAdminToken,
  normalizeAdminToken,
} from "../utils/adminAuth.js";
import { getExamAggregates } from "../services/examStats.js";
import { internalServerError } from "../utils/errorResponse.js";

const userRouter = new Hono();

userRouter.use("*", bodyLimit({ maxSize: 16 * 1024 }));
userRouter.use("*", requireUserAuth);

// ROTA: Listar todas as provas criadas ou vinculadas ao professor
userRouter.get("/exams", async (c) => {
  try {
    const user = getAuthenticatedUser(c)!;

    const userExams = await db
      .select()
      .from(exams)
      .where(eq(exams.creatorUserId, user.id))
      .orderBy(desc(exams.createdAt));

    const enrichedExams = await Promise.all(
      userExams.map(async (exam) => {
        const agg = await getExamAggregates(exam.id, { includeAccess: false });
        return {
          id: exam.id,
          title: exam.title,
          public_code: exam.publicCode,
          admin_token: exam.adminToken,
          status: exam.status,
          created_at: exam.createdAt,
          closed_at: exam.closedAt,
          submission_count: agg.submission_count,
          max_score: agg.max_score,
          score_stats: agg.score_stats,
        };
      }),
    );

    return c.json({
      exams: enrichedExams,
    });
  } catch (error: unknown) {
    return internalServerError(c, "Erro ao listar provas do usuário:", error);
  }
});

// ROTA: Listar todas as submissões realizadas ou vinculadas ao aluno
userRouter.get("/submissions", async (c) => {
  try {
    const user = getAuthenticatedUser(c)!;

    const userSubmissions = await db
      .select({
        id: submissions.id,
        examId: submissions.examId,
        studentName: submissions.studentName,
        studentIdentifier: submissions.studentIdentifier,
        submittedAt: submissions.submittedAt,
        totalScore: submissions.totalScore,
        examTitle: exams.title,
        examPublicCode: exams.publicCode,
        examStatus: exams.status,
      })
      .from(submissions)
      .innerJoin(exams, eq(submissions.examId, exams.id))
      .where(
        or(
          eq(submissions.studentUserId, user.id),
          eq(submissions.studentEmail, user.email),
        ),
      )
      .orderBy(desc(submissions.submittedAt));

    const enrichedSubmissions = await Promise.all(
      userSubmissions.map(async (sub) => {
        let maxScore: number | null = null;
        if (sub.examStatus === "closed") {
          const [itemAgg] = await db
            .select({ maxScore: sum(examItems.points) })
            .from(examItems)
            .where(eq(examItems.examId, sub.examId));
          maxScore = itemAgg?.maxScore ? Number(itemAgg.maxScore) : 0;
        }

        return {
          id: sub.id,
          exam_id: sub.examId,
          exam_title: sub.examTitle,
          exam_public_code: sub.examPublicCode,
          exam_status: sub.examStatus,
          student_name: sub.studentName,
          student_identifier: sub.studentIdentifier,
          submitted_at: sub.submittedAt,
          total_score: sub.examStatus === "closed" ? sub.totalScore : null,
          max_score: maxScore,
        };
      }),
    );

    return c.json({
      submissions: enrichedSubmissions,
    });
  } catch (error: unknown) {
    return internalServerError(
      c,
      "Erro ao listar submissões do usuário:",
      error,
    );
  }
});

// ROTA: Vincular prova existente à conta do professor via Token Administrativo
userRouter.post("/claim-exam", async (c) => {
  try {
    const user = getAuthenticatedUser(c)!;
    const body = await c.req.json().catch(() => ({}));
    const rawToken =
      typeof body.admin_token === "string" ? body.admin_token : "";
    const adminToken = normalizeAdminToken(rawToken);

    if (!adminToken) {
      return c.json(
        {
          error: "Validação",
          message: "Informe um token administrativo válido (ex: adm_A7K9QF).",
        },
        400,
      );
    }

    const exam = await findExamByAdminToken(adminToken);
    if (!exam) {
      return c.json(
        {
          error: "Não encontrado",
          message: "Nenhuma prova encontrada com este token administrativo.",
        },
        404,
      );
    }

    await db
      .update(exams)
      .set({
        creatorUserId: user.id,
        adminToken: exam.adminToken || adminToken,
      })
      .where(eq(exams.id, exam.id));

    return c.json({
      ok: true,
      message: `Prova "${exam.title}" vinculada à sua conta com sucesso!`,
      exam: {
        id: exam.id,
        title: exam.title,
        public_code: exam.publicCode,
        status: exam.status,
      },
    });
  } catch (error: unknown) {
    return internalServerError(c, "Erro ao vincular prova:", error);
  }
});

// ROTA: Vincular submissão existente à conta do aluno via Código de Comprovante
userRouter.post("/claim-submission", async (c) => {
  try {
    const user = getAuthenticatedUser(c)!;
    const body = await c.req.json().catch(() => ({}));
    const rawSubmissionId =
      typeof body.submission_id === "string"
        ? body.submission_id.trim().toUpperCase()
        : "";

    if (!rawSubmissionId) {
      return c.json(
        {
          error: "Validação",
          message: "Informe o código de comprovante da submissão (ex: A7K9QF).",
        },
        400,
      );
    }

    const [sub] = await db
      .select({
        id: submissions.id,
        examId: submissions.examId,
        studentName: submissions.studentName,
        submittedAt: submissions.submittedAt,
        examTitle: exams.title,
      })
      .from(submissions)
      .innerJoin(exams, eq(submissions.examId, exams.id))
      .where(eq(submissions.id, rawSubmissionId));

    if (!sub) {
      return c.json(
        {
          error: "Não encontrado",
          message:
            "Nenhuma submissão encontrada com este código de comprovante.",
        },
        404,
      );
    }

    await db
      .update(submissions)
      .set({
        studentUserId: user.id,
        studentEmail: user.email,
      })
      .where(eq(submissions.id, sub.id));

    return c.json({
      ok: true,
      message: `Submissão da prova "${sub.examTitle}" vinculada ao seu histórico com sucesso!`,
      submission: {
        id: sub.id,
        exam_title: sub.examTitle,
        student_name: sub.studentName,
        submitted_at: sub.submittedAt,
      },
    });
  } catch (error: unknown) {
    return internalServerError(c, "Erro ao vincular submissão:", error);
  }
});

export default userRouter;
