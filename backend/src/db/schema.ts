import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const exams = sqliteTable("exams", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  publicCode: text("public_code").unique().notNull(),
  adminCodeHash: text("admin_code_hash").notNull(),
  status: text("status").$type<"open" | "closed">().default("open").notNull(),
  createdAt: integer("created_at").notNull(),
  closedAt: integer("closed_at"),
});

export const examItems = sqliteTable("exam_items", {
  id: text("id").primaryKey(),
  examId: text("exam_id")
    .references(() => exams.id)
    .notNull(),
  questionNumber: integer("question_number").notNull(),
  subLabel: text("sub_label"), // can be null, e.g. for questao 2 sem subitem
  points: real("points").notNull(),
  answerType: text("answer_type")
    .$type<"choice" | "true_false" | "text_exact">()
    .notNull(),
  answerConfigJson: text("answer_config_json").notNull(), // config contendo accepted answers
  position: integer("position").notNull(),
});

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  examId: text("exam_id")
    .references(() => exams.id)
    .notNull(),
  studentName: text("student_name").notNull(),
  studentIdentifier: text("student_identifier").notNull(),
  submittedAt: integer("submitted_at").notNull(),
  totalScore: real("total_score").notNull(),
});

export const submissionAnswers = sqliteTable("submission_answers", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id")
    .references(() => submissions.id)
    .notNull(),
  itemId: text("item_id")
    .references(() => examItems.id)
    .notNull(),
  rawAnswer: text("raw_answer").notNull(),
  normalizedAnswer: text("normalized_answer").notNull(),
  isCorrect: integer("is_correct").notNull(), // 0 para falso, 1 para verdadeiro
  scoreAwarded: real("score_awarded").notNull(),
});
