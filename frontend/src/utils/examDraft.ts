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

/**
 * Persist only when there is real content and it differs from what is already
 * stored. Avoids hammering localStorage on every keystroke burst (important on
 * low-end phones) and keeps the "saved" timestamp meaningful.
 * Returns the saved draft, or null when nothing was written.
 */
export function saveDraftIfChanged(draft: ExamDraft): ExamDraft | null {
  if (!hasDraftContent(draft)) {
    // Empty form: drop any previous draft instead of writing noise.
    clearDraft(draft.publicCode);
    return null;
  }

  const existing = loadDraft(draft.publicCode);
  if (existing && isDraftContentEqual(existing, draft)) {
    return null;
  }

  const toSave: ExamDraft = { ...draft, savedAt: Date.now() };
  saveDraft(toSave);
  return toSave;
}

export function clearDraft(publicCode: string): void {
  try {
    localStorage.removeItem(getDraftStorageKey(publicCode));
  } catch {
    // ignore
  }
}

export function hasDraftContent(
  draft: Pick<ExamDraft, "studentName" | "studentIdentifier" | "answers">,
): boolean {
  if (draft.studentName.trim() || draft.studentIdentifier.trim()) return true;
  return Object.values(draft.answers).some((v) => v.trim().length > 0);
}

export function isDraftContentEqual(a: ExamDraft, b: ExamDraft): boolean {
  if (
    a.publicCode !== b.publicCode ||
    a.studentName !== b.studentName ||
    a.studentIdentifier !== b.studentIdentifier
  ) {
    return false;
  }

  const aIds = a.itemIds;
  const bIds = b.itemIds;
  if (aIds.length !== bIds.length) return false;
  for (let i = 0; i < aIds.length; i++) {
    if (aIds[i] !== bIds[i]) return false;
  }

  const keys = new Set([...Object.keys(a.answers), ...Object.keys(b.answers)]);
  for (const key of keys) {
    if ((a.answers[key] ?? "") !== (b.answers[key] ?? "")) return false;
  }
  return true;
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
