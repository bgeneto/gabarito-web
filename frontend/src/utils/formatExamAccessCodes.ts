export function formatExamAccessCodes(
  publicCode: string,
  adminToken?: string | null,
): string {
  if (!adminToken) return publicCode;
  return `${publicCode} | ${adminToken}`;
}
