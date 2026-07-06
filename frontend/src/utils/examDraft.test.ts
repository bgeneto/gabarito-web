import test from "node:test";
import assert from "node:assert";
import {
  getDraftStorageKey,
  loadDraft,
  saveDraft,
  clearDraft,
  mergeDraftWithExamItems,
  buildDraftFromForm,
  formatDraftSavedAt,
  type ExamDraft,
} from "./examDraft.ts";

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
  };
}

function sampleDraft(overrides: Partial<ExamDraft> = {}): ExamDraft {
  return {
    version: 1,
    publicCode: "G26-ABC123",
    studentName: "João Silva",
    studentIdentifier: "202300412",
    answers: { item1: "A", item2: "verdadeiro" },
    savedAt: Date.now(),
    itemIds: ["item1", "item2"],
    ...overrides,
  };
}

test("examDraft utilities", async (t) => {
  await t.test("getDraftStorageKey isolates drafts by publicCode", () => {
    assert.strictEqual(
      getDraftStorageKey("G26-ABC123"),
      "gabarito:draft:v1:G26-ABC123",
    );
    assert.notStrictEqual(
      getDraftStorageKey("G26-ABC123"),
      getDraftStorageKey("G26-XYZ789"),
    );
  });

  await t.test("mergeDraftWithExamItems restores matching answers", () => {
    const draft = sampleDraft();
    const merged = mergeDraftWithExamItems(draft, [
      { id: "item1" },
      { id: "item2" },
    ]);

    assert.strictEqual(merged.studentName, "João Silva");
    assert.strictEqual(merged.studentIdentifier, "202300412");
    assert.strictEqual(merged.answers.item1, "A");
    assert.strictEqual(merged.answers.item2, "verdadeiro");
    assert.strictEqual(merged.hasRestorableContent, true);
  });

  await t.test("mergeDraftWithExamItems fills new items with empty string", () => {
    const draft = sampleDraft({ answers: { item1: "B" } });
    const merged = mergeDraftWithExamItems(draft, [
      { id: "item1" },
      { id: "item3" },
    ]);

    assert.strictEqual(merged.answers.item1, "B");
    assert.strictEqual(merged.answers.item3, "");
    assert.strictEqual(merged.answers.item2, undefined);
  });

  await t.test("mergeDraftWithExamItems drops obsolete item ids", () => {
    const draft = sampleDraft({
      answers: { item1: "A", removed: "texto" },
    });
    const merged = mergeDraftWithExamItems(draft, [{ id: "item1" }]);

    assert.strictEqual(merged.answers.item1, "A");
    assert.strictEqual(merged.answers.removed, undefined);
  });

  await t.test("mergeDraftWithExamItems detects empty draft", () => {
    const draft = sampleDraft({
      studentName: "",
      studentIdentifier: "",
      answers: {},
    });
    const merged = mergeDraftWithExamItems(draft, [{ id: "item1" }]);

    assert.strictEqual(merged.hasRestorableContent, false);
  });

  await t.test("mergeDraftWithExamItems detects restorable name only", () => {
    const draft = sampleDraft({
      studentName: "Maria",
      studentIdentifier: "",
      answers: { item1: "" },
    });
    const merged = mergeDraftWithExamItems(draft, [{ id: "item1" }]);

    assert.strictEqual(merged.hasRestorableContent, true);
  });

  await t.test("buildDraftFromForm builds valid draft shape", () => {
    const draft = buildDraftFromForm(
      "G26-TEST01",
      "Ana",
      "999",
      { q1: "C" },
      ["q1"],
    );

    assert.strictEqual(draft.version, 1);
    assert.strictEqual(draft.publicCode, "G26-TEST01");
    assert.strictEqual(draft.studentName, "Ana");
    assert.strictEqual(draft.studentIdentifier, "999");
    assert.deepStrictEqual(draft.answers, { q1: "C" });
    assert.deepStrictEqual(draft.itemIds, ["q1"]);
    assert.ok(typeof draft.savedAt === "number");
  });
});

test("examDraft localStorage persistence", async (t) => {
  const originalLocalStorage = globalThis.localStorage;

  t.beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorageMock(),
      configurable: true,
      writable: true,
    });
  });

  t.afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
  });

  await t.test("saveDraft and loadDraft round-trip", () => {
    const draft = sampleDraft();
    saveDraft(draft);

    const loaded = loadDraft("G26-ABC123");
    assert.ok(loaded);
    assert.strictEqual(loaded.publicCode, draft.publicCode);
    assert.strictEqual(loaded.studentName, draft.studentName);
    assert.strictEqual(loaded.studentIdentifier, draft.studentIdentifier);
    assert.deepStrictEqual(loaded.answers, draft.answers);
    assert.deepStrictEqual(loaded.itemIds, draft.itemIds);
    assert.ok(loaded.savedAt >= draft.savedAt);
  });

  await t.test("loadDraft returns null when no draft exists", () => {
    assert.strictEqual(loadDraft("G26-MISSING"), null);
  });

  await t.test("clearDraft removes stored draft", () => {
    saveDraft(sampleDraft());
    assert.ok(loadDraft("G26-ABC123"));

    clearDraft("G26-ABC123");
    assert.strictEqual(loadDraft("G26-ABC123"), null);
  });

  await t.test("drafts for different exams do not collide", () => {
    saveDraft(
      sampleDraft({
        publicCode: "G26-EXAM01",
        studentName: "Aluno 1",
        answers: { item1: "A" },
      }),
    );
    saveDraft(
      sampleDraft({
        publicCode: "G26-EXAM02",
        studentName: "Aluno 2",
        answers: { item1: "B" },
      }),
    );

    const draft1 = loadDraft("G26-EXAM01");
    const draft2 = loadDraft("G26-EXAM02");

    assert.ok(draft1);
    assert.ok(draft2);
    assert.strictEqual(draft1.studentName, "Aluno 1");
    assert.strictEqual(draft2.studentName, "Aluno 2");
    assert.strictEqual(draft1.answers.item1, "A");
    assert.strictEqual(draft2.answers.item1, "B");
  });

  await t.test("loadDraft rejects corrupted json", () => {
    localStorage.setItem(getDraftStorageKey("G26-BAD"), "{ invalid json");
    assert.strictEqual(loadDraft("G26-BAD"), null);
  });

  await t.test("loadDraft rejects mismatched publicCode", () => {
    localStorage.setItem(
      getDraftStorageKey("G26-WRONG"),
      JSON.stringify(sampleDraft({ publicCode: "G26-OTHER" })),
    );
    assert.strictEqual(loadDraft("G26-WRONG"), null);
  });

  await t.test("loadDraft rejects unsupported version", () => {
    localStorage.setItem(
      getDraftStorageKey("G26-OLD"),
      JSON.stringify({ ...sampleDraft(), version: 2 }),
    );
    assert.strictEqual(loadDraft("G26-OLD"), null);
  });

  await t.test("loadDraft rejects invalid shape", () => {
    localStorage.setItem(
      getDraftStorageKey("G26-INVALID"),
      JSON.stringify({ version: 1, publicCode: "G26-INVALID" }),
    );
    assert.strictEqual(loadDraft("G26-INVALID"), null);
  });
});

test("formatDraftSavedAt", async (t) => {
  const now = Date.now();

  await t.test("returns 'agora mesmo' for recent saves", () => {
    assert.strictEqual(formatDraftSavedAt(now - 30_000), "agora mesmo");
  });

  await t.test("returns minute labels", () => {
    assert.strictEqual(formatDraftSavedAt(now - 90_000), "há 1 minuto");
    assert.strictEqual(formatDraftSavedAt(now - 5 * 60_000), "há 5 minutos");
  });

  await t.test("returns hour labels", () => {
    assert.strictEqual(formatDraftSavedAt(now - 90 * 60_000), "há 1 hora");
    assert.strictEqual(
      formatDraftSavedAt(now - 5 * 60 * 60_000),
      "há 5 horas",
    );
  });

  await t.test("returns formatted date for saves older than 24 hours", () => {
    const savedAt = now - 25 * 60 * 60_000;
    const formatted = formatDraftSavedAt(savedAt);
    assert.match(formatted, /\d{2}\/\d{2}/);
  });
});
