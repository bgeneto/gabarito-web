import test from "node:test";
import assert from "node:assert";
import {
  normalizeText,
  normalizeTrueFalse,
  normalizeChoice,
  checkAnswer,
} from "./normalizer.js";

test("normalizer pipeline", async (t) => {
  await t.test("normalizeText converts accents, whitespace, and case", () => {
    assert.strictEqual(normalizeText("  À mesma. "), "A MESMA.");
    assert.strictEqual(
      normalizeText("  Múltiplos    espaços  "),
      "MULTIPLOS ESPACOS",
    );
    assert.strictEqual(normalizeText("Ação e Reação"), "ACAO E REACAO");
    assert.strictEqual(normalizeText("corações"), "CORACOES");
  });

  await t.test("normalizeTrueFalse mapping", () => {
    // True values
    assert.strictEqual(normalizeTrueFalse("verdadeiro"), "V");
    assert.strictEqual(normalizeTrueFalse("sim"), "V");
    assert.strictEqual(normalizeTrueFalse("true"), "V");
    assert.strictEqual(normalizeTrueFalse("T"), "V");
    assert.strictEqual(normalizeTrueFalse("v"), "V");

    // False values
    assert.strictEqual(normalizeTrueFalse("falso"), "F");
    assert.strictEqual(normalizeTrueFalse("false"), "F");
    assert.strictEqual(normalizeTrueFalse("nao"), "F");
    assert.strictEqual(normalizeTrueFalse("n"), "F");
    assert.strictEqual(normalizeTrueFalse("f"), "F");

    // Invalid values
    assert.strictEqual(normalizeTrueFalse("talvez"), null);
    assert.strictEqual(normalizeTrueFalse(""), null);
  });

  await t.test("normalizeChoice mapping", () => {
    assert.strictEqual(normalizeChoice("a"), "A");
    assert.strictEqual(normalizeChoice(" A "), "A");
    assert.strictEqual(normalizeChoice("A, B"), "AB");
    assert.strictEqual(normalizeChoice("123 A 456"), "A");
  });

  await t.test("checkAnswer choice comparison", () => {
    const config = JSON.stringify({ accepted: ["A", "B"] });

    // Correct
    const result1 = checkAnswer("a", "choice", config);
    assert.strictEqual(result1.isCorrect, true);
    assert.strictEqual(result1.normalizedAnswer, "A");

    // Incorrect
    const result2 = checkAnswer("C", "choice", config);
    assert.strictEqual(result2.isCorrect, false);
    assert.strictEqual(result2.normalizedAnswer, "C");
  });

  await t.test("checkAnswer true_false comparison", () => {
    const config = JSON.stringify({ accepted: ["V"] });

    // Correct
    const result1 = checkAnswer("verdadeiro", "true_false", config);
    assert.strictEqual(result1.isCorrect, true);
    assert.strictEqual(result1.normalizedAnswer, "V");

    // Incorrect
    const result2 = checkAnswer("falso", "true_false", config);
    assert.strictEqual(result2.isCorrect, false);
    assert.strictEqual(result2.normalizedAnswer, "F");

    // Invalid option
    const result3 = checkAnswer("invalido", "true_false", config);
    assert.strictEqual(result3.isCorrect, false);
    assert.strictEqual(result3.normalizedAnswer, "INVALIDO");
  });

  await t.test("checkAnswer short_text comparison", () => {
    const config = JSON.stringify({ accepted: ["massa", "peso real"] });

    // Correct
    const result1 = checkAnswer("  mássa  ", "short_text", config);
    assert.strictEqual(result1.isCorrect, true);
    assert.strictEqual(result1.normalizedAnswer, "MASSA");

    const result2 = checkAnswer("peso   real", "short_text", config);
    assert.strictEqual(result2.isCorrect, true);
    assert.strictEqual(result2.normalizedAnswer, "PESO REAL");

    // Incorrect
    const result3 = checkAnswer("volume", "short_text", config);
    assert.strictEqual(result3.isCorrect, false);
    assert.strictEqual(result3.normalizedAnswer, "VOLUME");
  });
});
