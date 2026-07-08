import test from "node:test";
import assert from "node:assert";
import { hashAdminToken } from "./adminAuth.ts";

test("adminAuth utilities", async (t) => {
  await t.test("hashAdminToken is deterministic", () => {
    const hash = hashAdminToken("adm_TEST01");
    assert.strictEqual(hash.length, 64);
    assert.strictEqual(hash, hashAdminToken("adm_TEST01"));
  });
});
