import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool } from "./pool";

/** Applies the SQL files in drizzle/ that this database hasn't run yet, in order. Needs only DATABASE_URL. */
async function main() {
  const pool = createPool(undefined, { max: 1 });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("✓ Database migrated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
