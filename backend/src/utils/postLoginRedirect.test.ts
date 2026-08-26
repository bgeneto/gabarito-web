import test from "node:test";
import assert from "node:assert/strict";
import {
  resolvePostLoginDestination,
  sanitizePostLoginPath,
} from "./postLoginRedirect.js";

test("sanitizePostLoginPath aceita apenas rotas internas seguras", () => {
  assert.equal(sanitizePostLoginPath("/conta"), "/conta");
  assert.equal(sanitizePostLoginPath("/minhas-provas"), "/minhas-provas");
  assert.equal(sanitizePostLoginPath("/meus-resultados"), "/meus-resultados");
  assert.equal(sanitizePostLoginPath("/criar-prova"), "/criar-prova");
  assert.equal(sanitizePostLoginPath("/admin"), "/admin");
  assert.equal(sanitizePostLoginPath("/"), "/");
  assert.equal(sanitizePostLoginPath("/prova/G26-DNEM9G"), "/prova/G26-DNEM9G");
  assert.equal(sanitizePostLoginPath("/prova/g26-dnem9g"), "/prova/G26-DNEM9G");
  assert.equal(sanitizePostLoginPath("/submissao/a7k9qf"), "/submissao/A7K9QF");

  assert.equal(sanitizePostLoginPath("https://evil.example/"), null);
  assert.equal(sanitizePostLoginPath("//evil.example"), null);
  assert.equal(sanitizePostLoginPath("/superadmin"), null);
  assert.equal(sanitizePostLoginPath("/entrar"), null);
  assert.equal(sanitizePostLoginPath("/auth/verify"), null);
  assert.equal(sanitizePostLoginPath("/prova/../admin"), null);
  assert.equal(sanitizePostLoginPath(""), null);
  assert.equal(sanitizePostLoginPath(undefined), null);
});

test("resolvePostLoginDestination honra intenção explícita e infere o papel", () => {
  assert.equal(
    resolvePostLoginDestination({
      targetRoute: "/meus-resultados",
      examCount: 5,
      submissionCount: 0,
    }),
    "/meus-resultados",
  );

  assert.equal(
    resolvePostLoginDestination({
      targetRoute: "https://evil.example",
      examCount: 2,
      submissionCount: 0,
    }),
    "/minhas-provas",
  );

  assert.equal(
    resolvePostLoginDestination({
      examCount: 0,
      submissionCount: 3,
    }),
    "/meus-resultados",
  );

  assert.equal(
    resolvePostLoginDestination({
      examCount: 1,
      submissionCount: 1,
    }),
    "/conta",
  );

  assert.equal(
    resolvePostLoginDestination({
      examCount: 0,
      submissionCount: 0,
    }),
    "/conta",
  );
});
