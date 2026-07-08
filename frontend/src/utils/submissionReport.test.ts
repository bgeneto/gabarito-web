import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSubmissionReportFilename,
  formatAcceptedAnswer,
  formatQuestionLabel,
  formatStudentAnswer,
  type AnswerDetail,
} from "./submissionReport";

const baseAnswer: AnswerDetail = {
  questionNumber: 1,
  subLabel: "a",
  points: 2,
  rawAnswer: "Massa",
  isCorrect: true,
  scoreAwarded: 2,
  answerType: "text_exact",
  acceptedAnswers: ["massa"],
};

describe("submissionReport utils", () => {
  it("formats question labels with optional sublabel", () => {
    assert.equal(formatQuestionLabel(baseAnswer), "Questão 1 A");
    assert.equal(
      formatQuestionLabel({ ...baseAnswer, subLabel: null }),
      "Questão 1",
    );
  });

  it("formats accepted answers by type", () => {
    assert.equal(formatAcceptedAnswer(baseAnswer), "massa");
    assert.equal(
      formatAcceptedAnswer({
        ...baseAnswer,
        answerType: "true_false",
        acceptedAnswers: ["V"],
      }),
      "verdadeiro",
    );
    assert.equal(
      formatAcceptedAnswer({
        ...baseAnswer,
        answerType: "true_false",
        acceptedAnswers: ["F"],
      }),
      "falso",
    );
  });

  it("formats blank student answers", () => {
    assert.equal(formatStudentAnswer("  "), "Em branco");
    assert.equal(formatStudentAnswer("Peso"), "Peso");
  });

  it("builds a safe pdf filename", () => {
    assert.equal(
      buildSubmissionReportFilename({
        id: "A7K9QF",
        student_identifier: "261044910",
        student_name: "Aluno",
        submitted_at: 0,
        exam_title: "Prova",
        total_score: 10,
        answers: [],
      }),
      "gabaritoweb-261044910-A7K9QF.pdf",
    );
  });
});
