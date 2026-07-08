import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

// Aponta o singleton do banco para um arquivo temporário ANTES de importar
// qualquer módulo que carregue db/index.ts (cada arquivo de teste roda em
// processo próprio no node:test, então isso não vaza para outros testes).
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gabarito-backup-test-"));
const tmpDbPath = path.join(tmpDir, "test.db");
process.env.DATABASE_PATH = tmpDbPath;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../../drizzle");

{
  const sqlite = new Database(tmpDbPath);
  migrate(drizzle(sqlite), { migrationsFolder });
  sqlite.close();
}

const { exportExams, restoreExams, BACKUP_FORMAT, BACKUP_VERSION } =
  await import("./superadminBackup.js");
const { db } = await import("../db/index.js");
const { exams, examItems, submissions, submissionAnswers } =
  await import("../db/schema.js");

test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

interface SeededExam {
  examId: string;
  publicCode: string;
  itemId: string;
  submissionId: string;
}

let seedCounter = 0;

async function seedExam(): Promise<SeededExam> {
  seedCounter += 1;
  const examId = `exam-uuid-${seedCounter}`;
  const publicCode = `G26-TEST${seedCounter}`;
  const itemId = `item-uuid-${seedCounter}`;
  const submissionId = `SUB${String(seedCounter).padStart(3, "0")}`;

  await db.insert(exams).values({
    id: examId,
    title: `Prova de Teste ${seedCounter}`,
    publicCode,
    adminCodeHash: "a".repeat(64),
    status: "open",
    createdAt: 1700000000000,
    closedAt: null,
  });

  await db.insert(examItems).values({
    id: itemId,
    examId,
    questionNumber: 1,
    subLabel: null,
    points: 2.5,
    answerType: "choice",
    answerConfigJson: JSON.stringify({ accepted: ["A"] }),
    position: 1,
  });

  await db.insert(submissions).values({
    id: submissionId,
    examId,
    studentName: "Aluno Teste",
    studentIdentifier: `MAT${seedCounter}`,
    submittedAt: 1700000001000,
    totalScore: 2.5,
  });

  await db.insert(submissionAnswers).values({
    id: `answer-uuid-${seedCounter}`,
    submissionId,
    itemId,
    rawAnswer: "a",
    normalizedAnswer: "A",
    isCorrect: 1,
    scoreAwarded: 2.5,
  });

  return { examId, publicCode, itemId, submissionId };
}

function parseBundle(buffer: Buffer) {
  return JSON.parse(gunzipSync(buffer).toString("utf-8"));
}

async function deleteExamRows(seeded: SeededExam) {
  const sqlite = new Database(tmpDbPath);
  sqlite
    .prepare(
      "DELETE FROM submission_answers WHERE submission_id IN (SELECT id FROM submissions WHERE exam_id = ?)",
    )
    .run(seeded.examId);
  sqlite
    .prepare("DELETE FROM submissions WHERE exam_id = ?")
    .run(seeded.examId);
  sqlite.prepare("DELETE FROM exam_items WHERE exam_id = ?").run(seeded.examId);
  sqlite.prepare("DELETE FROM exams WHERE id = ?").run(seeded.examId);
  sqlite.close();
}

test("exportExams produces gzip bundle with all 4 tables", async () => {
  const seeded = await seedExam();

  const { buffer, filename, stats } = await exportExams([seeded.examId]);

  assert.ok(filename.startsWith("gabarito-backup-"));
  assert.ok(filename.endsWith(".gbr.gz"));

  // Assinatura gzip
  assert.strictEqual(buffer[0], 0x1f);
  assert.strictEqual(buffer[1], 0x8b);

  const bundle = parseBundle(buffer);
  assert.strictEqual(bundle.format, BACKUP_FORMAT);
  assert.strictEqual(bundle.version, BACKUP_VERSION);
  assert.deepStrictEqual(bundle.exam_ids, [seeded.examId]);

  assert.strictEqual(bundle.exams.length, 1);
  assert.strictEqual(bundle.exam_items.length, 1);
  assert.strictEqual(bundle.submissions.length, 1);
  assert.strictEqual(bundle.submission_answers.length, 1);

  assert.deepStrictEqual(stats, {
    exams: 1,
    exam_items: 1,
    submissions: 1,
    submission_answers: 1,
  });

  // Colunas em snake_case, incluindo o hash necessário para recuperação
  const exportedExam = bundle.exams[0];
  assert.strictEqual(exportedExam.public_code, seeded.publicCode);
  assert.strictEqual(exportedExam.admin_code_hash, "a".repeat(64));

  const exportedAnswer = bundle.submission_answers[0];
  assert.strictEqual(exportedAnswer.submission_id, seeded.submissionId);
  assert.strictEqual(exportedAnswer.item_id, seeded.itemId);
});

test("exportExams rejects empty selection", async () => {
  await assert.rejects(() => exportExams([]), /ao menos uma prova/);
});

test("exportExams rejects unknown exam ids", async () => {
  await assert.rejects(
    () => exportExams(["nao-existe-xyz"]),
    /Nenhuma prova encontrada/,
  );
});

test("exportExams rejects more than 50 exams", async () => {
  const manyIds = Array.from({ length: 51 }, (_, i) => `fake-${i}`);
  await assert.rejects(() => exportExams(manyIds), /Máximo de 50/);
});

test("restoreExams skips exam whose id already exists", async () => {
  const seeded = await seedExam();
  const { buffer } = await exportExams([seeded.examId]);

  const result = await restoreExams(buffer);

  assert.strictEqual(result.imported.length, 0);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.skipped.length, 1);
  assert.strictEqual(result.skipped[0].id, seeded.examId);
  assert.match(result.skipped[0].reason, /id já existe/);
});

test("restoreExams skips exam whose public_code already exists", async () => {
  const seeded = await seedExam();
  const { buffer } = await exportExams([seeded.examId]);

  // Simula um backup vindo de outra instância: mesmo public_code, id diferente
  const bundle = parseBundle(buffer);
  bundle.exams[0].id = "outro-uuid-diferente";
  bundle.exam_items[0].exam_id = "outro-uuid-diferente";
  bundle.submissions[0].exam_id = "outro-uuid-diferente";
  const tampered = gzipSync(Buffer.from(JSON.stringify(bundle)));

  const result = await restoreExams(tampered);

  assert.strictEqual(result.imported.length, 0);
  assert.strictEqual(result.skipped.length, 1);
  assert.match(result.skipped[0].reason, /código público já existe/);
});

test("restoreExams round-trip: export, delete, restore, verify", async () => {
  const seeded = await seedExam();
  const { buffer } = await exportExams([seeded.examId]);

  await deleteExamRows(seeded);

  const result = await restoreExams(buffer);

  assert.strictEqual(result.skipped.length, 0);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.imported.length, 1);
  assert.strictEqual(result.imported[0].id, seeded.examId);
  assert.strictEqual(result.imported[0].public_code, seeded.publicCode);

  const sqlite = new Database(tmpDbPath, { readonly: true });
  const examRow = sqlite
    .prepare("SELECT * FROM exams WHERE id = ?")
    .get(seeded.examId) as Record<string, unknown>;
  assert.strictEqual(examRow.public_code, seeded.publicCode);
  assert.strictEqual(examRow.admin_code_hash, "a".repeat(64));

  const itemCount = sqlite
    .prepare("SELECT COUNT(*) AS n FROM exam_items WHERE exam_id = ?")
    .get(seeded.examId) as { n: number };
  const subCount = sqlite
    .prepare("SELECT COUNT(*) AS n FROM submissions WHERE exam_id = ?")
    .get(seeded.examId) as { n: number };
  const answerCount = sqlite
    .prepare(
      "SELECT COUNT(*) AS n FROM submission_answers WHERE submission_id = ?",
    )
    .get(seeded.submissionId) as { n: number };
  sqlite.close();

  assert.strictEqual(itemCount.n, 1);
  assert.strictEqual(subCount.n, 1);
  assert.strictEqual(answerCount.n, 1);
});

test("restoreExams imports missing exam and skips existing in same bundle", async () => {
  const kept = await seedExam();
  const removed = await seedExam();
  const { buffer } = await exportExams([kept.examId, removed.examId]);

  await deleteExamRows(removed);

  const result = await restoreExams(buffer);

  assert.strictEqual(result.imported.length, 1);
  assert.strictEqual(result.imported[0].id, removed.examId);
  assert.strictEqual(result.skipped.length, 1);
  assert.strictEqual(result.skipped[0].id, kept.examId);
  assert.strictEqual(result.errors.length, 0);
});

test("restoreExams rejects non-gzip payload", async () => {
  await assert.rejects(
    () => restoreExams(Buffer.from("isso não é gzip")),
    /não é gzip/,
  );
});

test("restoreExams rejects gzip with corrupted JSON", async () => {
  const corrupted = gzipSync(Buffer.from("{not json"));
  await assert.rejects(() => restoreExams(corrupted), /JSON corrompido/);
});

test("restoreExams rejects unknown format", async () => {
  const wrongFormat = gzipSync(
    Buffer.from(JSON.stringify({ format: "outro-formato", version: 1 })),
  );
  await assert.rejects(() => restoreExams(wrongFormat), /não reconhecido/);
});

test("restoreExams rejects newer bundle version", async () => {
  const futureBundle = gzipSync(
    Buffer.from(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION + 1,
        exported_at: Date.now(),
        exam_ids: [],
        exams: [],
        exam_items: [],
        submissions: [],
        submission_answers: [],
      }),
    ),
  );
  await assert.rejects(() => restoreExams(futureBundle), /Versão do backup/);
});

test("restoreExams rejects bundle with missing table arrays", async () => {
  const malformed = gzipSync(
    Buffer.from(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exams: [],
        // exam_items, submissions e submission_answers ausentes
      }),
    ),
  );
  await assert.rejects(() => restoreExams(malformed), /Estrutura do backup/);
});
