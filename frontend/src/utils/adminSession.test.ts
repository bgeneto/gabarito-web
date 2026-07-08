import test from "node:test";
import assert from "node:assert";
import {
  clearAdminSession,
  getAdminSession,
  hasAdminSession,
  setAdminSession,
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
    assert.strictEqual(hasAdminSession(), false);
    setAdminSession("sess_TEST01");
    assert.strictEqual(getAdminSession(), "sess_TEST01");
    assert.strictEqual(hasAdminSession(), true);
    clearAdminSession();
    assert.strictEqual(getAdminSession(), null);
  } finally {
    Object.defineProperty(globalThis, "sessionStorage", {
      value: original,
      configurable: true,
    });
  }
});
