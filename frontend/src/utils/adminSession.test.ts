import test from "node:test";
import assert from "node:assert";
import {
  clearAdminToken,
  getAdminToken,
  hasAdminToken,
  setAdminToken,
} from "./adminSession.ts";

function createSessionStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

test("adminSession persistence", async () => {
  const original = globalThis.sessionStorage;
  Object.defineProperty(globalThis, "sessionStorage", {
    value: createSessionStorageMock(),
    configurable: true,
  });

  try {
    assert.strictEqual(hasAdminToken(), false);
    setAdminToken("adm_TEST01");
    assert.strictEqual(getAdminToken(), "adm_TEST01");
    assert.strictEqual(hasAdminToken(), true);
    clearAdminToken();
    assert.strictEqual(getAdminToken(), null);
  } finally {
    Object.defineProperty(globalThis, "sessionStorage", {
      value: original,
      configurable: true,
    });
  }
});
