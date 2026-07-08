import test from "node:test";
import assert from "node:assert";
import {
  getReceiptStorageKey,
  loadSubmissionReceipt,
  loadSubmissionReceiptForExam,
  saveSubmissionReceipt,
  type SubmissionReceipt,
} from "./submissionReceipt.ts";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function sampleReceipt(
  overrides: Partial<SubmissionReceipt> = {},
): SubmissionReceipt {
  return {
    version: 1,
    publicCode: "G26-ABC123",
    studentIdentifier: "202300412",
    submissionId: "A7K9QF",
    savedAt: Date.now(),
    ...overrides,
  };
}

test("submissionReceipt utilities", async (t) => {
  await t.test("getReceiptStorageKey normalizes code and identifier", () => {
    assert.strictEqual(
      getReceiptStorageKey("g26-abc123", " mat2023 "),
      "gabarito:receipt:v1:G26-ABC123:MAT2023",
    );
  });

  await t.test("save and load round-trip", () => {
    const originalLocalStorage = globalThis.localStorage;
    const mock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: mock,
      configurable: true,
    });

    try {
      const receipt = sampleReceipt();
      saveSubmissionReceipt(receipt);
      const loaded = loadSubmissionReceipt("G26-ABC123", "202300412");
      assert.ok(loaded);
      assert.strictEqual(loaded?.submissionId, "A7K9QF");
      assert.strictEqual(loaded?.studentIdentifier, "202300412");
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: originalLocalStorage,
        configurable: true,
      });
    }
  });

  await t.test("loadSubmissionReceiptForExam finds stored receipt", () => {
    const originalLocalStorage = globalThis.localStorage;
    const mock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: mock,
      configurable: true,
    });

    try {
      saveSubmissionReceipt(sampleReceipt());
      const loaded = loadSubmissionReceiptForExam("G26-ABC123");
      assert.ok(loaded);
      assert.strictEqual(loaded?.submissionId, "A7K9QF");
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: originalLocalStorage,
        configurable: true,
      });
    }
  });

  await t.test("loadSubmissionReceipt rejects invalid payload", () => {
    const originalLocalStorage = globalThis.localStorage;
    const mock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: mock,
      configurable: true,
    });

    try {
      mock.setItem(
        getReceiptStorageKey("G26-ABC123", "202300412"),
        JSON.stringify({ version: 1, submissionId: "" }),
      );
      assert.strictEqual(
        loadSubmissionReceipt("G26-ABC123", "202300412"),
        null,
      );
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: originalLocalStorage,
        configurable: true,
      });
    }
  });
});
