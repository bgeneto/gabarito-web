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

export interface PassingStats {
  cutoff_percent: number;
  cutoff_score: number;
  passed_count: number;
  failed_count: number;
  pass_rate_percent: number;
}

export interface StudentPerformanceContext {
  sample_size: number;
  student_percent: number;
  class_mean_percent: number;
  class_std_dev_percent: number;
  z_score: number;
  percentile: number;
  cutoff_percent: number;
  above_cutoff: boolean;
  small_sample_warning: boolean;
}
