/**
 * Lockout recovery, run on a machine with the production DATABASE_URL (never from the website):
 *
 *   npm run admin:recover -- owner@old-domain.com --email you@new-domain.com
 *   npm run admin:recover -- owner@example.com --password "a new long password"
 *   npm run admin:recover -- owner@example.com --activate
 *
 * Sign-in codes go to the account's email, so changing the email is how an owner who lost their
 * mailbox gets back in. Every change signs out all existing sessions and remembered devices.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { createPool } from "@/server/db/pool";
import { adminUsers } from "@/server/db/schema";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email || email.startsWith("--"))
    throw new Error(
      "Usage: npm run admin:recover -- <account email> [--email new] [--password new] [--activate]",
    );
  const newEmail = arg("email")?.toLowerCase();
  const newPassword = arg("password");
  if (newPassword && newPassword.length < 10)
    throw new Error("The new password needs at least 10 characters.");
  if (!newEmail && !newPassword && !process.argv.includes("--activate"))
    throw new Error("Nothing to change.");

  const pool = createPool(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(pool);
  const [user] = await db
    .update(adminUsers)
    .set({
      ...(newEmail ? { email: newEmail } : {}),
      ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 10) } : {}),
      ...(process.argv.includes("--activate") ? { isActive: true } : {}),
      sessionVersion: sql`${adminUsers.sessionVersion} + 1`,
    })
    .where(eq(adminUsers.email, email))
    .returning({ email: adminUsers.email, role: adminUsers.role, isActive: adminUsers.isActive });
  await pool.end();
  if (!user) throw new Error(`No admin account with the email ${email}.`);
  console.log(
    `✓ ${user.email} (${user.role}${user.isActive ? "" : ", disabled"}) updated. All its sessions were signed out.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
