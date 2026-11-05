import { beforeEach, expect, it, vi } from "vitest";
import type * as IdentityEmails from "@/features/identity/server/identity.emails";

/** Codes "emailed" during a test, newest last */
const sentCodes: string[] = [];
vi.mock("@/features/identity/server/identity.emails", async (orig) => ({
  ...(await orig<typeof IdentityEmails>()),
  sendLoginCode: vi.fn(async (_to: string, _name: string, code: string) => {
    sentCodes.push(code);
  }),
}));
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
    /** Both steps: password, then the emailed code. Returns the session token. */
    const login = async (email: string, password: string) => {
      const step1 = await auth.beginSignIn({ email, password, ip: "1.2.3.4" });
      if (step1.status === "signed_in") return step1.sessionToken;
      const step2 = await auth.verifySignInCode({
        challengeId: step1.challengeId,
        code: sentCodes.at(-1)!,
        rememberDevice: false,
      });
      return step2.sessionToken;
    };
    return { auth, verifySession, repo, owner, login };
  }

  it("issues a session carrying the role and version", async () => {
    const { verifySession, login } = await setup();
    const session = await verifySession(await login("owner@x.com", "correct horse 1"));
    expect(session).toMatchObject({ email: "owner@x.com", role: "owner", ver: 1 });
  });

  it("rejects wrong passwords and disabled accounts with the same message", async () => {
    const { repo, owner, login } = await setup();
    await expect(login("owner@x.com", "nope")).rejects.toThrow("Email or password is incorrect.");
    await expect(login("ghost@x.com", "nope")).rejects.toThrow("Email or password is incorrect.");
    await repo.updateAdmin(owner.id, { isActive: false });
    await expect(login("owner@x.com", "correct horse 1")).rejects.toThrow("Email or password is incorrect.");
  });

  it("revokes older sessions when the password changes", async () => {
    const { auth, verifySession, repo, owner, login } = await setup();
    const old = await verifySession(await login("owner@x.com", "correct horse 1"));
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

describeDb("two-step sign-in", () => {
  beforeEach(async () => {
    await resetDatabase();
    sentCodes.length = 0;
  });

  async function owner() {
    const auth = await import("@/features/identity/server/auth.service");
    await auth.addAdmin({ email: "owner@x.com", name: "O", password: "correct horse 1", role: "owner" });
    return auth;
  }

  it("emails a code instead of signing in after the password", async () => {
    const auth = await owner();
    const step = await auth.beginSignIn({ email: "owner@x.com", password: "correct horse 1", ip: "1.2.3.4" });
    expect(step).toMatchObject({ status: "code_sent", maskedEmail: "o***@x.com" });
    expect(sentCodes).toHaveLength(1);
    expect(sentCodes[0]).toMatch(/^\d{6}$/);
  });

  it("counts wrong codes and stops after five", async () => {
    const auth = await owner();
    const step = await auth.beginSignIn({ email: "owner@x.com", password: "correct horse 1", ip: "1.2.3.4" });
    if (step.status !== "code_sent") throw new Error("expected a code");
    const wrong = sentCodes[0] === "000000" ? "111111" : "000000";
    await expect(
      auth.verifySignInCode({ challengeId: step.challengeId, code: wrong, rememberDevice: false }),
    ).rejects.toThrow("4 tries left");
    for (let i = 0; i < 4; i++) {
      await auth
        .verifySignInCode({ challengeId: step.challengeId, code: wrong, rememberDevice: false })
        .catch(() => undefined);
    }
    // Even the right code no longer works
    await expect(
      auth.verifySignInCode({ challengeId: step.challengeId, code: sentCodes[0], rememberDevice: false }),
    ).rejects.toThrow(/expired or was used too many times/);
  });

  it("accepts a code once, and a new code cancels the old one", async () => {
    const auth = await owner();
    const step = await auth.beginSignIn({ email: "owner@x.com", password: "correct horse 1", ip: "1.2.3.4" });
    if (step.status !== "code_sent") throw new Error("expected a code");
    const resent = await auth.resendSignInCode(step.challengeId, "1.2.3.4");
    if (resent.status !== "code_sent") throw new Error("expected a code");
    await expect(
      auth.verifySignInCode({ challengeId: step.challengeId, code: sentCodes[0], rememberDevice: false }),
    ).rejects.toThrow(/expired/);
    await expect(
      auth.verifySignInCode({ challengeId: resent.challengeId, code: sentCodes[1], rememberDevice: false }),
    ).resolves.toMatchObject({ trustedDeviceToken: null });
    await expect(
      auth.verifySignInCode({ challengeId: resent.challengeId, code: sentCodes[1], rememberDevice: false }),
    ).rejects.toThrow(/expired/);
  });

  it("skips the code on a remembered device until sessions are revoked", async () => {
    const auth = await owner();
    const step = await auth.beginSignIn({ email: "owner@x.com", password: "correct horse 1", ip: "1.2.3.4" });
    if (step.status !== "code_sent") throw new Error("expected a code");
    const { trustedDeviceToken } = await auth.verifySignInCode({
      challengeId: step.challengeId,
      code: sentCodes[0],
      rememberDevice: true,
    });
    expect(trustedDeviceToken).toBeTruthy();

    const again = await auth.beginSignIn({
      email: "owner@x.com",
      password: "correct horse 1",
      ip: "1.2.3.4",
      trustedDevice: trustedDeviceToken!,
    });
    expect(again.status).toBe("signed_in");

    const repo = await import("@/features/identity/server/admin-user.repository");
    const user = await repo.findByEmail("owner@x.com");
    await auth.signOutEverywhere(user!.id);
    const afterRevoke = await auth.beginSignIn({
      email: "owner@x.com",
      password: "correct horse 1",
      ip: "1.2.3.4",
      trustedDevice: trustedDeviceToken!,
    });
    expect(afterRevoke.status).toBe("code_sent");
  });

  it("queues one security alert at the tenth failed sign-in in an hour", async () => {
    const auth = await owner();
    const { db } = await import("@/server/db/client");
    const { jobs } = await import("@/server/db/schema");
    for (let i = 0; i < 12; i++) {
      await auth
        .beginSignIn({ email: "owner@x.com", password: "wrong", ip: "1.2.3.4" })
        .catch(() => undefined);
    }
    const queued = await db.select().from(jobs);
    expect(queued).toMatchObject([{ type: "identity.failed_login_alert", payload: { failures: 10 } }]);
  });
});
