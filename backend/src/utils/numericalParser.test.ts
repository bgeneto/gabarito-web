import test from "node:test";
import assert from "node:assert";
import type { NumericalAnswerConfig } from "../types/numericalConfig.js";
import {
  extractNumberAndUnit,
  parseNumericalAnswer,
} from "./numericalParser.js";

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

test("numericalParser", async (t) => {
  await t.test("extractNumberAndUnit handles comma and dot decimals", () => {
    assert.deepStrictEqual(extractNumberAndUnit("6,24 N"), {
      value: 6.24,
      unitRemainder: "N",
    });
    assert.deepStrictEqual(extractNumberAndUnit("6.24 N"), {
      value: 6.24,
      unitRemainder: "N",
    });
    assert.deepStrictEqual(extractNumberAndUnit("1.234,56 kg"), {
      value: 1234.56,
      unitRemainder: "kg",
    });
    assert.deepStrictEqual(extractNumberAndUnit("1,234.56 kg"), {
      value: 1234.56,
      unitRemainder: "kg",
    });
    assert.deepStrictEqual(extractNumberAndUnit("-3,5"), {
      value: -3.5,
      unitRemainder: "",
    });
  });

  await t.test("parseNumericalAnswer matches canonical unit", () => {
    const parsed = parseNumericalAnswer("30 m/s", velocityConfig);
    assert.ok(parsed);
    assert.strictEqual(parsed!.value, 30);
    assert.strictEqual(parsed!.matchedUnit?.unit, "m/s");
  });

  await t.test("parseNumericalAnswer matches km/h", () => {
    const parsed = parseNumericalAnswer("108 km/h", velocityConfig);
    assert.ok(parsed);
    assert.strictEqual(parsed!.value, 108);
    assert.strictEqual(parsed!.matchedUnit?.unit, "km/h");
  });

  await t.test("parseNumericalAnswer matches mph", () => {
    const parsed = parseNumericalAnswer("67.11 mph", velocityConfig);
    assert.ok(parsed);
    assert.strictEqual(parsed!.matchedUnit?.unit, "mph");
  });

  await t.test("parseNumericalAnswer matches alias with accents", () => {
    const parsed = parseNumericalAnswer(
      "30 metros por segundo",
      velocityConfig,
    );
    assert.ok(parsed);
    assert.strictEqual(parsed!.matchedUnit?.unit, "m/s");
  });

  await t.test(
    "parseNumericalAnswer rejects missing unit when required",
    () => {
      assert.strictEqual(parseNumericalAnswer("30", velocityConfig), null);
    },
  );

  await t.test("parseNumericalAnswer rejects unknown unit", () => {
    assert.strictEqual(parseNumericalAnswer("30 ft/s", velocityConfig), null);
  });

  await t.test(
    "parseNumericalAnswer without unit required accepts number only",
    () => {
      const config: NumericalAnswerConfig = {
        value: 25.75,
        unitRequired: false,
        tolerance: { absolute: 0.01 },
      };
      const parsed = parseNumericalAnswer("25,75", config);
      assert.ok(parsed);
      assert.strictEqual(parsed!.value, 25.75);
      assert.strictEqual(parsed!.matchedUnit, undefined);
    },
  );

  await t.test(
    "parseNumericalAnswer matches unit id when aliases are empty",
    () => {
      const config: NumericalAnswerConfig = {
        value: 30,
        canonicalUnit: "m/s",
        unitRequired: true,
        acceptedUnits: [
          { unit: "m/s", unitToCanonical: 1, aliases: [] },
          {
            unit: "km/h",
            unitToCanonical: 0.2777777778,
            aliases: [],
          },
        ],
        tolerance: { relative: 0.005 },
      };
      const byId = parseNumericalAnswer("30 m/s", config);
      assert.ok(byId);
      assert.strictEqual(byId!.matchedUnit?.unit, "m/s");

      const converted = parseNumericalAnswer("108 km/h", config);
      assert.ok(converted);
      assert.strictEqual(converted!.matchedUnit?.unit, "km/h");

      assert.strictEqual(
        parseNumericalAnswer("30 metros por segundo", config),
        null,
      );
    },
  );
});
