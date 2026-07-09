import type {
  AcceptedUnit,
  NumericalAnswerConfig,
  ParsedNumericalAnswer,
} from "../types/numericalConfig.js";
import { resolveCanonicalUnit } from "../types/numericalConfig.js";
import { normalizeText } from "./normalizer.js";

/**
 * Extracts leading numeric value and optional unit remainder from raw input.
 * Supports comma and dot as decimal separators.
 */
export function extractNumberAndUnit(raw: string): {
  value: number;
  unitRemainder: string;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([+-]?[\d.,]+)\s*(.*)$/s);
  if (!match) return null;

  const numStr = match[1];
  const unitRemainder = (match[2] ?? "").trim();

  const normalizedNum = normalizeDecimalString(numStr);
  const value = Number(normalizedNum);
  if (!Number.isFinite(value)) return null;

  return { value, unitRemainder };
}

function normalizeDecimalString(numStr: string): string {
  const hasComma = numStr.includes(",");
  const hasDot = numStr.includes(".");

  if (hasComma && hasDot) {
    const lastComma = numStr.lastIndexOf(",");
    const lastDot = numStr.lastIndexOf(".");
    const decimalSep = lastComma > lastDot ? "," : ".";
    if (decimalSep === ",") {
      return numStr.replace(/\./g, "").replace(",", ".");
    }
    return numStr.replace(/,/g, "");
  }

  if (hasComma && !hasDot) {
    return numStr.replace(",", ".");
  }

  return numStr;
}

function normalizeUnitAlias(alias: string): string {
  return normalizeText(alias);
}

function matchUnit(
  unitRemainder: string,
  acceptedUnits: AcceptedUnit[],
): AcceptedUnit | null {
  if (!unitRemainder) return null;

  const normalizedRemainder = normalizeUnitAlias(unitRemainder);
  if (!normalizedRemainder) return null;

  for (const unit of acceptedUnits) {
    // The unit id itself is always accepted; aliases are optional extras.
    if (normalizeUnitAlias(unit.unit) === normalizedRemainder) {
      return unit;
    }
    for (const alias of unit.aliases ?? []) {
      if (normalizeUnitAlias(alias) === normalizedRemainder) {
        return unit;
      }
    }
  }

  return null;
}

export function parseNumericalAnswer(
  raw: string,
  config: NumericalAnswerConfig,
): ParsedNumericalAnswer | null {
  const extracted = extractNumberAndUnit(raw);
  if (!extracted) return null;

  const { value, unitRemainder } = extracted;

  if (config.unitRequired) {
    if (!unitRemainder) return null;

    const acceptedUnits = config.acceptedUnits ?? [];
    const matchedUnit = matchUnit(unitRemainder, acceptedUnits);
    if (!matchedUnit) return null;

    return { value, matchedUnit, unitText: unitRemainder };
  }

  if (unitRemainder) {
    const acceptedUnits = config.acceptedUnits ?? [];
    if (acceptedUnits.length > 0) {
      const matchedUnit = matchUnit(unitRemainder, acceptedUnits);
      if (!matchedUnit) return null;
      return { value, matchedUnit, unitText: unitRemainder };
    }
    return null;
  }

  return { value };
}

export function formatCanonicalAnswer(
  canonicalValue: number,
  config: NumericalAnswerConfig,
): string {
  const formatted = formatNumber(canonicalValue);
  const unit = resolveCanonicalUnit(config);
  if (config.unitRequired && unit) {
    return `${formatted} ${unit}`;
  }
  return formatted;
}

function formatNumber(n: number): string {
  return n.toFixed(8).replace(/\.?0+$/, "") || "0";
}
