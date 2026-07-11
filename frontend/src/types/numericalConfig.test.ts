import test from "node:test";
import assert from "node:assert";
import {
  computeAcceptedValueRange,
  computeAcceptedValueRangeForUnit,
  formatAcceptedValueRangeHint,
  formatAcceptedValueRangeHintForUnit,
  formatToleranceRangeNumber,
} from "./numericalConfig.js";

test("computeAcceptedValueRange", async (t) => {
  await t.test("absolute tolerance", () => {
    assert.deepStrictEqual(computeAcceptedValueRange(10, { absolute: 0.01 }), {
      min: 9.99,
      max: 10.01,
    });
  });

  await t.test("relative tolerance", () => {
    assert.deepStrictEqual(computeAcceptedValueRange(10, { relative: 0.01 }), {
      min: 9.9,
      max: 10.1,
    });
  });

  await t.test("relative with negative expected uses |value|", () => {
    assert.deepStrictEqual(computeAcceptedValueRange(-10, { relative: 0.1 }), {
      min: -11,
      max: -9,
    });
  });

  await t.test("relative with zero expected is null", () => {
    assert.strictEqual(computeAcceptedValueRange(0, { relative: 0.01 }), null);
  });

  await t.test("absolute with zero expected works", () => {
    assert.deepStrictEqual(computeAcceptedValueRange(0, { absolute: 0.05 }), {
      min: -0.05,
      max: 0.05,
    });
  });
});

test("computeAcceptedValueRangeForUnit", async (t) => {
  await t.test("recomputes relative range via unit factor", () => {
    // 30 ± 0.5% → [29.85, 30.15] m/s; km/h factor 0.2777777778
    const factor = 0.2777777778;
    const inUnit = computeAcceptedValueRangeForUnit(
      30,
      { relative: 0.005 },
      factor,
    );
    assert.ok(inUnit);
    assert.ok(Math.abs(inUnit.min * factor - 29.85) < 1e-9);
    assert.ok(Math.abs(inUnit.max * factor - 30.15) < 1e-9);
  });

  await t.test("canonical unit factor 1 equals canonical range", () => {
    assert.deepStrictEqual(
      computeAcceptedValueRangeForUnit(10, { absolute: 0.01 }, 1),
      { min: 9.99, max: 10.01 },
    );
  });

  await t.test("rejects non-positive factor", () => {
    assert.strictEqual(
      computeAcceptedValueRangeForUnit(30, { relative: 0.005 }, 0),
      null,
    );
  });
});

test("formatAcceptedValueRangeHint", async (t) => {
  await t.test("formats absolute range like the teacher UI", () => {
    assert.strictEqual(
      formatAcceptedValueRangeHint(10, { absolute: 0.01 }),
      "Valores aceitos: [9.99, 10.01]",
    );
  });

  await t.test("appends canonical unit when provided", () => {
    assert.strictEqual(
      formatAcceptedValueRangeHint(30, { relative: 0.005 }, "m/s"),
      "Valores aceitos: [29.85, 30.15] m/s",
    );
  });

  await t.test("returns null for relative + zero", () => {
    assert.strictEqual(
      formatAcceptedValueRangeHint(0, { relative: 0.01 }),
      null,
    );
  });
});

test("formatAcceptedValueRangeHintForUnit", async (t) => {
  await t.test("converts absolute range by unit factor", () => {
    // [2.74, 2.76] m/s with factor 0.2778 → km/h
    const hint = formatAcceptedValueRangeHintForUnit(
      2.75,
      { absolute: 0.01 },
      0.2778,
      "km/h",
    );
    assert.ok(hint?.startsWith("Valores aceitos: ["));
    assert.ok(hint?.endsWith("] km/h"));
    assert.ok(hint?.includes("9.863"));
    assert.ok(hint?.includes("9.935"));
  });

  await t.test("factor 1 matches canonical hint", () => {
    assert.strictEqual(
      formatAcceptedValueRangeHintForUnit(2.75, { absolute: 0.01 }, 1, "m/s"),
      formatAcceptedValueRangeHint(2.75, { absolute: 0.01 }, "m/s"),
    );
  });
});

test("formatToleranceRangeNumber", async (t) => {
  await t.test("trims float noise", () => {
    assert.strictEqual(formatToleranceRangeNumber(9.990000000000002), "9.99");
  });
});
