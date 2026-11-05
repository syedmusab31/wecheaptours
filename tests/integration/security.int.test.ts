import { beforeEach, expect, it } from "vitest";
import { describeDb, resetDatabase } from "./helpers";

describeDb("rate limiting", () => {
  beforeEach(resetDatabase);

  it("allows the budget, then throws with a retry time", async () => {
    const { enforceRateLimit } = await import("@/server/security/rate-limit");
    for (let i = 0; i < 5; i++) await enforceRateLimit("login", "1.2.3.4", "a@b.com");
    const err = await enforceRateLimit("login", "1.2.3.4", "a@b.com").catch((e) => e);
    expect(err).toMatchObject({ status: 429 });
    expect(err.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate budgets per IP and per email", async () => {
    const { enforceRateLimit } = await import("@/server/security/rate-limit");
    for (let i = 0; i < 5; i++) await enforceRateLimit("login", "1.2.3.4", "a@b.com");
    await expect(enforceRateLimit("login", "1.2.3.4", "other@b.com")).resolves.toBeUndefined();
    await expect(enforceRateLimit("login", "5.6.7.8", "a@b.com")).resolves.toBeUndefined();
  });
});

describeDb("admin sessions and staff", () => {
  beforeEach(resetDatabase);

  async function setup() {
    const auth = await import("@/features/identity/server/auth.service");
    const { verifySession } = await import("@/features/identity/server/session");
    const repo = await import("@/features/identity/server/admin-user.repository");
    const owner = await auth.addAdmin({
      email: "owner@x.com",
      name: "O",
      password: "correct horse 1",
      role: "owner",
    });
    return { auth, verifySession, repo, owner };
  }

  it("issues a session carrying the role and version", async () => {
    const { auth, verifySession } = await setup();
    const session = await verifySession(await auth.login("owner@x.com", "correct horse 1"));
    expect(session).toMatchObject({ email: "owner@x.com", role: "owner", ver: 1 });
  });

  it("rejects wrong passwords and disabled accounts with the same message", async () => {
    const { auth, repo, owner } = await setup();
    await expect(auth.login("owner@x.com", "nope")).rejects.toThrow("Email or password is incorrect.");
    await expect(auth.login("ghost@x.com", "nope")).rejects.toThrow("Email or password is incorrect.");
    await repo.updateAdmin(owner.id, { isActive: false });
    await expect(auth.login("owner@x.com", "correct horse 1")).rejects.toThrow(
      "Email or password is incorrect.",
    );
  });

  it("revokes older sessions when the password changes", async () => {
    const { auth, verifySession, repo, owner } = await setup();
    const old = await verifySession(await auth.login("owner@x.com", "correct horse 1"));
    const fresh = await verifySession(
      await auth.changePassword(owner.id, "correct horse 1", "battery staple 2"),
    );
    const user = await repo.findById(owner.id);
    expect(old!.ver).not.toBe(user!.sessionVersion);
    expect(fresh!.ver).toBe(user!.sessionVersion);
  });

  it("never leaves the account without an active owner", async () => {
    const { auth, owner } = await setup();
    const manager = await auth.addAdmin({
      email: "m@x.com",
      name: "M",
      password: "0123456789",
      role: "manager",
    });
    await expect(
      auth.updateStaff(manager.id, { id: owner.id, role: "agent", isActive: true }),
    ).rejects.toThrow(/active owner/);
    await expect(
      auth.updateStaff(owner.id, { id: owner.id, role: "owner", isActive: false }),
    ).rejects.toThrow(/yourself/);
    const demoted = await auth.updateStaff(owner.id, { id: manager.id, role: "agent", isActive: true });
    expect(demoted).toMatchObject({ role: "agent", sessionVersion: 2 });
  });
});
