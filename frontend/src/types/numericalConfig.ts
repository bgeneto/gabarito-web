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
