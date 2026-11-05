import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { directDatabaseUrl } from "./src/server/db/direct-url";

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Schema tools connect directly, never through Neon's pooler
  dbCredentials: { url: directDatabaseUrl(process.env.DATABASE_URL ?? "") },
});
