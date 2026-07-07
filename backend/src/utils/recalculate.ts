import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { examItems, submissionAnswers, submissions } from "../db/schema.js";
import { gradeItemAnswer } from "./grading.js";

type DbClient = Pick<typeof db, "select" | "update">;

export function recalculateExamScores(
  examId: string,
  client: DbClient = db,
): { submissionsUpdated: number; answersUpdated: number } {
  const itemsList = client
    .select()
    .from(examItems)
    .where(eq(examItems.examId, examId))
    .all();

  const itemsMap = new Map(itemsList.map((item) => [item.id, item]));

  const subsList = client
    .select()
    .from(submissions)
    .where(eq(submissions.examId, examId))
    .all();

  let submissionsUpdated = 0;
  let answersUpdated = 0;

  for (const sub of subsList) {
    const answersList = client
      .select()
      .from(submissionAnswers)
      .where(eq(submissionAnswers.submissionId, sub.id))
      .all();

    let totalScore = 0;

    for (const ans of answersList) {
      const item = itemsMap.get(ans.itemId);
      if (!item) continue;

      const { isCorrect, normalizedAnswer, scoreAwarded } = gradeItemAnswer(
        item,
        ans.rawAnswer,
      );

      totalScore += scoreAwarded;

      client
        .update(submissionAnswers)
        .set({
          isCorrect: isCorrect ? 1 : 0,
          normalizedAnswer,
          scoreAwarded,
        })
        .where(eq(submissionAnswers.id, ans.id))
        .run();

      answersUpdated++;
    }

    client
      .update(submissions)
      .set({ totalScore })
      .where(eq(submissions.id, sub.id))
      .run();

    submissionsUpdated++;
  }

  return { submissionsUpdated, answersUpdated };
}
