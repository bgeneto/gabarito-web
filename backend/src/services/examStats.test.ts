import assert from "node:assert";
import test from "node:test";

import {
  PASSING_CUTOFF_PERCENT,
  computePassingStats,
  computeStudentPerformanceContext,
  toPercentScore,
} from "./examStats.js";

test("examStats passing and performance", async (t) => {
  await t.test("toPercentScore converts score to percentage", () => {
    assert.strictEqual(toPercentScore(57, 114), 50);
    assert.strictEqual(toPercentScore(10, 10), 100);
    assert.strictEqual(toPercentScore(0, 10), 0);
    assert.strictEqual(toPercentScore(5, 0), 0);
  });

  await t.test("computePassingStats returns null for empty submissions", () => {
    assert.strictEqual(computePassingStats([], 100), null);
  });

  await t.test("computePassingStats counts students at or above 50%", () => {
    const stats = computePassingStats(
      [{ totalScore: 4 }, { totalScore: 5 }, { totalScore: 8 }],
      10,
    );

    assert.ok(stats);
    assert.strictEqual(stats.cutoff_percent, PASSING_CUTOFF_PERCENT);
    assert.strictEqual(stats.cutoff_score, 5);
    assert.strictEqual(stats.passed_count, 2);
    assert.strictEqual(stats.failed_count, 1);
    assert.strictEqual(stats.pass_rate_percent, 66.7);
  });

  await t.test("computePassingStats works with variable max score", () => {
    const stats = computePassingStats(
      [{ totalScore: 56 }, { totalScore: 57 }, { totalScore: 80 }],
      114,
    );

    assert.ok(stats);
    assert.strictEqual(stats.cutoff_score, 57);
    assert.strictEqual(stats.passed_count, 2);
    assert.strictEqual(stats.pass_rate_percent, 66.7);
  });

  await t.test(
    "computeStudentPerformanceContext returns null for single student",
    () => {
      assert.strictEqual(
        computeStudentPerformanceContext([{ totalScore: 8 }], 8, 10),
        null,
      );
    },
  );

  await t.test(
    "computeStudentPerformanceContext computes z-score and percentile",
    () => {
      const context = computeStudentPerformanceContext(
        [
          { totalScore: 6 },
          { totalScore: 8 },
          { totalScore: 4 },
          { totalScore: 7 },
        ],
        7,
        10,
      );

      assert.ok(context);
      assert.strictEqual(context.sample_size, 4);
      assert.strictEqual(context.student_percent, 70);
      assert.strictEqual(context.class_mean_percent, 62.5);
      assert.strictEqual(context.class_std_dev_percent, 17.1);
      assert.strictEqual(context.z_score, 0.44);
      assert.strictEqual(context.percentile, 75);
      assert.strictEqual(context.above_cutoff, true);
      assert.strictEqual(context.small_sample_warning, true);
    },
  );

  await t.test(
    "computeStudentPerformanceContext returns z-score 0 when std dev is 0",
    () => {
      const context = computeStudentPerformanceContext(
        [{ totalScore: 8 }, { totalScore: 8 }, { totalScore: 8 }],
        8,
        10,
      );

      assert.ok(context);
      assert.strictEqual(context.class_std_dev_percent, 0);
      assert.strictEqual(context.z_score, 0);
      assert.strictEqual(context.percentile, 100);
    },
  );
});
