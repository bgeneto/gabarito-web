import test from "node:test";
import assert from "node:assert";
import { formatFetchErrorMessage, isNetworkFetchError } from "./fetchJson.ts";

test("fetchJson error helpers", async (t) => {
  await t.test("isNetworkFetchError detects Safari load failed", () => {
    assert.strictEqual(isNetworkFetchError(new TypeError("Load failed")), true);
    assert.strictEqual(
      isNetworkFetchError(new TypeError("Failed to fetch")),
      true,
    );
    assert.strictEqual(isNetworkFetchError(new Error("Você já enviou")), false);
  });

  await t.test(
    "formatFetchErrorMessage maps network errors to Portuguese",
    () => {
      const message = formatFetchErrorMessage(
        new TypeError("Load failed"),
        "fallback",
      );
      assert.match(message, /Falha de conexão/);
      assert.match(message, /comprovante/);
    },
  );

  await t.test("formatFetchErrorMessage preserves server messages", () => {
    assert.strictEqual(
      formatFetchErrorMessage(new Error("Matrícula inválida"), "fallback"),
      "Matrícula inválida",
    );
  });
});
