export interface SubmissionReceipt {
  version: 1;
  publicCode: string;
  studentIdentifier: string;
  submissionId: string;
  savedAt: number;
}

export function getReceiptStorageKey(
  publicCode: string,
  studentIdentifier: string,
): string {
  const normalizedCode = publicCode.trim().toUpperCase();
  const normalizedIdentifier = studentIdentifier.trim().toUpperCase();
  return `gabarito:receipt:v1:${normalizedCode}:${normalizedIdentifier}`;
}

export function saveSubmissionReceipt(receipt: SubmissionReceipt): void {
  try {
    localStorage.setItem(
      getReceiptStorageKey(receipt.publicCode, receipt.studentIdentifier),
      JSON.stringify({ ...receipt, savedAt: Date.now() }),
    );
  } catch {
    // Quota exceeded or storage unavailable — silently ignore
  }
}

export function loadSubmissionReceipt(
  publicCode: string,
  studentIdentifier: string,
): SubmissionReceipt | null {
  try {
    const raw = localStorage.getItem(
      getReceiptStorageKey(publicCode, studentIdentifier),
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SubmissionReceipt;
    if (
      parsed.version !== 1 ||
      parsed.publicCode.trim().toUpperCase() !==
        publicCode.trim().toUpperCase() ||
      parsed.studentIdentifier.trim().toUpperCase() !==
        studentIdentifier.trim().toUpperCase() ||
      typeof parsed.submissionId !== "string" ||
      !parsed.submissionId.trim()
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function loadSubmissionReceiptForExam(
  publicCode: string,
): SubmissionReceipt | null {
  const prefix = `gabarito:receipt:v1:${publicCode.trim().toUpperCase()}:`;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as SubmissionReceipt;
      if (
        parsed.version === 1 &&
        typeof parsed.submissionId === "string" &&
        parsed.submissionId.trim()
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}
