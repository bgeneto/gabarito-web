import { and, count, countDistinct, desc, eq, sql, sum } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  accessLogs,
  examItems,
  submissionAnswers,
  submissions,
} from "../db/schema.js";

export interface ExamAggregatesOptions {
  includeAccess?: boolean;
}

export async function getExamAggregates(
  examId: string,
  options: ExamAggregatesOptions = {},
) {
  const { includeAccess = true } = options;

  const [itemAgg] = await db
    .select({
      itemCount: count(),
      maxScore: sum(examItems.points),
    })
    .from(examItems)
    .where(eq(examItems.examId, examId));

  const [subAgg] = await db
    .select({
      submissionCount: count(),
      uniqueStudents: countDistinct(submissions.studentIdentifier),
      avgScore: sql<number>`avg(${submissions.totalScore})`,
      minScore: sql<number>`min(${submissions.totalScore})`,
      maxScore: sql<number>`max(${submissions.totalScore})`,
      firstSubmission: sql<number>`min(${submissions.submittedAt})`,
      lastSubmission: sql<number>`max(${submissions.submittedAt})`,
    })
    .from(submissions)
    .where(eq(submissions.examId, examId));

  const maxScore = Number(itemAgg.maxScore ?? 0);
  const submissionCount = subAgg.submissionCount;
  let scoreStats = null;
  if (submissionCount > 0 && maxScore > 0) {
    const avg = Number(subAgg.avgScore ?? 0);
    scoreStats = {
      avg: Math.round(avg * 100) / 100,
      min: Number(subAgg.minScore ?? 0),
      max: Number(subAgg.maxScore ?? 0),
      avg_percent: Math.round((avg / maxScore) * 1000) / 10,
    };
  }

  let accessStats = {
    page_views: 0,
    api_requests: 0,
    unique_visitors: 0,
  };

  if (includeAccess) {
    const [accessAgg] = await db
      .select({
        pageViews: sql<number>`sum(case when ${accessLogs.eventType} = 'page_view' then 1 else 0 end)`,
        apiRequests: sql<number>`sum(case when ${accessLogs.eventType} = 'api_request' then 1 else 0 end)`,
        uniqueVisitors: countDistinct(accessLogs.ipHash),
      })
      .from(accessLogs)
      .where(eq(accessLogs.examId, examId));

    accessStats = {
      page_views: Number(accessAgg.pageViews ?? 0),
      api_requests: Number(accessAgg.apiRequests ?? 0),
      unique_visitors: accessAgg.uniqueVisitors,
    };
  }

  return {
    item_count: itemAgg.itemCount,
    max_score: maxScore,
    submission_count: submissionCount,
    unique_students: subAgg.uniqueStudents,
    score_stats: scoreStats,
    first_submission_at: subAgg.firstSubmission
      ? Number(subAgg.firstSubmission)
      : null,
    last_submission_at: subAgg.lastSubmission
      ? Number(subAgg.lastSubmission)
      : null,
    access_stats: accessStats,
  };
}

export interface ItemDifficultyOptions {
  includeTopWrongAnswers?: boolean;
}

type ExamItemRow = typeof examItems.$inferSelect;

export async function getItemDifficultyStats(
  itemsList: ExamItemRow[],
  options: ItemDifficultyOptions = {},
) {
  const { includeTopWrongAnswers = false } = options;

  return Promise.all(
    itemsList.map(async (item) => {
      const [stats] = await db
        .select({
          total: count(),
          correct: sql<number>`sum(case when ${submissionAnswers.isCorrect} = 1 then 1 else 0 end)`,
          pointsLost: sql<number>`sum(${examItems.points} - ${submissionAnswers.scoreAwarded})`,
        })
        .from(submissionAnswers)
        .innerJoin(examItems, eq(submissionAnswers.itemId, examItems.id))
        .where(eq(submissionAnswers.itemId, item.id));

      const total = stats.total;
      const correctRate =
        total > 0
          ? Math.round((Number(stats.correct ?? 0) / total) * 1000) / 10
          : 0;

      let accepted: string[] = [];
      try {
        accepted = JSON.parse(item.answerConfigJson).accepted || [];
      } catch {
        /* ignore */
      }

      const itemStats: {
        total_attempts: number;
        correct_rate_percent: number;
        points_lost: number;
        top_wrong_answers?: { answer: string; count: number }[];
      } = {
        total_attempts: total,
        correct_rate_percent: correctRate,
        points_lost: Math.round(Number(stats.pointsLost ?? 0) * 100) / 100,
      };

      if (includeTopWrongAnswers) {
        const wrongAnswers = await db
          .select({
            answer: submissionAnswers.normalizedAnswer,
            count: count(),
          })
          .from(submissionAnswers)
          .where(
            and(
              eq(submissionAnswers.itemId, item.id),
              eq(submissionAnswers.isCorrect, 0),
              sql`${submissionAnswers.rawAnswer} != ''`,
            ),
          )
          .groupBy(submissionAnswers.normalizedAnswer)
          .orderBy(desc(count()))
          .limit(5);

        itemStats.top_wrong_answers = wrongAnswers.map((w) => ({
          answer: w.answer,
          count: w.count,
        }));
      }

      return {
        id: item.id,
        question_number: item.questionNumber,
        sub_label: item.subLabel,
        points: item.points,
        answer_type: item.answerType,
        answer_config: { accepted },
        stats: itemStats,
      };
    }),
  );
}

type SubmissionRow = typeof submissions.$inferSelect;

export function buildScoreDistribution(
  subsList: Pick<SubmissionRow, "totalScore">[],
  maxScore: number,
) {
  const buckets = [0, 0, 0, 0, 0];
  for (const sub of subsList) {
    if (maxScore <= 0) continue;
    const pct = (sub.totalScore / maxScore) * 100;
    const idx = Math.min(Math.floor(pct / 20), 4);
    buckets[idx]++;
  }

  return {
    buckets: [
      { label: "0-20%", count: buckets[0] },
      { label: "20-40%", count: buckets[1] },
      { label: "40-60%", count: buckets[2] },
      { label: "60-80%", count: buckets[3] },
      { label: "80-100%", count: buckets[4] },
    ],
  };
}
