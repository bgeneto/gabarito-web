import test from "node:test";
import assert from "node:assert";
import {
  encodeAdminTokenForUrl,
  isAdminToken,
  normalizeAdminToken,
  parseAdminTokenFromUrlSegment,
} from "./adminTokenUrl.ts";

test("adminTokenUrl utilities", async (t) => {
  await t.test("normalizeAdminToken accepts adm_ format", () => {
    assert.strictEqual(normalizeAdminToken(" adm_fv2cbj "), "adm_FV2CBJ");
    assert.strictEqual(normalizeAdminToken("invalid"), null);
  });

  await t.test("encode and parse base64url deep link round-trip", () => {
    const token = "adm_FV2CBJ";
    const encoded = encodeAdminTokenForUrl(token);
    assert.notStrictEqual(encoded, token);
    assert.strictEqual(parseAdminTokenFromUrlSegment(encoded), token);
  });

  await t.test("parseAdminTokenFromUrlSegment accepts raw token", () => {
    assert.strictEqual(
      parseAdminTokenFromUrlSegment("adm_fv2cbj"),
      "adm_FV2CBJ",
    );
    assert.strictEqual(isAdminToken("adm_FV2CBJ"), true);
  });
});
