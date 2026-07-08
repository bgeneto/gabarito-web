import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../drizzle");

test("drizzle migrations have no empty statements", () => {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"));

  assert.ok(files.length > 0, "expected at least one migration file");

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const segments = sql.split("--> statement-breakpoint");

    segments.forEach((segment, index) => {
      assert.notStrictEqual(
        segment.trim(),
        "",
        `${file}: empty SQL segment at position ${index} (likely a trailing "--> statement-breakpoint"); Drizzle would fail with "The supplied SQL string contains no statements".`,
      );
    });
  }
});
