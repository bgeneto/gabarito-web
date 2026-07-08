import crypto from "crypto";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { exams } from "../db/schema.js";

const DUMMY_ADMIN_HASH = crypto
  .createHash("sha256")
  .update("__gabarito_invalid_admin_token__")
  .digest("hex");

export function hashAdminToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export async function findExamByAdminToken(adminToken: string) {
  const adminCodeHash = hashAdminToken(adminToken);

  const [exam] = await db
    .select()
    .from(exams)
    .where(eq(exams.adminCodeHash, adminCodeHash));

  const comparisonHash = exam?.adminCodeHash ?? DUMMY_ADMIN_HASH;
  const isAuthorized =
    exam !== undefined && timingSafeEqualHex(adminCodeHash, comparisonHash);

  if (!isAuthorized) {
    return null;
  }

  return exam;
}
