import test from "node:test";
import assert from "node:assert";
import type { NumericalAnswerConfig } from "../types/numericalConfig.js";
import {
  computeAcceptedValueRange,
  computeAcceptedValueRangeForUnit,
  gradeNumericalAnswer,
} from "./numericalGrader.js";
import { validateItemFields } from "./validateItem.js";
import { gradeItemAnswer } from "./grading.js";

const velocityConfig: NumericalAnswerConfig = {
  value: 30,
  canonicalUnit: "m/s",
  unitRequired: true,
  acceptedUnits: [
    {
      unit: "m/s",
      unitToCanonical: 1,
      aliases: ["m/s", "metro por segundo", "metros por segundo"],
    },
    {
      unit: "km/h",
      unitToCanonical: 0.2777777778,
      aliases: ["km/h", "quilometro por hora", "quilometros por hora"],
    },
    {
      unit: "mph",
      unitToCanonical: 0.44704,
      aliases: ["mph", "mi/h", "milha por hora", "milhas por hora"],
    },
  ],
  tolerance: { relative: 0.005 },
};

/** Slightly beyond a boundary in unit space (still clear of TOLERANCE_EPSILON). */
function justOutside(boundary: number, outward: "below" | "above"): number {
  const step = Math.max(Math.abs(boundary) * 1e-4, 1e-4);
  return outward === "below" ? boundary - step : boundary + step;
}

test("numericalGrader", async (t) => {
  await t.test("grades 108 km/h as correct (30 m/s)", () => {
    const result = gradeNumericalAnswer("108 km/h", velocityConfig);
    assert.strictEqual(result.isCorrect, true);
    assert.strictEqual(result.normalizedAnswer, "30 m/s");
  });

  await t.test("grades 67.11 mph as correct", () => {
    const result = gradeNumericalAnswer("67.11 mph", velocityConfig);
    assert.strictEqual(result.isCorrect, true);
  });

  await t.test("grades exact 30 m/s as correct", () => {
    const result = gradeNumericalAnswer("30 m/s", velocityConfig);
    assert.strictEqual(result.isCorrect, true);
    assert.strictEqual(result.normalizedAnswer, "30 m/s");
  });

  await t.test("grades wrong value as incorrect", () => {
    const result = gradeNumericalAnswer("100 km/h", velocityConfig);
    assert.strictEqual(result.isCorrect, false);
  });

  await t.test("derives canonical label when canonicalUnit omitted", () => {
    const { canonicalUnit: _omit, ...withoutCanonical } = velocityConfig;
    const result = gradeNumericalAnswer("108 km/h", withoutCanonical);
    assert.strictEqual(result.isCorrect, true);
    assert.strictEqual(result.normalizedAnswer, "30 m/s");
  });

  await t.test("grades absolute tolerance without units", () => {
    const config: NumericalAnswerConfig = {
      value: 25.75,
      unitRequired: false,
      tolerance: { absolute: 0.01 },
    };
    assert.strictEqual(gradeNumericalAnswer("25.74", config).isCorrect, true);
    assert.strictEqual(gradeNumericalAnswer("25.76", config).isCorrect, true);
    assert.strictEqual(gradeNumericalAnswer("25.77", config).isCorrect, false);
  });

  await t.test("accepts relative boundary despite floating-point noise", () => {
    const config: NumericalAnswerConfig = {
      value: 1 / 3,
      unitRequired: false,
      tolerance: { relative: 0.01 },
    };
    const max = (1 / 3) * (1 + 0.01);
    const min = (1 / 3) * (1 - 0.01);
    assert.strictEqual(
      gradeNumericalAnswer(String(max), config).isCorrect,
      true,
    );
    assert.strictEqual(
      gradeNumericalAnswer(String(min), config).isCorrect,
      true,
    );
  });

  await t.test("grades relative tolerance for negative expected", () => {
    const config: NumericalAnswerConfig = {
      value: -10,
      unitRequired: false,
      tolerance: { relative: 0.1 },
    };
    assert.strictEqual(gradeNumericalAnswer("-11", config).isCorrect, true);
    assert.strictEqual(gradeNumericalAnswer("-9", config).isCorrect, true);
    assert.strictEqual(gradeNumericalAnswer("-11.1", config).isCorrect, false);
    assert.strictEqual(gradeNumericalAnswer("-8.9", config).isCorrect, false);
  });

  await t.test(
    "computeAcceptedValueRange matches absolute and relative",
    () => {
      assert.deepStrictEqual(
        computeAcceptedValueRange(10, { absolute: 0.01 }),
        {
          min: 9.99,
          max: 10.01,
        },
      );
      assert.deepStrictEqual(
        computeAcceptedValueRange(10, { relative: 0.01 }),
        {
          min: 9.9,
          max: 10.1,
        },
      );
      assert.deepStrictEqual(
        computeAcceptedValueRange(-10, { relative: 0.1 }),
        {
          min: -11,
          max: -9,
        },
      );
      assert.strictEqual(
        computeAcceptedValueRange(0, { relative: 0.01 }),
        null,
      );
    },
  );

  await t.test(
    "relative min/max boundaries accepted in every alternate unit",
    () => {
      const canonical = computeAcceptedValueRange(
        velocityConfig.value,
        velocityConfig.tolerance,
      );
      assert.ok(canonical);
      // 30 ± 0.5% → [29.85, 30.15] m/s
      assert.deepStrictEqual(canonical, { min: 29.85, max: 30.15 });

      for (const unit of velocityConfig.acceptedUnits!) {
        const inUnit = computeAcceptedValueRangeForUnit(
          velocityConfig.value,
          velocityConfig.tolerance,
          unit.unitToCanonical,
        );
        assert.ok(inUnit, `range for ${unit.unit}`);

        assert.ok(
          Math.abs(inUnit.min * unit.unitToCanonical - canonical.min) < 1e-9,
          `${unit.unit} min converts back to canonical min`,
        );
        assert.ok(
          Math.abs(inUnit.max * unit.unitToCanonical - canonical.max) < 1e-9,
          `${unit.unit} max converts back to canonical max`,
        );

        assert.strictEqual(
          gradeNumericalAnswer(`${inUnit.min} ${unit.unit}`, velocityConfig)
            .isCorrect,
          true,
          `${unit.unit} min boundary`,
        );
        assert.strictEqual(
          gradeNumericalAnswer(`${inUnit.max} ${unit.unit}`, velocityConfig)
            .isCorrect,
          true,
          `${unit.unit} max boundary`,
        );
        assert.strictEqual(
          gradeNumericalAnswer(
            `${justOutside(inUnit.min, "below")} ${unit.unit}`,
            velocityConfig,
          ).isCorrect,
          false,
          `${unit.unit} below min`,
        );
        assert.strictEqual(
          gradeNumericalAnswer(
            `${justOutside(inUnit.max, "above")} ${unit.unit}`,
            velocityConfig,
          ).isCorrect,
          false,
          `${unit.unit} above max`,
        );
      }
    },
  );

  await t.test(
    "absolute min/max boundaries accepted in every alternate unit",
    () => {
      const config: NumericalAnswerConfig = {
        value: 30,
        canonicalUnit: "m/s",
        unitRequired: true,
        acceptedUnits: velocityConfig.acceptedUnits,
        tolerance: { absolute: 0.15 },
      };
      const canonical = computeAcceptedValueRange(
        config.value,
        config.tolerance,
      );
      assert.deepStrictEqual(canonical, { min: 29.85, max: 30.15 });

      for (const unit of config.acceptedUnits!) {
        const inUnit = computeAcceptedValueRangeForUnit(
          config.value,
          config.tolerance,
          unit.unitToCanonical,
        );
        assert.ok(inUnit);

        assert.strictEqual(
          gradeNumericalAnswer(`${inUnit.min} ${unit.unit}`, config).isCorrect,
          true,
          `${unit.unit} abs min`,
        );
        assert.strictEqual(
          gradeNumericalAnswer(`${inUnit.max} ${unit.unit}`, config).isCorrect,
          true,
          `${unit.unit} abs max`,
        );
        assert.strictEqual(
          gradeNumericalAnswer(
            `${justOutside(inUnit.min, "below")} ${unit.unit}`,
            config,
          ).isCorrect,
          false,
          `${unit.unit} abs below min`,
        );
        assert.strictEqual(
          gradeNumericalAnswer(
            `${justOutside(inUnit.max, "above")} ${unit.unit}`,
            config,
          ).isCorrect,
          false,
          `${unit.unit} abs above max`,
        );
      }
    },
  );

  await t.test(
    "computeAcceptedValueRangeForUnit rejects invalid factor",
    () => {
      assert.strictEqual(
        computeAcceptedValueRangeForUnit(30, { relative: 0.005 }, 0),
        null,
      );
      assert.strictEqual(
        computeAcceptedValueRangeForUnit(30, { relative: 0.005 }, -1),
        null,
      );
    },
  );

  await t.test("gradeItemAnswer integrates numerical type", () => {
    const item = {
      answerType: "numerical" as const,
      points: 2,
      answerConfigJson: JSON.stringify(velocityConfig),
    };
    const correct = gradeItemAnswer(item, "108 km/h");
    assert.strictEqual(correct.isCorrect, true);
    assert.strictEqual(correct.scoreAwarded, 2);

    const wrong = gradeItemAnswer(item, "50 km/h");
    assert.strictEqual(wrong.isCorrect, false);
    assert.strictEqual(wrong.scoreAwarded, 0);
  });
});

test("validateItemFields numerical", async (t) => {
  await t.test("accepts valid numerical config with units", () => {
    assert.strictEqual(
      validateItemFields({
        points: 1,
        answer_type: "numerical",
        answer_config: velocityConfig as unknown as Record<string, unknown>,
      }),
      null,
    );
  });

  await t.test("accepts valid numerical config without units", () => {
    assert.strictEqual(
      validateItemFields({
        points: 1,
        answer_type: "numerical",
        answer_config: {
          value: 25.75,
          unitRequired: false,
          tolerance: { absolute: 0.01 },
        },
      }),
      null,
    );
  });

  await t.test("rejects both tolerances", () => {
    const err = validateItemFields({
      points: 1,
      answer_type: "numerical",
      answer_config: {
        value: 10,
        unitRequired: false,
        tolerance: { relative: 0.01, absolute: 0.1 },
      },
    });
    assert.ok(err?.includes("tolerância"));
  });

  await t.test("rejects zero expected with relative-only tolerance", () => {
    const err = validateItemFields({
      points: 1,
      answer_type: "numerical",
      answer_config: {
        value: 0,
        unitRequired: false,
        tolerance: { relative: 0.01 },
      },
    });
    assert.ok(err?.includes("zero"));
  });

  await t.test("rejects missing canonical unit entry", () => {
    const err = validateItemFields({
      points: 1,
      answer_type: "numerical",
      answer_config: {
        value: 30,
        unitRequired: true,
        canonicalUnit: "m/s",
        acceptedUnits: [
          {
            unit: "km/h",
            unitToCanonical: 0.2777777778,
            aliases: ["km/h"],
          },
        ],
        tolerance: { relative: 0.005 },
      },
    });
    assert.ok(err?.includes("unitToCanonical = 1"));
  });

  await t.test(
    "accepts config without explicit canonicalUnit when factor-1 exists",
    () => {
      assert.strictEqual(
        validateItemFields({
          points: 1,
          answer_type: "numerical",
          answer_config: {
            value: 30,
            unitRequired: true,
            acceptedUnits: [
              {
                unit: "m/s",
                unitToCanonical: 1,
                aliases: ["m/s"],
              },
              {
                unit: "km/h",
                unitToCanonical: 0.2777777778,
                aliases: ["km/h"],
              },
            ],
            tolerance: { relative: 0.005 },
          },
        }),
        null,
      );
    },
  );

  await t.test("rejects multiple factor-1 units", () => {
    const err = validateItemFields({
      points: 1,
      answer_type: "numerical",
      answer_config: {
        value: 30,
        unitRequired: true,
        acceptedUnits: [
          { unit: "m/s", unitToCanonical: 1, aliases: [] },
          { unit: "metros por segundo", unitToCanonical: 1, aliases: [] },
        ],
        tolerance: { relative: 0.005 },
      },
    });
    assert.ok(err?.includes("Apenas uma"));
  });

  await t.test("rejects mismatched canonicalUnit vs factor-1 unit", () => {
    const err = validateItemFields({
      points: 1,
      answer_type: "numerical",
      answer_config: {
        value: 30,
        unitRequired: true,
        canonicalUnit: "km/h",
        acceptedUnits: [
          { unit: "m/s", unitToCanonical: 1, aliases: [] },
          { unit: "km/h", unitToCanonical: 0.2777777778, aliases: [] },
        ],
        tolerance: { relative: 0.005 },
      },
    });
    assert.ok(err?.includes("canonicalUnit"));
  });
});
