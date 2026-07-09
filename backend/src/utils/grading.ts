import { checkAnswer } from "./normalizer.js";
import {
  gradeNumericalAnswer,
  parseNumericalConfigJson,
} from "./numericalGrader.js";

export function gradeItemAnswer(
  item: {
    answerType:
      "choice" | "true_false" | "short_text" | "text_exact" | "numerical";
    points: number;
    answerConfigJson: string;
  },
  rawAnswer: string,
): { isCorrect: boolean; normalizedAnswer: string; scoreAwarded: number } {
  if (item.answerType === "numerical") {
    const config = parseNumericalConfigJson(item.answerConfigJson);
    if (!config) {
      return { isCorrect: false, normalizedAnswer: rawAnswer, scoreAwarded: 0 };
    }
    const { isCorrect, normalizedAnswer } = gradeNumericalAnswer(
      rawAnswer,
      config,
    );
    return {
      isCorrect,
      normalizedAnswer,
      scoreAwarded: isCorrect ? item.points : 0.0,
    };
  }

  const { isCorrect, normalizedAnswer } = checkAnswer(
    rawAnswer,
    item.answerType,
    item.answerConfigJson,
  );

  const scoreAwarded = isCorrect ? item.points : 0.0;
  return { isCorrect, normalizedAnswer, scoreAwarded };
}
