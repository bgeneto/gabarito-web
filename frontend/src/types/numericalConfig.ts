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

export interface AcceptedUnitInput {
  unit: string;
  unitToCanonical: number;
  aliases: string[];
  tempAlias: string;
}

export const DEFAULT_NUMERICAL_CONFIG = {
  numericalValue: 0,
  unitRequired: false,
  canonicalUnit: "",
  toleranceKind: "absolute" as const,
  toleranceValue: 0.01,
  acceptedUnits: [] as AcceptedUnitInput[],
};

export function buildNumericalAnswerConfig(item: {
  numericalValue: number;
  unitRequired: boolean;
  canonicalUnit: string;
  toleranceKind: "relative" | "absolute";
  toleranceValue: number;
  acceptedUnits: AcceptedUnitInput[];
}): NumericalAnswerConfig {
  const config: NumericalAnswerConfig = {
    value: item.numericalValue,
    unitRequired: item.unitRequired,
    tolerance:
      item.toleranceKind === "relative"
        ? { relative: item.toleranceValue }
        : { absolute: item.toleranceValue },
  };

  if (item.unitRequired) {
    config.canonicalUnit = item.canonicalUnit.trim();
    config.acceptedUnits = item.acceptedUnits.map((u) => ({
      unit: u.unit.trim(),
      unitToCanonical: u.unitToCanonical,
      aliases: u.aliases,
    }));
  }

  return config;
}

export function parseNumericalConfigToForm(config: NumericalAnswerConfig): {
  numericalValue: number;
  unitRequired: boolean;
  canonicalUnit: string;
  toleranceKind: "relative" | "absolute";
  toleranceValue: number;
  acceptedUnits: AcceptedUnitInput[];
} {
  const toleranceKind =
    config.tolerance?.relative != null ? "relative" : "absolute";
  const toleranceValue =
    toleranceKind === "relative"
      ? (config.tolerance.relative ?? 0.005)
      : (config.tolerance.absolute ?? 0.01);

  return {
    numericalValue: config.value ?? 0,
    unitRequired: config.unitRequired ?? false,
    canonicalUnit: config.canonicalUnit ?? "",
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
