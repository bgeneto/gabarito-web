import test from "node:test";
import assert from "node:assert";
import {
  generateBase36,
  generatePublicCode,
  generateAdminToken,
  generateSubmissionId,
} from "./generator.js";

test("generator utilities", async (t) => {
  await t.test("generateBase36 length and characters", () => {
    const code = generateBase36(6);
    assert.strictEqual(code.length, 6);
    assert.match(code, /^[0-9A-Z]{6}$/);
  });

  await t.test("generatePublicCode format", () => {
    const code = generatePublicCode(2026);
    assert.strictEqual(code.length, 10); // G26- + 6 chars = 10
    assert.match(code, /^G26-[0-9A-Z]{6}$/);
  });

  await t.test("generateAdminToken format", () => {
    const token = generateAdminToken();
    assert.strictEqual(token.length, 10); // adm_ + 6 chars = 10
    assert.match(token, /^adm_[0-9A-Z]{6}$/);
  });

  await t.test("generateSubmissionId format", () => {
    const id = generateSubmissionId();
    assert.strictEqual(id.length, 6);
    assert.match(id, /^[0-9A-Z]{6}$/);
  });
});
