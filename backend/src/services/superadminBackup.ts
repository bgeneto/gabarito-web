import { eq, inArray } from "drizzle-orm";
import { gzipSync, gunzipSync } from "zlib";

import { db } from "../db/index.js";
import {
  examItems,
  exams,
  submissionAnswers,
  submissions,
} from "../db/schema.js";

export const BACKUP_FORMAT = "gabarito-exam-backup";
export const BACKUP_VERSION = 1;
const MAX_EXAMS_PER_EXPORT = 50;

type ExamRow = typeof exams.$inferSelect;
type ExamItemRow = typeof examItems.$inferSelect;
type SubmissionRow = typeof submissions.$inferSelect;
type SubmissionAnswerRow = typeof submissionAnswers.$inferSelect;

export interface BackupBundle {
  format: typeof BACKUP_FORMAT;
  version: number;
  exported_at: number;
  exam_ids: string[];
  exams: Record<string, unknown>[];
  exam_items: Record<string, unknown>[];
  submissions: Record<string, unknown>[];
  submission_answers: Record<string, unknown>[];
}

function examToSnake(row: ExamRow) {
  return {
    id: row.id,
    title: row.title,
    public_code: row.publicCode,
    admin_code_hash: row.adminCodeHash,
    status: row.status,
    created_at: row.createdAt,
    closed_at: row.closedAt,
  };
}

function examItemToSnake(row: ExamItemRow) {
  return {
    id: row.id,
    exam_id: row.examId,
    question_number: row.questionNumber,
    sub_label: row.subLabel,
    points: row.points,
    answer_type: row.answerType,
    answer_config_json: row.answerConfigJson,
    position: row.position,
  };
}

function submissionToSnake(row: SubmissionRow) {
  return {
    id: row.id,
    exam_id: row.examId,
    student_name: row.studentName,
    student_identifier: row.studentIdentifier,
    submitted_at: row.submittedAt,
    total_score: row.totalScore,
  };
}

function submissionAnswerToSnake(row: SubmissionAnswerRow) {
  return {
    id: row.id,
    submission_id: row.submissionId,
    item_id: row.itemId,
    raw_answer: row.rawAnswer,
    normalized_answer: row.normalizedAnswer,
    is_correct: row.isCorrect,
    score_awarded: row.scoreAwarded,
  };
}

function examFromSnake(row: Record<string, unknown>): ExamRow {
  return {
    id: String(row.id),
    title: String(row.title),
    publicCode: String(row.public_code),
    adminCodeHash: String(row.admin_code_hash),
    status: row.status as "open" | "closed",
    createdAt: Number(row.created_at),
    closedAt: row.closed_at != null ? Number(row.closed_at) : null,
  };
}

function examItemFromSnake(row: Record<string, unknown>): ExamItemRow {
  return {
    id: String(row.id),
    examId: String(row.exam_id),
    questionNumber: Number(row.question_number),
    subLabel: row.sub_label != null ? String(row.sub_label) : null,
    points: Number(row.points),
    answerType: row.answer_type as ExamItemRow["answerType"],
    answerConfigJson: String(row.answer_config_json),
    position: Number(row.position),
  };
}

function submissionFromSnake(row: Record<string, unknown>): SubmissionRow {
  return {
    id: String(row.id),
    examId: String(row.exam_id),
    studentName: String(row.student_name),
    studentIdentifier: String(row.student_identifier),
    submittedAt: Number(row.submitted_at),
    totalScore: Number(row.total_score),
  };
}

function submissionAnswerFromSnake(
  row: Record<string, unknown>,
): SubmissionAnswerRow {
  return {
    id: String(row.id),
    submissionId: String(row.submission_id),
    itemId: String(row.item_id),
    rawAnswer: String(row.raw_answer),
    normalizedAnswer: String(row.normalized_answer),
    isCorrect: Number(row.is_correct),
    scoreAwarded: Number(row.score_awarded),
  };
}

function formatBackupFilename(): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .slice(0, 15);
  return `gabarito-backup-${stamp}.gbr.gz`;
}

export async function exportExams(examIds: string[]) {
  const uniqueIds = [...new Set(examIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new Error("Informe ao menos uma prova para backup.");
  }
  if (uniqueIds.length > MAX_EXAMS_PER_EXPORT) {
    throw new Error(`Máximo de ${MAX_EXAMS_PER_EXPORT} provas por backup.`);
  }

  const examRows = await db
    .select()
    .from(exams)
    .where(inArray(exams.id, uniqueIds));

  if (examRows.length === 0) {
    throw new Error("Nenhuma prova encontrada para os IDs informados.");
  }

  const foundIds = examRows.map((e) => e.id);

  const itemRows = await db
    .select()
    .from(examItems)
    .where(inArray(examItems.examId, foundIds));

  const submissionRows = await db
    .select()
    .from(submissions)
    .where(inArray(submissions.examId, foundIds));

  const submissionIds = submissionRows.map((s) => s.id);
  const answerRows =
    submissionIds.length > 0
      ? await db
          .select()
          .from(submissionAnswers)
          .where(inArray(submissionAnswers.submissionId, submissionIds))
      : [];

  const bundle: BackupBundle = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exported_at: Date.now(),
    exam_ids: foundIds,
    exams: examRows.map(examToSnake),
    exam_items: itemRows.map(examItemToSnake),
    submissions: submissionRows.map(submissionToSnake),
    submission_answers: answerRows.map(submissionAnswerToSnake),
  };

  const buffer = gzipSync(Buffer.from(JSON.stringify(bundle)));

  return {
    buffer,
    filename: formatBackupFilename(),
    stats: {
      exams: examRows.length,
      exam_items: itemRows.length,
      submissions: submissionRows.length,
      submission_answers: answerRows.length,
    },
  };
}

function parseBackupBundle(raw: string): BackupBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Arquivo de backup inválido (JSON corrompido).");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as BackupBundle).format !== BACKUP_FORMAT
  ) {
    throw new Error("Formato de backup não reconhecido.");
  }

  const bundle = parsed as BackupBundle;
  if (bundle.version > BACKUP_VERSION) {
    throw new Error(
      "Versão do backup mais recente que o servidor. Atualize a aplicação.",
    );
  }
  if (
    !Array.isArray(bundle.exams) ||
    !Array.isArray(bundle.exam_items) ||
    !Array.isArray(bundle.submissions) ||
    !Array.isArray(bundle.submission_answers)
  ) {
    throw new Error("Estrutura do backup inválida.");
  }

  return bundle;
}

export interface RestoreResult {
  imported: { id: string; public_code: string; title: string }[];
  skipped: { id: string; public_code: string; title: string; reason: string }[];
  errors: { id: string; public_code: string; title: string; message: string }[];
}

async function examExists(
  examId: string,
  publicCode: string,
): Promise<{ exists: boolean; reason?: string }> {
  const [byId] = await db
    .select({ id: exams.id })
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);
  if (byId) {
    return { exists: true, reason: "id já existe" };
  }

  const [byCode] = await db
    .select({ id: exams.id })
    .from(exams)
    .where(eq(exams.publicCode, publicCode))
    .limit(1);
  if (byCode) {
    return { exists: true, reason: "código público já existe" };
  }

  return { exists: false };
}

export async function restoreExams(gzipBuffer: Buffer): Promise<RestoreResult> {
  let raw: string;
  try {
    raw = gunzipSync(gzipBuffer).toString("utf-8");
  } catch {
    throw new Error("Arquivo de backup inválido (não é gzip).");
  }

  const bundle = parseBackupBundle(raw);
  const result: RestoreResult = { imported: [], skipped: [], errors: [] };

  const itemsByExam = new Map<string, ExamItemRow[]>();
  for (const rawItem of bundle.exam_items) {
    const item = examItemFromSnake(rawItem);
    const list = itemsByExam.get(item.examId) ?? [];
    list.push(item);
    itemsByExam.set(item.examId, list);
  }

  const submissionsByExam = new Map<string, SubmissionRow[]>();
  for (const rawSub of bundle.submissions) {
    const sub = submissionFromSnake(rawSub);
    const list = submissionsByExam.get(sub.examId) ?? [];
    list.push(sub);
    submissionsByExam.set(sub.examId, list);
  }

  const answersBySubmission = new Map<string, SubmissionAnswerRow[]>();
  for (const rawAns of bundle.submission_answers) {
    const ans = submissionAnswerFromSnake(rawAns);
    const list = answersBySubmission.get(ans.submissionId) ?? [];
    list.push(ans);
    answersBySubmission.set(ans.submissionId, list);
  }

  for (const rawExam of bundle.exams) {
    const exam = examFromSnake(rawExam);
    const summary = {
      id: exam.id,
      public_code: exam.publicCode,
      title: exam.title,
    };

    const conflict = await examExists(exam.id, exam.publicCode);
    if (conflict.exists) {
      result.skipped.push({
        ...summary,
        reason: conflict.reason ?? "já existe",
      });
      continue;
    }

    const examItemRows = itemsByExam.get(exam.id) ?? [];
    const examSubmissionRows = submissionsByExam.get(exam.id) ?? [];

    try {
      db.transaction((tx) => {
        tx.insert(exams).values(exam).run();

        for (const item of examItemRows) {
          tx.insert(examItems).values(item).run();
        }

        for (const sub of examSubmissionRows) {
          tx.insert(submissions).values(sub).run();
          const answers = answersBySubmission.get(sub.id) ?? [];
          for (const ans of answers) {
            tx.insert(submissionAnswers).values(ans).run();
          }
        }
      });
      result.imported.push(summary);
    } catch (error: unknown) {
      const message = String((error as Error)?.message ?? error);
      result.errors.push({ ...summary, message });
    }
  }

  return result;
}
