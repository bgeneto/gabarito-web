import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLoginPath,
  sanitizePostLoginPath,
  withUserAuthHeaders,
} from "./postLoginRedirect.ts";

test("sanitizePostLoginPath aceita apenas rotas internas seguras", () => {
  assert.equal(sanitizePostLoginPath("/conta"), "/conta");
  assert.equal(sanitizePostLoginPath("/meus-resultados"), "/meus-resultados");
  assert.equal(sanitizePostLoginPath("/prova/G26-ABC123"), "/prova/G26-ABC123");
  assert.equal(sanitizePostLoginPath("/prova/g26-abc123"), "/prova/G26-ABC123");
  assert.equal(sanitizePostLoginPath("//evil.example"), null);
  assert.equal(sanitizePostLoginPath("/superadmin"), null);
  assert.equal(sanitizePostLoginPath("/entrar?redirect=/conta"), null);
});

test("buildLoginPath preserva destinos úteis e ignora a home", () => {
  assert.equal(
    buildLoginPath("/meus-resultados"),
    "/entrar?redirect=%2Fmeus-resultados",
  );
  assert.equal(
    buildLoginPath("/prova/G26-ABC123"),
    "/entrar?redirect=%2Fprova%2FG26-ABC123",
  );
  assert.equal(buildLoginPath("/"), "/entrar");
  assert.equal(buildLoginPath("/conta"), "/entrar?redirect=%2Fconta");
  assert.equal(buildLoginPath("https://evil.example"), "/entrar");
});

test("withUserAuthHeaders só envia Bearer quando há sessão", () => {
  const withToken = withUserAuthHeaders("abc", {
    "Content-Type": "application/json",
  });
  assert.equal(withToken.get("Authorization"), "Bearer abc");
  assert.equal(withToken.get("Content-Type"), "application/json");

  const anonymous = withUserAuthHeaders(null, {
    "Content-Type": "application/json",
  });
  assert.equal(anonymous.get("Authorization"), null);
});
