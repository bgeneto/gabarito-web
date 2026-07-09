import type { NumericalAnswerConfig } from "../types/numericalConfig.js";

// "text_exact" is the legacy alias of "short_text"; accepted so rows not yet
// migrated still validate on read/normalize paths.
export const VALID_ANSWER_TYPES = [
  "choice",
  "true_false",
  "short_text",
  "text_exact",
  "numerical",
] as const;

export type AnswerType = (typeof VALID_ANSWER_TYPES)[number];

function validateNumericalConfig(config: unknown): string | null {
  if (!config || typeof config !== "object") {
    return "Configuração numérica inválida.";
  }

  const c = config as NumericalAnswerConfig;

  if (typeof c.value !== "number" || !Number.isFinite(c.value)) {
    return "O valor esperado da questão numérica deve ser um número finito.";
  }

  if (typeof c.unitRequired !== "boolean") {
    return "O campo unitRequired é obrigatório para questões numéricas.";
  }

  const hasRelative =
    c.tolerance?.relative != null && typeof c.tolerance.relative === "number";
  const hasAbsolute =
    c.tolerance?.absolute != null && typeof c.tolerance.absolute === "number";

  if (hasRelative && hasAbsolute) {
    return "Informe apenas tolerância relativa ou absoluta, não ambas.";
  }

  if (!hasRelative && !hasAbsolute) {
    return "A questão numérica precisa de tolerância relativa ou absoluta.";
  }

  if (hasRelative) {
    const rel = c.tolerance!.relative!;
    if (!Number.isFinite(rel) || rel < 0) {
      return "A tolerância relativa deve ser um número finito não negativo.";
    }
    if (c.value === 0 && !hasAbsolute) {
      return "Valor esperado zero exige tolerância absoluta (relativa não se aplica).";
    }
  }

  if (hasAbsolute) {
    const abs = c.tolerance!.absolute!;
    if (!Number.isFinite(abs) || abs < 0) {
      return "A tolerância absoluta deve ser um número finito não negativo.";
    }
  }

  if (c.unitRequired) {
    if (!Array.isArray(c.acceptedUnits) || c.acceptedUnits.length === 0) {
      return "Informe pelo menos uma unidade aceita.";
    }

    let factorOneUnit: string | null = null;
    let factorOneCount = 0;

    for (const unit of c.acceptedUnits) {
      if (!unit || typeof unit !== "object") {
        return "Entrada de unidade aceita inválida.";
      }
      if (!unit.unit || typeof unit.unit !== "string" || !unit.unit.trim()) {
        return "Cada unidade aceita precisa de um identificador (unit).";
      }
      if (
        typeof unit.unitToCanonical !== "number" ||
        !Number.isFinite(unit.unitToCanonical) ||
        unit.unitToCanonical <= 0
      ) {
        return `O fator unitToCanonical de "${unit.unit}" deve ser um número finito positivo.`;
      }
      if (unit.aliases != null && !Array.isArray(unit.aliases)) {
        return `Aliases da unidade "${unit.unit}" devem ser uma lista.`;
      }
      for (const alias of unit.aliases ?? []) {
        if (typeof alias !== "string" || !alias.trim()) {
          return `Unidade alt. inválida em "${unit.unit}".`;
        }
      }
      if (unit.unitToCanonical === 1) {
        factorOneCount += 1;
        factorOneUnit = unit.unit;
      }
    }

    if (factorOneCount === 0) {
      return "Defina exatamente uma unidade com unitToCanonical = 1 (unidade canônica).";
    }
    if (factorOneCount > 1) {
      return "Apenas uma unidade aceita pode ter unitToCanonical = 1.";
    }

    // Legacy clients may still send canonicalUnit; if present it must match.
    if (
      c.canonicalUnit != null &&
      typeof c.canonicalUnit === "string" &&
      c.canonicalUnit.trim() !== "" &&
      c.canonicalUnit !== factorOneUnit
    ) {
      return "canonicalUnit deve coincidir com a unidade que tem unitToCanonical = 1.";
    }
  } else if (c.acceptedUnits != null && c.acceptedUnits.length > 0) {
    return "acceptedUnits só deve ser informado quando unitRequired é true.";
  }

  return null;
}

export function validateItemFields(item: {
  points: number;
  answer_type: string;
  answer_config: Record<string, unknown>;
}): string | null {
  const points = Number(item.points);
  if (isNaN(points) || points <= 0) {
    return "A pontuação do item deve ser maior que zero.";
  }

  if (!VALID_ANSWER_TYPES.includes(item.answer_type as AnswerType)) {
    return "Tipo de resposta inválido.";
  }

  if (item.answer_type === "numerical") {
    return validateNumericalConfig(item.answer_config);
  }

  const accepted = item.answer_config?.accepted;
  if (!Array.isArray(accepted) || accepted.length === 0) {
    return "O item precisa de pelo menos uma resposta correta.";
  }

  return null;
}
