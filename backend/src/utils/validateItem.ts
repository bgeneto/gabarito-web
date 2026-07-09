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
    if (!c.canonicalUnit || typeof c.canonicalUnit !== "string") {
      return "Questões numéricas com unidade obrigatória precisam de canonicalUnit.";
    }

    if (!Array.isArray(c.acceptedUnits) || c.acceptedUnits.length === 0) {
      return "Informe pelo menos uma unidade aceita.";
    }

    let hasCanonicalEntry = false;

    for (const unit of c.acceptedUnits) {
      if (!unit || typeof unit !== "object") {
        return "Entrada de unidade aceita inválida.";
      }
      if (!unit.unit || typeof unit.unit !== "string") {
        return "Cada unidade aceita precisa de um identificador (unit).";
      }
      if (
        typeof unit.unitToCanonical !== "number" ||
        !Number.isFinite(unit.unitToCanonical) ||
        unit.unitToCanonical <= 0
      ) {
        return `O fator unitToCanonical de "${unit.unit}" deve ser um número finito positivo.`;
      }
      if (!Array.isArray(unit.aliases) || unit.aliases.length === 0) {
        return `A unidade "${unit.unit}" precisa de pelo menos um alias.`;
      }
      for (const alias of unit.aliases) {
        if (typeof alias !== "string" || !alias.trim()) {
          return `Alias inválido na unidade "${unit.unit}".`;
        }
      }
      if (unit.unit === c.canonicalUnit && unit.unitToCanonical === 1) {
        hasCanonicalEntry = true;
      }
    }

    if (!hasCanonicalEntry) {
      return "Inclua a unidade canônica com unitToCanonical = 1.";
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
