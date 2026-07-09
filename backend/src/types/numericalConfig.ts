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
  /** Derived from the unique acceptedUnits entry with unitToCanonical === 1. */
  canonicalUnit?: string;
  acceptedUnits?: AcceptedUnit[];
  tolerance: NumericalTolerance;
}

export interface ParsedNumericalAnswer {
  value: number;
  matchedUnit?: AcceptedUnit;
  unitText?: string;
}

/** Prefer stored canonicalUnit; otherwise the sole factor-1 accepted unit. */
export function resolveCanonicalUnit(
  config: Pick<NumericalAnswerConfig, "canonicalUnit" | "acceptedUnits">,
): string | undefined {
  if (config.canonicalUnit?.trim()) {
    return config.canonicalUnit.trim();
  }
  const factorOne = config.acceptedUnits?.find((u) => u.unitToCanonical === 1);
  return factorOne?.unit?.trim() || undefined;
}

/**
 * Ensures canonicalUnit matches the unique factor-1 accepted unit.
 * Call after validateItemFields succeeds for numerical configs.
 */
export function normalizeNumericalAnswerConfig(
  config: NumericalAnswerConfig,
): NumericalAnswerConfig {
  if (!config.unitRequired || !config.acceptedUnits?.length) {
    return config;
  }
  const factorOne = config.acceptedUnits.find((u) => u.unitToCanonical === 1);
  if (!factorOne) {
    return config;
  }
  return { ...config, canonicalUnit: factorOne.unit };
}
