import test from "node:test";
import assert from "node:assert";
import { hashAdminToken, normalizeAdminToken } from "./adminAuth.ts";

test("adminAuth utilities", async (t) => {
  await t.test("hashAdminToken is deterministic", () => {
    const hash = hashAdminToken("adm_TEST01");
    assert.strictEqual(hash.length, 64);
    assert.strictEqual(hash, hashAdminToken("adm_TEST01"));
  });

  await t.test(
    "normalizeAdminToken normalizes prefix to lowercase and suffix to uppercase",
    () => {
      assert.strictEqual(normalizeAdminToken("adm_VZT7XG"), "adm_VZT7XG");
      assert.strictEqual(normalizeAdminToken("ADM_VZT7XG"), "adm_VZT7XG");
      assert.strictEqual(normalizeAdminToken("adm_vzt7xg"), "adm_VZT7XG");
      assert.strictEqual(normalizeAdminToken("invalid"), null);
    },
  );
});
