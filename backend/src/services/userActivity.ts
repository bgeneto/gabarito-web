import { count, eq, or } from "drizzle-orm";

import { db } from "../db/index.js";
import { exams, submissions } from "../db/schema.js";

export async function countUserActivity(
  userId: string,
  email: string,
): Promise<{ examCount: number; submissionCount: number }> {
  const [examAgg] = await db
    .select({ n: count() })
    .from(exams)
    .where(eq(exams.creatorUserId, userId));

  const [subAgg] = await db
    .select({ n: count() })
    .from(submissions)
    .where(
      or(
        eq(submissions.studentUserId, userId),
        eq(submissions.studentEmail, email),
      ),
    );

  return {
    examCount: Number(examAgg?.n ?? 0),
    submissionCount: Number(subAgg?.n ?? 0),
  };
}
