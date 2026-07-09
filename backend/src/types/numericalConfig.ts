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

export interface ParsedNumericalAnswer {
  value: number;
  matchedUnit?: AcceptedUnit;
  unitText?: string;
}
