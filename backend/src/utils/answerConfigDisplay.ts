import type { NumericalAnswerConfig } from "../types/numericalConfig.js";
import { parseNumericalConfigJson } from "./numericalGrader.js";

export function formatNumericalExpectedLabel(
  config: NumericalAnswerConfig,
): string {
  const valueStr = String(config.value);
  if (config.unitRequired && config.canonicalUnit) {
    const tol = config.tolerance;
    if (tol.relative != null) {
      const pct = (tol.relative * 100).toFixed(1).replace(/\.0$/, "");
      return `${valueStr} ${config.canonicalUnit} (±${pct}%)`;
    }
    if (tol.absolute != null) {
      return `${valueStr} ${config.canonicalUnit} (±${tol.absolute})`;
    }
    return `${valueStr} ${config.canonicalUnit}`;
  }
  if (config.tolerance?.absolute != null) {
    return `${valueStr} (±${config.tolerance.absolute})`;
  }
  if (config.tolerance?.relative != null) {
    const pct = (config.tolerance.relative * 100)
      .toFixed(1)
      .replace(/\.0$/, "");
    return `${valueStr} (±${pct}%)`;
  }
  return valueStr;
}

export function parseAnswerConfigForDisplay(
  answerType: string,
  answerConfigJson: string,
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(answerConfigJson) as Record<string, unknown>;
    if (answerType === "numerical") {
      const config = parseNumericalConfigJson(answerConfigJson);
      if (config) {
        return {
          ...parsed,
          expected_label: formatNumericalExpectedLabel(config),
        };
      }
    }
    return parsed;
  } catch {
    return answerType === "numerical"
      ? { expected_label: "—" }
      : { accepted: [] };
  }
}

export function formatAcceptedAnswersForResponse(
  answerType: string,
  answerConfigJson: string,
): string[] {
  if (answerType === "numerical") {
    const config = parseNumericalConfigJson(answerConfigJson);
    if (config) {
      return [formatNumericalExpectedLabel(config)];
    }
    return [];
  }

  try {
    const parsed = JSON.parse(answerConfigJson);
    return parsed.accepted || [];
  } catch {
    return [];
  }
}
