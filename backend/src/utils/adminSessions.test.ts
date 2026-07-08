import test from "node:test";
import assert from "node:assert";
import {
  createAdminSession,
  resetAdminSessionsForTests,
  resolveAdminSession,
} from "./adminSessions.ts";

test("admin session store", async (t) => {
  t.beforeEach(() => {
    resetAdminSessionsForTests();
  });

  await t.test("creates and resolves a session for an exam", () => {
    const { sessionToken, expiresAt } = createAdminSession("exam-123");
    assert.ok(sessionToken.length > 20);
    assert.ok(expiresAt > Date.now());
    assert.strictEqual(resolveAdminSession(sessionToken), "exam-123");
  });

  await t.test("returns null for unknown session tokens", () => {
    assert.strictEqual(resolveAdminSession("unknown"), null);
  });
});
