export function questionLabel(
  questionNumber: number,
  subLabel: string | null,
): string {
  return subLabel
    ? `Q${questionNumber}${subLabel.toUpperCase()}`
    : `Q${questionNumber}`;
}

export function formatExamDate(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatExamDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(ms / 60000)}min`;
}

export function answerTypeLabel(answerType: string): string {
  if (answerType === "choice") return "Múltipla Escolha";
  if (answerType === "true_false") return "Verd. ou Falso";
  if (answerType === "short_text") return "Texto Curto";
  return answerType;
}
