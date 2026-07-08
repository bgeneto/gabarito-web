// "text_exact" is the legacy alias of "short_text"; accepted so rows not yet
// migrated still validate on read/normalize paths.
const VALID_ANSWER_TYPES = [
  "choice",
  "true_false",
  "short_text",
  "text_exact",
] as const;

export function validateItemFields(item: {
  points: number;
  answer_type: string;
  answer_config: { accepted: string[] };
}): string | null {
  const points = Number(item.points);
  if (isNaN(points) || points <= 0) {
    return "A pontuação do item deve ser maior que zero.";
  }

  if (
    !VALID_ANSWER_TYPES.includes(
      item.answer_type as (typeof VALID_ANSWER_TYPES)[number],
    )
  ) {
    return "Tipo de resposta inválido.";
  }

  const accepted = item.answer_config?.accepted;
  if (!Array.isArray(accepted) || accepted.length === 0) {
    return "O item precisa de pelo menos uma resposta correta.";
  }

  return null;
}
