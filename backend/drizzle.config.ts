import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabasePath } from "./src/db/databasePath.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  schema: path.resolve(__dirname, "./src/db/schema.ts"),
  out: path.resolve(__dirname, "./drizzle"),
  dialect: "sqlite",
  dbCredentials: {
    url: getDatabasePath(),
  },
});
