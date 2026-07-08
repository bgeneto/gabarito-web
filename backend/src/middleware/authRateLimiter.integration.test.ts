import test from "node:test";
import assert from "node:assert";
import { Hono } from "hono";
import { accessLogger } from "./accessLogger.ts";
import {
  MAX_ADMIN_AUTH_FAILURES_PER_MINUTE,
  adminAuthRateLimiter,
} from "./authRateLimiter.ts";
import { resetRateLimitStateForTests } from "./rateLimiter.ts";

test("admin auth rate limiter with production middleware order", async (t) => {
  t.beforeEach(() => {
    resetRateLimitStateForTests();
  });

  await t.test(
    "blocks after 20 failures when accessLogger runs first",
    async () => {
      const statuses: number[] = [];
      const app = new Hono();
      app.use("/api/*", accessLogger);
      app.use("/api/admin/*", adminAuthRateLimiter);
      app.get("/api/admin/exams/:admin_token", async (c) => {
        return c.json(
          {
            error: "Não autorizado",
            message: "Token administrativo inválido.",
          },
          401,
        );
      });

      for (let i = 0; i < MAX_ADMIN_AUTH_FAILURES_PER_MINUTE + 2; i++) {
        const response = await app.request("/api/admin/exams/adm_BADBAD");
        statuses.push(response.status);
      }

      assert.ok(
        statuses
          .slice(0, MAX_ADMIN_AUTH_FAILURES_PER_MINUTE)
          .every((s) => s === 401),
        `expected first ${MAX_ADMIN_AUTH_FAILURES_PER_MINUTE} to be 401, got ${statuses.join(",")}`,
      );
      assert.ok(
        statuses
          .slice(MAX_ADMIN_AUTH_FAILURES_PER_MINUTE)
          .every((s) => s === 429),
        `expected lockout responses to be 429, got ${statuses.join(",")}`,
      );

      const blocked = await app.request("/api/admin/exams/adm_BADBAD");
      assert.strictEqual(blocked.headers.get("cache-control"), "no-store");
    },
  );
});
