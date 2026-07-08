import test from "node:test";
import assert from "node:assert";
import { Hono } from "hono";
import {
  MAX_ADMIN_AUTH_FAILURES_PER_MINUTE,
  MAX_SUPERADMIN_API_REQUESTS_PER_MINUTE,
  MAX_SUPERADMIN_AUTH_FAILURES_PER_MINUTE,
  adminAuthRateLimiter,
  enforceSuperadminRateLimits,
} from "./authRateLimiter.ts";
import { resetRateLimitStateForTests } from "./rateLimiter.ts";

test("admin auth rate limiter", async (t) => {
  t.beforeEach(() => {
    resetRateLimitStateForTests();
  });

  await t.test(
    "counts only 401 responses toward the failure limit",
    async () => {
      let authorized = false;
      const app = new Hono();
      app.post("/api/admin/session", adminAuthRateLimiter, (c) => {
        if (!authorized) {
          return c.json(
            {
              error: "Não autorizado",
              message: "Token administrativo inválido.",
            },
            401,
          );
        }
        return c.json(
          { session_token: "sess_ok", expires_at: Date.now() },
          200,
        );
      });

      for (let i = 0; i < MAX_ADMIN_AUTH_FAILURES_PER_MINUTE; i++) {
        const response = await app.request("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_token: "adm_BADBAD" }),
        });
        assert.strictEqual(
          response.status,
          401,
          `failure ${i + 1} should pass`,
        );
      }

      const blocked = await app.request("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: "adm_BADBAD" }),
      });
      assert.strictEqual(blocked.status, 429);

      authorized = true;
      resetRateLimitStateForTests();
      const success = await app.request("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: "adm_GOOD01" }),
      });
      assert.strictEqual(success.status, 200);
    },
  );

  await t.test(
    "successful admin requests do not consume the failure budget",
    async () => {
      const app = new Hono();
      app.post("/api/admin/session", adminAuthRateLimiter, (c) =>
        c.json({ session_token: "sess_ok", expires_at: Date.now() }, 200),
      );

      for (let i = 0; i < MAX_ADMIN_AUTH_FAILURES_PER_MINUTE + 5; i++) {
        const response = await app.request("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_token: "adm_OK0001" }),
        });
        assert.strictEqual(
          response.status,
          200,
          `success ${i + 1} should pass`,
        );
      }
    },
  );
});

test("superadmin auth rate limiter", async (t) => {
  t.beforeEach(() => {
    resetRateLimitStateForTests();
  });

  await t.test(
    "limits failed superadmin auth attempts separately from API usage",
    async () => {
      let authorized = false;
      const app = new Hono();
      app.get("/api/superadmin/session", enforceSuperadminRateLimits, (c) => {
        if (!authorized) {
          return c.json(
            {
              error: "Não autorizado",
              message: "Token de superadmin inválido.",
            },
            401,
          );
        }
        return c.json({ ok: true }, 200);
      });

      for (let i = 0; i < MAX_SUPERADMIN_AUTH_FAILURES_PER_MINUTE; i++) {
        const response = await app.request("/api/superadmin/session");
        assert.strictEqual(
          response.status,
          401,
          `failure ${i + 1} should pass`,
        );
      }

      const blocked = await app.request("/api/superadmin/session");
      assert.strictEqual(blocked.status, 429);

      authorized = true;
      const success = await app.request("/api/superadmin/session");
      assert.strictEqual(success.status, 200);
    },
  );

  await t.test(
    "authenticated superadmin requests do not consume the failure budget",
    async () => {
      const app = new Hono();
      app.get("/api/superadmin/overview", enforceSuperadminRateLimits, (c) =>
        c.json({ ok: true }, 200),
      );

      for (let i = 0; i < MAX_SUPERADMIN_API_REQUESTS_PER_MINUTE; i++) {
        const response = await app.request("/api/superadmin/overview");
        assert.strictEqual(
          response.status,
          200,
          `request ${i + 1} should pass`,
        );
      }

      const blocked = await app.request("/api/superadmin/overview");
      assert.strictEqual(blocked.status, 429);
    },
  );

  await t.test(
    "failed superadmin auth does not consume the API usage budget",
    async () => {
      let authorized = false;
      const app = new Hono();
      app.get("/api/superadmin/session", enforceSuperadminRateLimits, (c) => {
        if (!authorized) {
          return c.json(
            {
              error: "Não autorizado",
              message: "Token de superadmin inválido.",
            },
            401,
          );
        }
        return c.json({ ok: true }, 200);
      });

      for (let i = 0; i < MAX_SUPERADMIN_AUTH_FAILURES_PER_MINUTE; i++) {
        const response = await app.request("/api/superadmin/session");
        assert.strictEqual(
          response.status,
          401,
          `401 attempt ${i + 1} should pass`,
        );
      }

      for (let i = 0; i < 5; i++) {
        const locked = await app.request("/api/superadmin/session");
        assert.strictEqual(
          locked.status,
          429,
          `locked attempt ${i + 1} should be 429`,
        );
      }

      authorized = true;

      for (let i = 0; i < MAX_SUPERADMIN_API_REQUESTS_PER_MINUTE; i++) {
        const response = await app.request("/api/superadmin/session");
        assert.strictEqual(
          response.status,
          200,
          `authenticated request ${i + 1} should pass`,
        );
      }
    },
  );
});
