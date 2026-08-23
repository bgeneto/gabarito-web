import test from "node:test";
import assert from "node:assert";
import {
  generateMagicLinkToken,
  generateUserSessionToken,
  hashToken,
  isValidEmail,
  normalizeEmail,
} from "./authTokens.js";

test("authTokens utilities", async (t) => {
  await t.test("normalizeEmail lowercases and trims", () => {
    assert.strictEqual(
      normalizeEmail("  Professor@Exemplo.COM  "),
      "professor@exemplo.com",
    );
    assert.strictEqual(normalizeEmail(""), "");
    assert.strictEqual(normalizeEmail(null as any), "");
  });

  await t.test("isValidEmail checks format correctly", () => {
    assert.strictEqual(isValidEmail("aluno@universidade.edu.br"), true);
    assert.strictEqual(isValidEmail("prof.silva+teste@gmail.com"), true);
    assert.strictEqual(isValidEmail("invalido"), false);
    assert.strictEqual(isValidEmail("sem-arroba.com"), false);
    assert.strictEqual(isValidEmail("sem-dominio@"), false);
    assert.strictEqual(isValidEmail(""), false);
  });

  await t.test("hashToken generates SHA-256 hex string", () => {
    const hash1 = hashToken("meu-token-secreto");
    const hash2 = hashToken("meu-token-secreto");
    const hash3 = hashToken("outro-token");
    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, hash3);
    assert.strictEqual(hash1.length, 64);
  });

  await t.test(
    "generateMagicLinkToken produces raw token and valid hash with 15min expiry",
    () => {
      const now = Date.now();
      const tokenData = generateMagicLinkToken();
      assert.ok(tokenData.rawToken.length >= 32);
      assert.strictEqual(tokenData.tokenHash, hashToken(tokenData.rawToken));
      assert.ok(tokenData.expiresAt >= now + 14 * 60 * 1000);
      assert.ok(tokenData.expiresAt <= now + 16 * 60 * 1000);
    },
  );

  await t.test(
    "generateUserSessionToken produces raw token and valid hash with 30d expiry",
    () => {
      const now = Date.now();
      const sessionData = generateUserSessionToken();
      assert.ok(sessionData.rawToken.length >= 32);
      assert.strictEqual(
        sessionData.tokenHash,
        hashToken(sessionData.rawToken),
      );
      assert.ok(sessionData.expiresAt >= now + 29 * 24 * 60 * 60 * 1000);
    },
  );
});
