import { checkAnswer } from "./normalizer.js";

export function gradeItemAnswer(
  item: {
    answerType: "choice" | "true_false" | "short_text" | "text_exact";
    points: number;
    answerConfigJson: string;
  },
  rawAnswer: string,
): { isCorrect: boolean; normalizedAnswer: string; scoreAwarded: number } {
  const { isCorrect, normalizedAnswer } = checkAnswer(
    rawAnswer,
    item.answerType,
    item.answerConfigJson,
  );

  const scoreAwarded = isCorrect ? item.points : 0.0;
  return { isCorrect, normalizedAnswer, scoreAwarded };
}
