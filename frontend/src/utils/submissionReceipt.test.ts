import test from "node:test";
import assert from "node:assert";
import {
  getReceiptStorageKey,
  loadSubmissionReceipt,
  saveSubmissionReceipt,
  clearSubmissionReceiptsForExam,
  clearAllSubmissionReceipts,
  purgeLegacySubmissionReceiptsOnce,
  normalizeStudentIdentifier,
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

  await t.test("save and load round-trip (legacy helpers)", () => {
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

  await t.test(
    "loadSubmissionReceipt never matches partial or prefix identifiers",
    () => {
      const originalLocalStorage = globalThis.localStorage;
      const mock = createLocalStorageMock();
      Object.defineProperty(globalThis, "localStorage", {
        value: mock,
        configurable: true,
      });

      try {
        saveSubmissionReceipt(
          sampleReceipt({ studentIdentifier: "202300412" }),
        );

        assert.strictEqual(loadSubmissionReceipt("G26-ABC123", "2"), null);
        assert.strictEqual(loadSubmissionReceipt("G26-ABC123", "202"), null);
        assert.strictEqual(
          loadSubmissionReceipt("G26-ABC123", "20230041"),
          null,
        );
        assert.strictEqual(
          loadSubmissionReceipt("G26-ABC123", "2023004120"),
          null,
        );
        assert.strictEqual(
          loadSubmissionReceipt("G26-ABC123", "02300412"),
          null,
        );
        assert.strictEqual(loadSubmissionReceipt("G26-ABC123", ""), null);
        assert.strictEqual(loadSubmissionReceipt("G26-ABC123", "   "), null);

        assert.ok(loadSubmissionReceipt("G26-ABC123", "202300412"));
        assert.ok(loadSubmissionReceipt("G26-ABC123", " 202300412 "));
      } finally {
        Object.defineProperty(globalThis, "localStorage", {
          value: originalLocalStorage,
          configurable: true,
        });
      }
    },
  );

  await t.test(
    "normalizeStudentIdentifier trims and uppercases without inventing matches",
    () => {
      assert.strictEqual(normalizeStudentIdentifier("  ab12  "), "AB12");
      assert.strictEqual(normalizeStudentIdentifier(""), "");
      assert.strictEqual(normalizeStudentIdentifier("   "), "");
    },
  );

  await t.test("clearSubmissionReceiptsForExam removes only that exam", () => {
    const originalLocalStorage = globalThis.localStorage;
    const mock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: mock,
      configurable: true,
    });

    try {
      saveSubmissionReceipt(
        sampleReceipt({ publicCode: "G26-EXAM01", submissionId: "AAAAAA" }),
      );
      saveSubmissionReceipt(
        sampleReceipt({
          publicCode: "G26-EXAM02",
          studentIdentifier: "999",
          submissionId: "BBBBBB",
        }),
      );

      clearSubmissionReceiptsForExam("G26-EXAM01");
      assert.strictEqual(
        loadSubmissionReceipt("G26-EXAM01", "202300412"),
        null,
      );
      assert.ok(loadSubmissionReceipt("G26-EXAM02", "999"));
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: originalLocalStorage,
        configurable: true,
      });
    }
  });

  await t.test("clearAllSubmissionReceipts removes every receipt key", () => {
    const originalLocalStorage = globalThis.localStorage;
    const mock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: mock,
      configurable: true,
    });

    try {
      saveSubmissionReceipt(sampleReceipt());
      saveSubmissionReceipt(
        sampleReceipt({
          publicCode: "G26-OTHER",
          studentIdentifier: "X",
          submissionId: "ZZZZZZ",
        }),
      );
      mock.setItem("unrelated:key", "keep");

      const removed = clearAllSubmissionReceipts();
      assert.ok(removed >= 2);
      assert.strictEqual(
        loadSubmissionReceipt("G26-ABC123", "202300412"),
        null,
      );
      assert.strictEqual(loadSubmissionReceipt("G26-OTHER", "X"), null);
      assert.strictEqual(mock.getItem("unrelated:key"), "keep");
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: originalLocalStorage,
        configurable: true,
      });
    }
  });

  await t.test("purgeLegacySubmissionReceiptsOnce runs only once", () => {
    const originalLocalStorage = globalThis.localStorage;
    const mock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: mock,
      configurable: true,
    });

    try {
      saveSubmissionReceipt(sampleReceipt());
      purgeLegacySubmissionReceiptsOnce();
      assert.strictEqual(
        loadSubmissionReceipt("G26-ABC123", "202300412"),
        null,
      );
      assert.strictEqual(mock.getItem("gabarito:receipt:purged:v1"), "1");

      // Re-seed after purge; second call must not wipe again (flag set).
      saveSubmissionReceipt(sampleReceipt({ submissionId: "NEWNEW" }));
      purgeLegacySubmissionReceiptsOnce();
      assert.ok(loadSubmissionReceipt("G26-ABC123", "202300412"));
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: originalLocalStorage,
        configurable: true,
      });
    }
  });
});
