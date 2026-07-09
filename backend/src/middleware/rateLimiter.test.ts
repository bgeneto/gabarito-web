import test from "node:test";
import assert from "node:assert";
import { Hono } from "hono";
import {
  MAX_SUBMISSION_ATTEMPTS_PER_EXAM_IP,
  MAX_SUBMISSION_ATTEMPTS_PER_STUDENT,
  resetRateLimitStateForTests,
  submissionRateLimiter,
} from "./rateLimiter.ts";

function postSubmission(
  app: Hono,
  publicCode: string,
  studentIdentifier: string,
) {
  return app.request(`/exams/${publicCode}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_name: "Aluno Teste",
      student_identifier: studentIdentifier,
      answers: {},
    }),
  });
}

function createSubmissionApp(handlerStatus: number) {
  const app = new Hono();
  app.post("/exams/:public_code/submissions", submissionRateLimiter, (c) =>
    c.json({ ok: true }, handlerStatus),
  );
  return app;
}

test("submission rate limiter", async (t) => {
  t.beforeEach(() => {
    resetRateLimitStateForTests();
  });

  await t.test(
    "allows many different students on the same shared IP for one exam",
    async () => {
      const app = createSubmissionApp(201);

      for (let i = 0; i < 25; i++) {
        const response = await postSubmission(app, "G26-SCHOOL", `MAT${i}`);
        assert.strictEqual(
          response.status,
          201,
          `student ${i} should submit successfully on shared Wi-Fi`,
        );
      }
    },
  );

  await t.test("limits retries per student matrícula", async () => {
    const app = createSubmissionApp(201);

    for (let i = 0; i < MAX_SUBMISSION_ATTEMPTS_PER_STUDENT; i++) {
      const response = await postSubmission(app, "G26-SCHOOL", "MAT10");
      assert.strictEqual(response.status, 201, `attempt ${i + 1} should pass`);
    }

    const blocked = await postSubmission(app, "G26-SCHOOL", "MAT10");
    assert.strictEqual(blocked.status, 429);
  });

  await t.test("enforces per-exam shared IP safety cap", async () => {
    const app = createSubmissionApp(201);

    for (let i = 0; i < MAX_SUBMISSION_ATTEMPTS_PER_EXAM_IP; i++) {
      const response = await postSubmission(
        app,
        "G26-SCHOOL",
        `CAP${i.toString().padStart(3, "0")}`,
      );
      assert.strictEqual(response.status, 201, `request ${i + 1} should pass`);
    }

    const blocked = await postSubmission(app, "G26-SCHOOL", "CAP999");
    assert.strictEqual(blocked.status, 429);
  });

  await t.test(
    "does not count 409 responses against either limit tier",
    async () => {
      const app = createSubmissionApp(409);

      for (let i = 0; i < MAX_SUBMISSION_ATTEMPTS_PER_STUDENT + 3; i++) {
        const response = await postSubmission(app, "G26-SCHOOL", "MAT10");
        assert.strictEqual(
          response.status,
          409,
          `409 retry ${i + 1} should pass`,
        );
      }
    },
  );

  await t.test(
    "refunds both tiers after duplicate 409 recovery retries",
    async () => {
      let mode: "success" | "duplicate" = "success";
      const app = new Hono();
      app.post(
        "/exams/:public_code/submissions",
        submissionRateLimiter,
        (c) => {
          if (mode === "duplicate") {
            return c.json(
              {
                error: "Conflito",
                already_submitted: true,
              },
              409,
            );
          }
          return c.json({ ok: true }, 201);
        },
      );

      assert.strictEqual(
        (await postSubmission(app, "G26-SCHOOL", "MAT10")).status,
        201,
      );

      mode = "duplicate";

      for (let i = 0; i < MAX_SUBMISSION_ATTEMPTS_PER_STUDENT + 2; i++) {
        const duplicate = await postSubmission(app, "G26-SCHOOL", "MAT10");
        assert.strictEqual(
          duplicate.status,
          409,
          `409 retry ${i + 1} should pass`,
        );
      }
    },
  );

  await t.test("isolates limits per exam on the same IP", async () => {
    const app = createSubmissionApp(201);

    for (let i = 0; i < MAX_SUBMISSION_ATTEMPTS_PER_STUDENT; i++) {
      const blockedOnExamA = await postSubmission(app, "G26-EXAMA", "MAT10");
      assert.strictEqual(blockedOnExamA.status, 201);
    }

    const blockedOnExamA = await postSubmission(app, "G26-EXAMA", "MAT10");
    assert.strictEqual(blockedOnExamA.status, 429);

    const allowedOnExamB = await postSubmission(app, "G26-EXAMB", "MAT10");
    assert.strictEqual(allowedOnExamB.status, 201);
  });
});
