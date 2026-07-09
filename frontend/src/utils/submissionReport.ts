import type { StudentPerformanceContext } from "../types/examStats";

export interface AnswerDetail {
  questionNumber: number;
  subLabel: string | null;
  points: number;
  rawAnswer: string;
  isCorrect: boolean;
  scoreAwarded: number;
  answerType: "choice" | "true_false" | "short_text";
  acceptedAnswers: string[];
}

export interface SubmissionReportData {
  id: string;
  student_name: string;
  student_identifier: string;
  submitted_at: number;
  exam_title: string;
  total_score: number;
  answers: AnswerDetail[];
  performance_context?: StudentPerformanceContext | null;
}

export function formatQuestionLabel(ans: AnswerDetail): string {
  const base = `Questão ${ans.questionNumber}`;
  return ans.subLabel ? `${base} ${ans.subLabel.toUpperCase()}` : base;
}

export function formatAcceptedAnswer(ans: AnswerDetail): string {
  if (ans.answerType === "true_false") {
    return ans.acceptedAnswers?.[0] === "V" ? "verdadeiro" : "falso";
  }
  return ans.acceptedAnswers?.[0] || "—";
}

export function formatStudentAnswer(rawAnswer: string): string {
  return rawAnswer.trim() ? rawAnswer : "Em branco";
}

export function buildSubmissionReportFilename(
  data: SubmissionReportData,
): string {
  const slug = data.student_identifier.replace(/[^a-zA-Z0-9]/g, "");
  return `gabaritoweb-${slug}-${data.id}.pdf`;
}

export function exportSubmissionReportPdf(data: SubmissionReportData): void {
  const previousTitle = document.title;
  document.title = buildSubmissionReportFilename(data).replace(/\.pdf$/i, "");
  window.print();
  window.setTimeout(() => {
    document.title = previousTitle;
  }, 0);
}
