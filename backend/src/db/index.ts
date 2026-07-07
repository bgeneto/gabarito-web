import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { getDatabasePath } from "./databasePath.js";
import * as schema from "./schema.js";

const dbPath = getDatabasePath();

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

export function pingDatabase(): void {
  sqlite.prepare("SELECT 1").get();
}
