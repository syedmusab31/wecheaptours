import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool } from "./pool";
import { env } from "@/config/env";

async function main() {
  const pool = createPool(env.DATABASE_URL, { max: 1 });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("✓ Database migrated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
