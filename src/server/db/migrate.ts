import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDirectPool } from "./pool";

/** Applies the SQL files in drizzle/ that this database hasn't run yet, in order. Needs only DATABASE_URL; uses the direct address. */
async function main() {
  const pool = createDirectPool();
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("✓ Database migrated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
