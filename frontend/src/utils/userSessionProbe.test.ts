import test from "node:test";
import assert from "node:assert";
import {
  interpretAuthMeStatus,
  nextSessionProbeDelayMs,
} from "./userSessionProbe.ts";

test("userSessionProbe", async (t) => {
  await t.test("only 401 invalidates the stored session", () => {
    assert.strictEqual(interpretAuthMeStatus(401), "invalid");
    assert.strictEqual(interpretAuthMeStatus(200), "authenticated");
    assert.strictEqual(interpretAuthMeStatus(204), "authenticated");
  });

  await t.test("proxy and server errors keep the session and retry", () => {
    for (const status of [0, 408, 425, 429, 500, 502, 503, 504, 520]) {
      assert.strictEqual(
        interpretAuthMeStatus(status),
        "retry",
        `status ${status} should retry`,
      );
    }
  });

  await t.test("backoff grows then caps at 10s", () => {
    assert.strictEqual(nextSessionProbeDelayMs(0), 1000);
    assert.strictEqual(nextSessionProbeDelayMs(1), 2000);
    assert.strictEqual(nextSessionProbeDelayMs(2), 4000);
    assert.strictEqual(nextSessionProbeDelayMs(3), 8000);
    assert.strictEqual(nextSessionProbeDelayMs(4), 10000);
    assert.strictEqual(nextSessionProbeDelayMs(20), 10000);
  });
});
