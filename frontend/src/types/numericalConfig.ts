export interface AcceptedUnit {
  unit: string;
  unitToCanonical: number;
  aliases: string[];
}

export interface NumericalTolerance {
  relative?: number;
  absolute?: number;
}

export interface NumericalAnswerConfig {
  value: number;
  unitRequired: boolean;
  canonicalUnit?: string;
  acceptedUnits?: AcceptedUnit[];
  tolerance: NumericalTolerance;
}

/** Empty string = user cleared the field (mobile-friendly number inputs). */
export type NumberDraft = number | "";

export interface AcceptedUnitInput {
  unit: string;
  unitToCanonical: NumberDraft;
  aliases: string[];
  tempAlias: string;
}

export const DEFAULT_NUMERICAL_CONFIG = {
  numericalValue: "" as NumberDraft,
  unitRequired: false,
  toleranceKind: "absolute" as const,
  toleranceValue: 0.01 as NumberDraft,
  acceptedUnits: [] as AcceptedUnitInput[],
};

/** Unit with factor 1 is the reference (canonical) frame. */
export function resolveCanonicalUnit(
  config: Pick<NumericalAnswerConfig, "canonicalUnit" | "acceptedUnits">,
): string | undefined {
  if (config.canonicalUnit?.trim()) {
    return config.canonicalUnit.trim();
  }
  const factorOne = config.acceptedUnits?.find((u) => u.unitToCanonical === 1);
  return factorOne?.unit?.trim() || undefined;
}

export function buildNumericalAnswerConfig(item: {
  numericalValue: NumberDraft;
  unitRequired: boolean;
  toleranceKind: "relative" | "absolute";
  toleranceValue: NumberDraft;
  acceptedUnits: AcceptedUnitInput[];
}): NumericalAnswerConfig {
  const config: NumericalAnswerConfig = {
    value: Number(item.numericalValue),
    unitRequired: item.unitRequired,
    tolerance:
      item.toleranceKind === "relative"
        ? { relative: Number(item.toleranceValue) }
        : { absolute: Number(item.toleranceValue) },
  };

  if (item.unitRequired) {
    config.acceptedUnits = item.acceptedUnits.map((u) => ({
      unit: u.unit.trim(),
      unitToCanonical: Number(u.unitToCanonical),
      aliases: u.aliases,
    }));
    const factorOne = config.acceptedUnits.find((u) => u.unitToCanonical === 1);
    if (factorOne) {
      config.canonicalUnit = factorOne.unit;
    }
  }

  return config;
}

export function parseNumericalConfigToForm(config: NumericalAnswerConfig): {
  numericalValue: NumberDraft;
  unitRequired: boolean;
  toleranceKind: "relative" | "absolute";
  toleranceValue: NumberDraft;
  acceptedUnits: AcceptedUnitInput[];
} {
  const toleranceKind =
    config.tolerance?.relative != null ? "relative" : "absolute";
  const toleranceValue: NumberDraft =
    toleranceKind === "relative"
      ? (config.tolerance.relative ?? 0.005)
      : (config.tolerance.absolute ?? 0.01);

  return {
    numericalValue: config.value ?? "",
    unitRequired: config.unitRequired ?? false,
    toleranceKind,
    toleranceValue,
    acceptedUnits: (config.acceptedUnits ?? []).map((u) => ({
      unit: u.unit,
      unitToCanonical: u.unitToCanonical,
      aliases: u.aliases ?? [],
      tempAlias: "",
    })),
  };
}

export function formatNumericalExpectedLabel(
  config: NumericalAnswerConfig,
): string {
  const valueStr = String(config.value);
  const unit = resolveCanonicalUnit(config);
  if (config.unitRequired && unit) {
    const tol = config.tolerance;
    if (tol.relative != null) {
      const pct = (tol.relative * 100).toFixed(1).replace(/\.0$/, "");
      return `${valueStr} ${unit} (±${pct}%)`;
    }
    if (tol.absolute != null) {
      return `${valueStr} ${unit} (±${tol.absolute})`;
    }
    return `${valueStr} ${unit}`;
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

/**
 * Half-width of the accepted interval — mirrors backend `computeToleranceDelta`.
 * Relative: δ = relative × |expected| (null when expected is 0).
 * Absolute: δ = absolute.
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

/** Inclusive accepted interval in the canonical value space. */
export function computeAcceptedValueRange(
  expected: number,
  tolerance: NumericalTolerance,
): { min: number; max: number } | null {
  const delta = computeToleranceDelta(expected, tolerance);
  if (delta == null) return null;
  return { min: expected - delta, max: expected + delta };
}

/**
 * Accepted interval in a given unit's scale (`canonical / unitToCanonical`).
 * Mirrors backend `computeAcceptedValueRangeForUnit`.
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

/** Trim float noise for teacher-facing range labels. */
export function formatToleranceRangeNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Object.is(n, -0) || n === 0) return "0";
  const rounded = Number(n.toPrecision(12));
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

/**
 * Teacher hint: "Valores aceitos: [9.99, 10.01]" (optional unit suffix).
 * Returns null when inputs are incomplete or relative+zero (invalid).
 */
export function formatAcceptedValueRangeHint(
  expected: number,
  tolerance: NumericalTolerance,
  unit?: string,
): string | null {
  const range = computeAcceptedValueRange(expected, tolerance);
  if (!range) return null;
  const minStr = formatToleranceRangeNumber(range.min);
  const maxStr = formatToleranceRangeNumber(range.max);
  const unitSuffix = unit?.trim() ? ` ${unit.trim()}` : "";
  return `Valores aceitos: [${minStr}, ${maxStr}]${unitSuffix}`;
}

/**
 * Same hint in an alternate unit's scale (`canonical / unitToCanonical`).
 */
export function formatAcceptedValueRangeHintForUnit(
  expected: number,
  tolerance: NumericalTolerance,
  unitToCanonical: number,
  unitLabel?: string,
): string | null {
  const range = computeAcceptedValueRangeForUnit(
    expected,
    tolerance,
    unitToCanonical,
  );
  if (!range) return null;
  const minStr = formatToleranceRangeNumber(range.min);
  const maxStr = formatToleranceRangeNumber(range.max);
  const unitSuffix = unitLabel?.trim() ? ` ${unitLabel.trim()}` : "";
  return `Valores aceitos: [${minStr}, ${maxStr}]${unitSuffix}`;
}
