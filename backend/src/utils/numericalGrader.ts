import type {
  NumericalAnswerConfig,
  NumericalTolerance,
  ParsedNumericalAnswer,
} from "../types/numericalConfig.js";
import {
  formatCanonicalAnswer,
  parseNumericalAnswer,
} from "./numericalParser.js";
import { normalizeText } from "./normalizer.js";

/** Absorbs float noise at tolerance boundaries (absolute and relative). */
export const TOLERANCE_EPSILON = 1e-9;

export function gradeNumericalAnswer(
  rawAnswer: string,
  config: NumericalAnswerConfig,
): { isCorrect: boolean; normalizedAnswer: string } {
  const parsed = parseNumericalAnswer(rawAnswer, config);

  if (!parsed) {
    return { isCorrect: false, normalizedAnswer: normalizeText(rawAnswer) };
  }

  const received = toCanonicalValue(parsed, config);
  const expected = config.value;
  const isCorrect = isWithinTolerance(received, expected, config.tolerance);
  const normalizedAnswer = formatCanonicalAnswer(received, config);

  return { isCorrect, normalizedAnswer };
}

function toCanonicalValue(
  parsed: ParsedNumericalAnswer,
  config: NumericalAnswerConfig,
): number {
  if (parsed.matchedUnit) {
    return parsed.value * parsed.matchedUnit.unitToCanonical;
  }
  return parsed.value;
}

/**
 * Half-width of the accepted interval around `expected`.
 * Relative: δ = relative × |expected| (undefined when expected is 0).
 * Absolute: δ = absolute.
 * Prefer relative when both are present and expected ≠ 0 (matches validation:
 * configs should only carry one kind).
 */
export function computeToleranceDelta(
  expected: number,
  tolerance: NumericalTolerance,
): number | null {
  if (!Number.isFinite(expected)) return null;

  if (
    tolerance.relative != null &&
    Number.isFinite(tolerance.relative) &&
    tolerance.relative >= 0 &&
    expected !== 0
  ) {
    return tolerance.relative * Math.abs(expected);
  }

  if (
    tolerance.absolute != null &&
    Number.isFinite(tolerance.absolute) &&
    tolerance.absolute >= 0
  ) {
    return tolerance.absolute;
  }

  return null;
}

/** Inclusive accepted interval in the canonical value space (before epsilon). */
export function computeAcceptedValueRange(
  expected: number,
  tolerance: NumericalTolerance,
): { min: number; max: number } | null {
  const delta = computeToleranceDelta(expected, tolerance);
  if (delta == null) return null;
  return { min: expected - delta, max: expected + delta };
}

/**
 * Accepted interval expressed in a given unit's scale
 * (`canonical / unitToCanonical`).
 */
export function computeAcceptedValueRangeForUnit(
  expected: number,
  tolerance: NumericalTolerance,
  unitToCanonical: number,
): { min: number; max: number } | null {
  const range = computeAcceptedValueRange(expected, tolerance);
  if (
    range == null ||
    !Number.isFinite(unitToCanonical) ||
    unitToCanonical <= 0
  ) {
    return null;
  }
  return {
    min: range.min / unitToCanonical,
    max: range.max / unitToCanonical,
  };
}

function isWithinTolerance(
  received: number,
  expected: number,
  tolerance: NumericalTolerance,
): boolean {
  const delta = computeToleranceDelta(expected, tolerance);
  if (delta == null) return false;
  return Math.abs(received - expected) <= delta + TOLERANCE_EPSILON;
}

export function parseNumericalConfigJson(
  answerConfigJson: string,
): NumericalAnswerConfig | null {
  try {
    const config = JSON.parse(answerConfigJson) as NumericalAnswerConfig;
    if (
      typeof config.value !== "number" ||
      typeof config.unitRequired !== "boolean"
    ) {
      return null;
    }
    return config;
  } catch {
    return null;
  }
}
