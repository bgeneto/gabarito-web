import type { Context } from "hono";

export function internalServerError(
  c: Context,
  logLabel: string,
  error: unknown,
) {
  console.error(logLabel, error);
  return c.json({ error: "Erro interno do servidor" }, 500);
}
