/** Shared JSON export shape used by create-flow and /admin gabarito tab. */

export interface ExamGabaritoExportItem {
  questionNumber: number;
  subLabel: string;
  points: number;
  answerType: string;
  accepted?: string[];
  answer_config?: Record<string, unknown>;
}

export interface ExamGabaritoExportPayload {
  title: string;
  items: ExamGabaritoExportItem[];
}

export function slugifyExamTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Strip display-only fields so the file can be re-imported cleanly. */
export function stripDisplayFieldsFromAnswerConfig(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const { expected_label: _label, ...rest } = config;
  return rest;
}

export function downloadExamGabaritoJson(
  payload: ExamGabaritoExportPayload,
  filenameHint?: string,
): void {
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug = slugifyExamTitle(filenameHint ?? payload.title);

  link.href = url;
  link.download = `gabarito-${slug || "prova"}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
