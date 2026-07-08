/**
 * Pipeline de Normalização Comum (Texto Geral)
 * 1. Trim
 * 2. Unicode NFD
 * 3. Remoção de Diacríticos (acentos)
 * 4. Substituição de Ç por C
 * 5. Conversão para Maiúsculas
 * 6. Colapso de múltiplos espaços consecutivos em um único espaço
 */
/** Canonical form for student matrícula / identifier (dedup + rate-limit keys). */
export function normalizeStudentIdentifier(identifier: string): string {
  return normalizeText(identifier);
}

export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c")
    .toUpperCase()
    .replace(/\s+/g, " "); // colapsa múltiplos espaços
}

/**
 * Normaliza e classifica respostas de Verdadeiro ou Falso (V/F)
 */
export function normalizeTrueFalse(text: string): "V" | "F" | null {
  const norm = normalizeText(text);

  const trueValues = ["V", "VERDADEIRO", "VERDADE", "SIM", "S", "TRUE", "T"];
  const falseValues = ["F", "FALSO", "FALSE", "FA", "NAO", "N"];

  if (trueValues.includes(norm)) {
    return "V";
  }
  if (falseValues.includes(norm)) {
    return "F";
  }

  return null; // Caso não seja reconhecido
}

/**
 * Normaliza respostas de Múltipla Escolha (Choice)
 */
export function normalizeChoice(text: string): string {
  const norm = normalizeText(text);
  // Remove tudo que não for letra (A-Z)
  return norm.replace(/[^A-Z]/g, "");
}

/**
 * Compara a resposta do aluno com o gabarito baseado no tipo
 */
export function checkAnswer(
  rawAnswer: string,
  answerType: "choice" | "true_false" | "text_exact",
  answerConfigJson: string,
): { isCorrect: boolean; normalizedAnswer: string } {
  let config: { accepted: string[] };
  try {
    config = JSON.parse(answerConfigJson);
  } catch (e) {
    config = { accepted: [] };
  }

  const acceptedList = config.accepted || [];

  if (answerType === "choice") {
    const studentNorm = normalizeChoice(rawAnswer);
    const normalizedAccepted = acceptedList.map((v) => normalizeChoice(v));
    const isCorrect =
      normalizedAccepted.includes(studentNorm) && studentNorm !== "";
    return { isCorrect, normalizedAnswer: studentNorm };
  }

  if (answerType === "true_false") {
    const studentTF = normalizeTrueFalse(rawAnswer);
    if (!studentTF) {
      return { isCorrect: false, normalizedAnswer: normalizeText(rawAnswer) };
    }
    const normalizedAccepted = acceptedList
      .map((v) => normalizeTrueFalse(v))
      .filter(Boolean);
    const isCorrect = normalizedAccepted.includes(studentTF as "V" | "F");
    return { isCorrect, normalizedAnswer: studentTF };
  }

  if (answerType === "text_exact") {
    const studentNorm = normalizeText(rawAnswer);
    const normalizedAccepted = acceptedList.map((v) => normalizeText(v));
    const isCorrect =
      normalizedAccepted.includes(studentNorm) && studentNorm !== "";
    return { isCorrect, normalizedAnswer: studentNorm };
  }

  return { isCorrect: false, normalizedAnswer: rawAnswer };
}
