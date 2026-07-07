import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  like,
  lt,
  or,
  sql,
  sum,
} from "drizzle-orm";

import { db } from "../db/index.js";
import {
  accessLogs,
  examItems,
  exams,
  submissionAnswers,
  submissions,
} from "../db/schema.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(n: number): number {
  return Date.now() - n * DAY_MS;
}

function toDateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function buildTimeline(
  rows: { date: string; count: number }[],
  days: number,
): { date: string; count: number }[] {
  const map = new Map(rows.map((r) => [r.date, r.count]));
  const result: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) ?? 0 });
  }
  return result;
}

export async function getOverview() {
  const now = Date.now();
  const sevenDaysAgo = daysAgo(7);
  const thirtyDaysAgo = daysAgo(30);

  const [examStats] = await db
    .select({
      total: count(),
      open: sql<number>`sum(case when ${exams.status} = 'open' then 1 else 0 end)`,
      closed: sql<number>`sum(case when ${exams.status} = 'closed' then 1 else 0 end)`,
      createdLast7d: sql<number>`sum(case when ${exams.createdAt} >= ${sevenDaysAgo} then 1 else 0 end)`,
      createdLast30d: sql<number>`sum(case when ${exams.createdAt} >= ${thirtyDaysAgo} then 1 else 0 end)`,
    })
    .from(exams);

  const [subStats] = await db
    .select({
      total: count(),
      last7d: sql<number>`sum(case when ${submissions.submittedAt} >= ${sevenDaysAgo} then 1 else 0 end)`,
      last30d: sql<number>`sum(case when ${submissions.submittedAt} >= ${thirtyDaysAgo} then 1 else 0 end)`,
      uniqueStudents: countDistinct(submissions.studentIdentifier),
    })
    .from(submissions);

  const [itemStats] = await db
    .select({
      total: count(),
      avgPerExam: sql<number>`cast(count(*) as real) / nullif((select count(*) from exams), 0)`,
    })
    .from(examItems);

  const scoreRow = await db
    .select({
      examId: submissions.examId,
      totalScore: submissions.totalScore,
      maxScore: sql<number>`(
        select coalesce(sum(${examItems.points}), 0)
        from ${examItems}
        where ${examItems.examId} = ${submissions.examId}
      )`,
    })
    .from(submissions);

  let globalAvgPercent = 0;
  const examsWithSubs = new Set<string>();
  const percents: number[] = [];
  for (const row of scoreRow) {
    examsWithSubs.add(row.examId);
    if (row.maxScore > 0) {
      percents.push((row.totalScore / row.maxScore) * 100);
    }
  }
  if (percents.length > 0) {
    globalAvgPercent =
      Math.round((percents.reduce((a, b) => a + b, 0) / percents.length) * 10) /
      10;
  }

  const [access7d] = await db
    .select({
      apiRequests: sql<number>`sum(case when ${accessLogs.eventType} = 'api_request' then 1 else 0 end)`,
      pageViews: sql<number>`sum(case when ${accessLogs.eventType} = 'page_view' then 1 else 0 end)`,
      uniqueVisitors: countDistinct(accessLogs.ipHash),
      errors: sql<number>`sum(case when ${accessLogs.statusCode} >= 400 then 1 else 0 end)`,
      total: count(),
    })
    .from(accessLogs)
    .where(gte(accessLogs.timestamp, sevenDaysAgo));

  const topRoutes = await db
    .select({
      routeCategory: accessLogs.routeCategory,
      count: count(),
    })
    .from(accessLogs)
    .where(gte(accessLogs.timestamp, sevenDaysAgo))
    .groupBy(accessLogs.routeCategory)
    .orderBy(desc(count()))
    .limit(10);

  const examsByDayRaw = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', ${exams.createdAt} / 1000, 'unixepoch')`,
      count: count(),
    })
    .from(exams)
    .where(gte(exams.createdAt, daysAgo(30)))
    .groupBy(sql`strftime('%Y-%m-%d', ${exams.createdAt} / 1000, 'unixepoch')`);

  const subsByDayRaw = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', ${submissions.submittedAt} / 1000, 'unixepoch')`,
      count: count(),
    })
    .from(submissions)
    .where(gte(submissions.submittedAt, daysAgo(30)))
    .groupBy(
      sql`strftime('%Y-%m-%d', ${submissions.submittedAt} / 1000, 'unixepoch')`,
    );

  const pvByDayRaw = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', ${accessLogs.timestamp} / 1000, 'unixepoch')`,
      count: count(),
    })
    .from(accessLogs)
    .where(
      and(
        gte(accessLogs.timestamp, daysAgo(30)),
        eq(accessLogs.eventType, "page_view"),
      ),
    )
    .groupBy(
      sql`strftime('%Y-%m-%d', ${accessLogs.timestamp} / 1000, 'unixepoch')`,
    );

  const errorRate =
    access7d.total > 0
      ? Math.round(((access7d.errors ?? 0) / access7d.total) * 1000) / 10
      : 0;

  return {
    generated_at: now,
    exams: {
      total: examStats.total,
      open: Number(examStats.open ?? 0),
      closed: Number(examStats.closed ?? 0),
      created_last_7d: Number(examStats.createdLast7d ?? 0),
      created_last_30d: Number(examStats.createdLast30d ?? 0),
    },
    submissions: {
      total: subStats.total,
      last_7d: Number(subStats.last7d ?? 0),
      last_30d: Number(subStats.last30d ?? 0),
      unique_students: subStats.uniqueStudents,
    },
    items: {
      total: itemStats.total,
      avg_per_exam: Math.round((itemStats.avgPerExam ?? 0) * 10) / 10,
    },
    scores: {
      global_avg_percent: globalAvgPercent,
      exams_with_submissions: examsWithSubs.size,
    },
    access: {
      api_requests_last_7d: Number(access7d.apiRequests ?? 0),
      page_views_last_7d: Number(access7d.pageViews ?? 0),
      unique_visitors_last_7d: access7d.uniqueVisitors,
      top_routes: topRoutes.map((r) => ({
        route_category: r.routeCategory,
        count: r.count,
      })),
      error_rate_7d_percent: errorRate,
    },
    timeline: {
      exams_by_day: buildTimeline(
        examsByDayRaw.map((r) => ({ date: r.date, count: r.count })),
        30,
      ),
      submissions_by_day: buildTimeline(
        subsByDayRaw.map((r) => ({ date: r.date, count: r.count })),
        30,
      ),
      page_views_by_day: buildTimeline(
        pvByDayRaw.map((r) => ({ date: r.date, count: r.count })),
        30,
      ),
    },
  };
}

export interface ExamListParams {
  page: number;
  limit: number;
  status: "all" | "open" | "closed";
  sort: "created_at" | "submissions" | "title" | "last_activity";
  order: "asc" | "desc";
  q?: string;
}

async function getExamAggregates(examId: string) {
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

  const [accessAgg] = await db
    .select({
      pageViews: sql<number>`sum(case when ${accessLogs.eventType} = 'page_view' then 1 else 0 end)`,
      apiRequests: sql<number>`sum(case when ${accessLogs.eventType} = 'api_request' then 1 else 0 end)`,
      uniqueVisitors: countDistinct(accessLogs.ipHash),
    })
    .from(accessLogs)
    .where(eq(accessLogs.examId, examId));

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
    access_stats: {
      page_views: Number(accessAgg.pageViews ?? 0),
      api_requests: Number(accessAgg.apiRequests ?? 0),
      unique_visitors: accessAgg.uniqueVisitors,
    },
  };
}

export async function getExamsList(params: ExamListParams) {
  const { page, limit, status, sort, order, q } = params;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status !== "all") {
    conditions.push(eq(exams.status, status));
  }
  if (q) {
    const term = `%${q}%`;
    conditions.push(
      or(like(exams.title, term), like(exams.publicCode, term.toUpperCase())),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const allExams = await db
    .select()
    .from(exams)
    .where(whereClause)
    .orderBy(order === "desc" ? desc(exams.createdAt) : exams.createdAt);

  const enriched = await Promise.all(
    allExams.map(async (exam) => {
      const agg = await getExamAggregates(exam.id);
      const endTime = exam.closedAt ?? Date.now();
      return {
        id: exam.id,
        title: exam.title,
        public_code: exam.publicCode,
        status: exam.status,
        created_at: exam.createdAt,
        closed_at: exam.closedAt,
        duration_open_ms: endTime - exam.createdAt,
        ...agg,
        _sort_submissions: agg.submission_count,
        _sort_last_activity: agg.last_submission_at ?? exam.createdAt,
      };
    }),
  );

  if (sort === "submissions") {
    enriched.sort((a, b) =>
      order === "desc"
        ? b._sort_submissions - a._sort_submissions
        : a._sort_submissions - b._sort_submissions,
    );
  } else if (sort === "title") {
    enriched.sort((a, b) =>
      order === "desc"
        ? b.title.localeCompare(a.title)
        : a.title.localeCompare(b.title),
    );
  } else if (sort === "last_activity") {
    enriched.sort((a, b) =>
      order === "desc"
        ? b._sort_last_activity - a._sort_last_activity
        : a._sort_last_activity - b._sort_last_activity,
    );
  } else if (sort === "created_at" && order === "asc") {
    enriched.sort((a, b) => a.created_at - b.created_at);
  } else if (sort === "created_at") {
    enriched.sort((a, b) => b.created_at - a.created_at);
  }

  const total = enriched.length;
  const pageItems = enriched
    .slice(offset, offset + limit)
    .map(({ _sort_submissions, _sort_last_activity, ...rest }) => rest);

  return {
    exams: pageItems,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getExamDetail(examId: string) {
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
  if (!exam) return null;

  const itemsList = await db
    .select()
    .from(examItems)
    .where(eq(examItems.examId, examId))
    .orderBy(examItems.position);

  const subsList = await db
    .select()
    .from(submissions)
    .where(eq(submissions.examId, examId))
    .orderBy(submissions.submittedAt);

  const agg = await getExamAggregates(examId);
  const maxScore = agg.max_score;

  const itemStats = await Promise.all(
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

      return {
        id: item.id,
        question_number: item.questionNumber,
        sub_label: item.subLabel,
        points: item.points,
        answer_type: item.answerType,
        answer_config: { accepted },
        stats: {
          total_attempts: total,
          correct_rate_percent: correctRate,
          points_lost: Math.round(Number(stats.pointsLost ?? 0) * 100) / 100,
          top_wrong_answers: wrongAnswers.map((w) => ({
            answer: w.answer,
            count: w.count,
          })),
        },
      };
    }),
  );

  const buckets = [0, 0, 0, 0, 0];
  for (const sub of subsList) {
    if (maxScore <= 0) continue;
    const pct = (sub.totalScore / maxScore) * 100;
    const idx = Math.min(Math.floor(pct / 20), 4);
    buckets[idx]++;
  }

  const subsByDayRaw = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', ${submissions.submittedAt} / 1000, 'unixepoch')`,
      count: count(),
    })
    .from(submissions)
    .where(eq(submissions.examId, examId))
    .groupBy(
      sql`strftime('%Y-%m-%d', ${submissions.submittedAt} / 1000, 'unixepoch')`,
    );

  const endTime = exam.closedAt ?? Date.now();

  return {
    id: exam.id,
    title: exam.title,
    public_code: exam.publicCode,
    status: exam.status,
    created_at: exam.createdAt,
    closed_at: exam.closedAt,
    duration_open_ms: endTime - exam.createdAt,
    ...agg,
    items: itemStats,
    submissions: subsList.map((s) => ({
      id: s.id,
      student_name: s.studentName,
      student_identifier: s.studentIdentifier,
      submitted_at: s.submittedAt,
      total_score: s.totalScore,
    })),
    score_distribution: {
      buckets: [
        { label: "0-20%", count: buckets[0] },
        { label: "20-40%", count: buckets[1] },
        { label: "40-60%", count: buckets[2] },
        { label: "60-80%", count: buckets[3] },
        { label: "80-100%", count: buckets[4] },
      ],
    },
    submission_timeline: subsByDayRaw.map((r) => ({
      date: r.date,
      count: r.count,
    })),
  };
}

export interface AccessReportParams {
  from?: number;
  to?: number;
  eventType?: "api_request" | "page_view";
}

export async function getAccessReport(params: AccessReportParams) {
  const from = params.from ?? daysAgo(30);
  const to = params.to ?? Date.now();

  const conditions = [
    gte(accessLogs.timestamp, from),
    lt(accessLogs.timestamp, to + 1),
  ];
  if (params.eventType) {
    conditions.push(eq(accessLogs.eventType, params.eventType));
  }
  const whereClause = and(...conditions);

  const byCategory = await db
    .select({
      routeCategory: accessLogs.routeCategory,
      count: count(),
      uniqueVisitors: countDistinct(accessLogs.ipHash),
    })
    .from(accessLogs)
    .where(whereClause)
    .groupBy(accessLogs.routeCategory)
    .orderBy(desc(count()));

  const byDay = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', ${accessLogs.timestamp} / 1000, 'unixepoch')`,
      count: count(),
      uniqueVisitors: countDistinct(accessLogs.ipHash),
    })
    .from(accessLogs)
    .where(whereClause)
    .groupBy(
      sql`strftime('%Y-%m-%d', ${accessLogs.timestamp} / 1000, 'unixepoch')`,
    )
    .orderBy(
      sql`strftime('%Y-%m-%d', ${accessLogs.timestamp} / 1000, 'unixepoch')`,
    );

  const statusCodes = await db
    .select({
      statusCode: accessLogs.statusCode,
      count: count(),
    })
    .from(accessLogs)
    .where(and(whereClause, sql`${accessLogs.statusCode} is not null`))
    .groupBy(accessLogs.statusCode)
    .orderBy(accessLogs.statusCode);

  const latencies = await db
    .select({ ms: accessLogs.responseTimeMs })
    .from(accessLogs)
    .where(and(whereClause, sql`${accessLogs.responseTimeMs} is not null`))
    .orderBy(accessLogs.responseTimeMs);

  const msValues = latencies
    .map((l) => l.ms)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);

  const p50 =
    msValues.length > 0 ? msValues[Math.floor(msValues.length * 0.5)] : null;
  const p95 =
    msValues.length > 0 ? msValues[Math.floor(msValues.length * 0.95)] : null;
  const avgLatency =
    msValues.length > 0
      ? Math.round(msValues.reduce((a, b) => a + b, 0) / msValues.length)
      : null;

  const topExams = await db
    .select({
      examId: accessLogs.examId,
      count: count(),
      uniqueVisitors: countDistinct(accessLogs.ipHash),
    })
    .from(accessLogs)
    .where(and(whereClause, sql`${accessLogs.examId} is not null`))
    .groupBy(accessLogs.examId)
    .orderBy(desc(count()))
    .limit(10);

  const examTitles = new Map<string, string>();
  for (const row of topExams) {
    if (!row.examId) continue;
    const [e] = await db
      .select({ title: exams.title, publicCode: exams.publicCode })
      .from(exams)
      .where(eq(exams.id, row.examId));
    if (e) {
      examTitles.set(row.examId, `${e.title} (${e.publicCode})`);
    }
  }

  const [totals] = await db
    .select({
      total: count(),
      uniqueVisitors: countDistinct(accessLogs.ipHash),
    })
    .from(accessLogs)
    .where(whereClause);

  return {
    from,
    to,
    totals: {
      events: totals.total,
      unique_visitors: totals.uniqueVisitors,
    },
    by_route_category: byCategory.map((r) => ({
      route_category: r.routeCategory,
      count: r.count,
      unique_visitors: r.uniqueVisitors,
    })),
    by_day: byDay.map((r) => ({
      date: r.date,
      count: r.count,
      unique_visitors: r.uniqueVisitors,
    })),
    status_codes: statusCodes.map((r) => ({
      status_code: r.statusCode,
      count: r.count,
    })),
    latency_ms: { avg: avgLatency, p50, p95 },
    top_exams: topExams.map((r) => ({
      exam_id: r.examId,
      title: examTitles.get(r.examId!) ?? r.examId,
      count: r.count,
      unique_visitors: r.uniqueVisitors,
    })),
  };
}

export function toDateKeyExport(ts: number): string {
  return toDateKey(ts);
}
