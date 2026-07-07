import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabasePath } from "./databasePath.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = getDatabasePath();
const dataDir = path.dirname(dbPath);
const migrationsFolder = path.resolve(__dirname, "../../drizzle");

function log(message: string) {
  console.log(`[gabarito-api] ${message}`);
}

function fail(message: string, error?: unknown): never {
  console.error(`[gabarito-api] ${message}`);
  if (error !== undefined) {
    console.error(error);
  }
  process.exit(1);
}

try {
  fs.mkdirSync(dataDir, { recursive: true });
  const probe = path.join(dataDir, ".write-test");
  fs.writeFileSync(probe, "");
  fs.unlinkSync(probe);
} catch (error) {
  fail(`Data directory is not writable: ${dataDir}`, error);
}

let sqlite: Database.Database;
try {
  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
} catch (error) {
  fail(`Unable to open database: ${dbPath}`, error);
}

try {
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder });
  log("Migrations applied successfully.");
} catch (error) {
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    fail(
      `Migration failed for ${dbPath} (size=${stats.size} bytes, uid=${stats.uid}, gid=${stats.gid})`,
      error,
    );
  }
  fail("Migration failed.", error);
} finally {
  sqlite.close();
}
