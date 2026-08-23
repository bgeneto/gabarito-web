import test from "node:test";
import assert from "node:assert";
import {
  sendMagicLinkEmail,
  lastSentMagicLinks,
  resetMailerForTests,
} from "./mailer.js";

test("mailer service", async (t) => {
  t.beforeEach(() => {
    resetMailerForTests();
  });

  await t.test(
    "formats verifyUrl and stores in memory in dev mode",
    async () => {
      const result = await sendMagicLinkEmail({
        toEmail: "teste@exemplo.com",
        rawToken: "token123456",
        targetRoute: "/minhas-provas",
      });

      assert.strictEqual(result.ok, true);
      assert.ok(result.verifyUrl.includes("token=token123456"));
      assert.ok(result.verifyUrl.includes("redirect=%2Fminhas-provas"));
      assert.strictEqual(lastSentMagicLinks.length, 1);
      assert.strictEqual(lastSentMagicLinks[0].toEmail, "teste@exemplo.com");
    },
  );
});
