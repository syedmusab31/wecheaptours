import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({
    connectionString: url,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("✓ Database migrated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
