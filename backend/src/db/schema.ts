import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").unique().notNull(),
    name: text("name"),
    createdAt: integer("created_at").notNull(),
    lastLoginAt: integer("last_login_at"),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  }),
);

export const magicLinks = sqliteTable(
  "magic_links",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
    ipHash: text("ip_hash").notNull(),
    targetRoute: text("target_route"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    emailIdx: index("magic_links_email_idx").on(table.email),
    tokenHashIdx: index("magic_links_token_hash_idx").on(table.tokenHash),
    expiresAtIdx: index("magic_links_expires_at_idx").on(table.expiresAt),
  }),
);

export const userSessions = sqliteTable(
  "user_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .references(() => users.id)
      .notNull(),
    sessionTokenHash: text("session_token_hash").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
  },
  (table) => ({
    userIdIdx: index("user_sessions_user_id_idx").on(table.userId),
    sessionTokenHashIdx: index("user_sessions_token_hash_idx").on(
      table.sessionTokenHash,
    ),
    expiresAtIdx: index("user_sessions_expires_at_idx").on(table.expiresAt),
  }),
);

export const exams = sqliteTable(
  "exams",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    publicCode: text("public_code").unique().notNull(),
    adminCodeHash: text("admin_code_hash").notNull(),
    adminToken: text("admin_token"),
    creatorUserId: text("creator_user_id").references(() => users.id),
    status: text("status").$type<"open" | "closed">().default("open").notNull(),
    createdAt: integer("created_at").notNull(),
    closedAt: integer("closed_at"),
  },
  (table) => ({
    publicCodeIdx: index("exams_public_code_idx").on(table.publicCode),
    adminCodeHashIdx: index("exams_admin_code_hash_idx").on(
      table.adminCodeHash,
    ),
    creatorUserIdIdx: index("exams_creator_user_id_idx").on(
      table.creatorUserId,
    ),
    statusIdx: index("exams_status_idx").on(table.status),
  }),
);

export const examItems = sqliteTable(
  "exam_items",
  {
    id: text("id").primaryKey(),
    examId: text("exam_id")
      .references(() => exams.id)
      .notNull(),
    questionNumber: integer("question_number").notNull(),
    subLabel: text("sub_label"), // can be null, e.g. for questao 2 sem subitem
    points: real("points").notNull(),
    answerType: text("answer_type")
      .$type<"choice" | "true_false" | "short_text" | "numerical">()
      .notNull(),
    answerConfigJson: text("answer_config_json").notNull(), // config contendo accepted answers
    position: integer("position").notNull(),
  },
  (table) => ({
    examIdIdx: index("exam_items_exam_id_idx").on(table.examId),
  }),
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    examId: text("exam_id")
      .references(() => exams.id)
      .notNull(),
    studentUserId: text("student_user_id").references(() => users.id),
    studentEmail: text("student_email"),
    studentName: text("student_name").notNull(),
    studentIdentifier: text("student_identifier").notNull(),
    submittedAt: integer("submitted_at").notNull(),
    totalScore: real("total_score").notNull(),
  },
  (table) => ({
    examIdIdx: index("submissions_exam_id_idx").on(table.examId),
    studentUserIdIdx: index("submissions_student_user_id_idx").on(
      table.studentUserId,
    ),
    studentEmailIdx: index("submissions_student_email_idx").on(
      table.studentEmail,
    ),
    studentIdentifierIdx: index("submissions_student_identifier_idx").on(
      table.studentIdentifier,
    ),
    examStudentUnique: uniqueIndex("submissions_exam_student_unique").on(
      table.examId,
      table.studentIdentifier,
    ),
  }),
);

export const submissionAnswers = sqliteTable(
  "submission_answers",
  {
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
  },
  (table) => ({
    submissionIdIdx: index("submission_answers_submission_id_idx").on(
      table.submissionId,
    ),
    itemIdIdx: index("submission_answers_item_id_idx").on(table.itemId),
  }),
);

export const accessLogs = sqliteTable(
  "access_logs",
  {
    id: text("id").primaryKey(),
    timestamp: integer("timestamp").notNull(),
    eventType: text("event_type")
      .$type<"api_request" | "page_view">()
      .notNull(),
    method: text("method"),
    path: text("path").notNull(),
    routeCategory: text("route_category").notNull(),
    statusCode: integer("status_code"),
    ipHash: text("ip_hash").notNull(),
    userAgent: text("user_agent"),
    examId: text("exam_id").references(() => exams.id),
    responseTimeMs: integer("response_time_ms"),
  },
  (table) => ({
    timestampIdx: index("access_logs_timestamp_idx").on(table.timestamp),
    eventTypeIdx: index("access_logs_event_type_idx").on(table.eventType),
    routeCategoryIdx: index("access_logs_route_category_idx").on(
      table.routeCategory,
    ),
    examIdIdx: index("access_logs_exam_id_idx").on(table.examId),
  }),
);
