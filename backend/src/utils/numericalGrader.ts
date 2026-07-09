import type {
  NumericalAnswerConfig,
  ParsedNumericalAnswer,
} from "../types/numericalConfig.js";
import {
  formatCanonicalAnswer,
  parseNumericalAnswer,
} from "./numericalParser.js";
import { normalizeText } from "./normalizer.js";

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

function isWithinTolerance(
  received: number,
  expected: number,
  tolerance: NumericalAnswerConfig["tolerance"],
): boolean {
  const diff = Math.abs(received - expected);

  if (tolerance.relative != null && expected !== 0) {
    const relativeError = diff / Math.abs(expected);
    return relativeError <= tolerance.relative;
  }

  if (tolerance.absolute != null) {
    return diff <= tolerance.absolute + 1e-9;
  }

  return false;
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
