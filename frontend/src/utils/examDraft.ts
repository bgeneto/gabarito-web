export interface ExamDraftItem {
  id: string;
}

export interface ExamDraft {
  version: 1;
  publicCode: string;
  studentName: string;
  studentIdentifier: string;
  answers: Record<string, string>;
  savedAt: number;
  itemIds: string[];
}

export function getDraftStorageKey(publicCode: string): string {
  return `gabarito:draft:v1:${publicCode}`;
}

export function loadDraft(publicCode: string): ExamDraft | null {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(publicCode));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ExamDraft;
    if (
      parsed.version !== 1 ||
      parsed.publicCode !== publicCode ||
      typeof parsed.studentName !== "string" ||
      typeof parsed.studentIdentifier !== "string" ||
      typeof parsed.answers !== "object" ||
      parsed.answers === null ||
      !Array.isArray(parsed.itemIds)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(draft: ExamDraft): void {
  try {
    localStorage.setItem(
      getDraftStorageKey(draft.publicCode),
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
  } catch {
    // Quota exceeded or storage unavailable — silently ignore
  }
}

export function clearDraft(publicCode: string): void {
  try {
    localStorage.removeItem(getDraftStorageKey(publicCode));
  } catch {
    // ignore
  }
}

export function mergeDraftWithExamItems(
  draft: ExamDraft,
  items: ExamDraftItem[],
): {
  studentName: string;
  studentIdentifier: string;
  answers: Record<string, string>;
  hasRestorableContent: boolean;
} {
  const answers: Record<string, string> = {};
  for (const item of items) {
    answers[item.id] = draft.answers[item.id] ?? "";
  }

  const hasRestorableContent =
    draft.studentName.trim().length > 0 ||
    draft.studentIdentifier.trim().length > 0 ||
    Object.values(answers).some((v) => v.trim().length > 0);

  return {
    studentName: draft.studentName,
    studentIdentifier: draft.studentIdentifier,
    answers,
    hasRestorableContent,
  };
}

export function buildDraftFromForm(
  publicCode: string,
  studentName: string,
  studentIdentifier: string,
  answers: Record<string, string>,
  itemIds: string[],
): ExamDraft {
  return {
    version: 1,
    publicCode,
    studentName,
    studentIdentifier,
    answers,
    savedAt: Date.now(),
    itemIds,
  };
}

export function formatDraftSavedAt(savedAt: number): string {
  const diffMs = Date.now() - savedAt;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "agora mesmo";
  if (diffMin === 1) return "há 1 minuto";
  if (diffMin < 60) return `há ${diffMin} minutos`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return "há 1 hora";
  if (diffHours < 24) return `há ${diffHours} horas`;

  return new Date(savedAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
