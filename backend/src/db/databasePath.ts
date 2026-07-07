import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Local dev SQLite file (host `npm run dev` and Docker dev both use data/dev/). */
export const DEFAULT_DATABASE_PATH = path.resolve(
  __dirname,
  "../../../data/dev/gabarito.db",
);

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH;
}
