export interface ScoreStats {
  avg: number;
  min: number;
  max: number;
  avg_percent: number;
}

export interface ItemStats {
  total_attempts: number;
  correct_rate_percent: number;
  points_lost: number;
  top_wrong_answers?: { answer: string; count: number }[];
}

export interface ScoreBucket {
  label: string;
  count: number;
}

export interface ScoreDistribution {
  buckets: ScoreBucket[];
}

export interface ExamItemWithStats {
  id: string;
  question_number: number;
  sub_label: string | null;
  points: number;
  answer_type: string;
  answer_config: { accepted: string[] };
  stats: ItemStats;
}

export interface ExamKpiData {
  submission_count: number;
  max_score: number;
  item_count?: number;
  score_stats: ScoreStats | null;
}
