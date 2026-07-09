/**
 * Legacy local receipt helpers.
 *
 * Receipts with matrícula + submissionId must NOT be persisted after submit
 * (shared-device PII). These helpers exist to clear legacy keys and for tests.
 */

export interface SubmissionReceipt {
  version: 1;
  publicCode: string;
  studentIdentifier: string;
  submissionId: string;
  savedAt: number;
}

const RECEIPT_KEY_PREFIX = "gabarito:receipt:v1:";
const LEGACY_PURGE_FLAG = "gabarito:receipt:purged:v1";

/** Trim + uppercase. Empty after trim is never a valid receipt key. */
export function normalizeStudentIdentifier(studentIdentifier: string): string {
  return studentIdentifier.trim().toUpperCase();
}

/**
 * Exact-match storage key only. Prefixes/suffixes/partial matrículas must never
 * collide with a different stored identifier.
 */
export function getReceiptStorageKey(
  publicCode: string,
  studentIdentifier: string,
): string {
  const normalizedCode = publicCode.trim().toUpperCase();
  const normalizedIdentifier = normalizeStudentIdentifier(studentIdentifier);
  return `${RECEIPT_KEY_PREFIX}${normalizedCode}:${normalizedIdentifier}`;
}

/** @deprecated Do not persist receipts — PII on shared devices. Kept for tests/migration. */
export function saveSubmissionReceipt(receipt: SubmissionReceipt): void {
  const identifier = normalizeStudentIdentifier(receipt.studentIdentifier);
  if (!identifier) return;

  try {
    localStorage.setItem(
      getReceiptStorageKey(receipt.publicCode, identifier),
      JSON.stringify({
        ...receipt,
        studentIdentifier: identifier,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Quota exceeded or storage unavailable — silently ignore
  }
}

/**
 * Loads a receipt only when `studentIdentifier` is a complete, exact match
 * (case/whitespace-insensitive). Partial inputs while typing never match.
 * @deprecated Student flow must not look up local receipts.
 */
export function loadSubmissionReceipt(
  publicCode: string,
  studentIdentifier: string,
): SubmissionReceipt | null {
  const normalizedIdentifier = normalizeStudentIdentifier(studentIdentifier);
  if (!normalizedIdentifier) return null;

  try {
    const raw = localStorage.getItem(
      getReceiptStorageKey(publicCode, normalizedIdentifier),
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SubmissionReceipt;
    if (
      parsed.version !== 1 ||
      parsed.publicCode.trim().toUpperCase() !==
        publicCode.trim().toUpperCase() ||
      normalizeStudentIdentifier(parsed.studentIdentifier) !==
        normalizedIdentifier ||
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

export function clearSubmissionReceiptsForExam(publicCode: string): void {
  const prefix = `${RECEIPT_KEY_PREFIX}${publicCode.trim().toUpperCase()}:`;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) keysToRemove.push(key);
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

/** Removes every legacy `gabarito:receipt:v1:*` key (matrícula + comprovante). */
export function clearAllSubmissionReceipts(): number {
  let removed = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(RECEIPT_KEY_PREFIX)) keysToRemove.push(key);
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      removed++;
    }
  } catch {
    // ignore
  }
  return removed;
}

/**
 * One-shot migration: wipe legacy receipts that stored PII on shared devices.
 * Safe to call on every app boot; runs the purge at most once per browser profile.
 */
export function purgeLegacySubmissionReceiptsOnce(): void {
  try {
    if (localStorage.getItem(LEGACY_PURGE_FLAG) === "1") return;
    clearAllSubmissionReceipts();
    localStorage.setItem(LEGACY_PURGE_FLAG, "1");
  } catch {
    // Still attempt a best-effort wipe if the flag cannot be written.
    clearAllSubmissionReceipts();
  }
}
