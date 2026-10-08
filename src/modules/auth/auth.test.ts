import { beforeEach, describe, expect, it } from "vitest";

import { type EmailMessage, type EmailService } from "@/lib/services/email";
import { pruneRateLimits, rateLimit, resetRateLimitsForTests } from "@/lib/rate-limit";

import { AuthCore } from "./core";
import { signSessionToken, verifySessionToken } from "./crypto";
import { JsonUserRepository } from "./repository.json";
import { LoginInputSchema, ResetPasswordInputSchema, SignupInputSchema } from "./schemas";
import { safeNextPath } from "./service";

const SECRET = "x".repeat(40);

class CapturingEmail implements EmailService {
  sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
  }
}

function makeCore(now = () => new Date()) {
  const email = new CapturingEmail();
  const users = new JsonUserRepository();
  const core = new AuthCore({
    users,
    email,
    sessionSecret: SECRET,
    adminEmails: ["boss@example.com"],
    appUrl: "http://localhost:3000",
    now,
  });
  return { core, email, users };
}

let n = 0;
const uniqueEmail = () => `user${++n}@example.com`;

describe("AuthCore", () => {
  it("signs up, lowercases emails, and rejects duplicates", async () => {
    const { core } = makeCore();
    const email = uniqueEmail();
    const first = await core.signup({ email: email.toUpperCase(), password: "password123" });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.user.email).toBe(email);
      expect(first.user.role).toBe("user");
      expect(first.user.passwordHash).not.toContain("password123");
    }
    expect(await core.signup({ email, password: "password123" })).toEqual({
      ok: false,
      error: "EMAIL_TAKEN",
    });
  });

  it("makes ADMIN_EMAILS admins at signup", async () => {
    const { core } = makeCore();
    const result = await core.signup({ email: "boss@example.com", password: "password123" });
    expect(result.ok && result.user.role).toBe("admin");
  });

  it("logs in with the right password only", async () => {
    const { core } = makeCore();
    const email = uniqueEmail();
    await core.signup({ email, password: "password123" });
    expect(await core.login({ email, password: "wrong-password" })).toBeNull();
    expect(await core.login({ email: "nobody@example.com", password: "password123" })).toBeNull();
    expect((await core.login({ email, password: "password123" }))?.email).toBe(email);
  });

  it("refuses disabled accounts", async () => {
    const { core, users } = makeCore();
    const email = uniqueEmail();
    const result = await core.signup({ email, password: "password123" });
    if (!result.ok) throw new Error("signup failed");
    await users.update(result.user.id, { disabled: true });
    expect(await core.login({ email, password: "password123" })).toBeNull();
    const token = await core.createSessionToken(result.user);
    expect(await core.resolveSession(token)).toBeNull();
  });

  it("issues sessions that resolve to the user", async () => {
    const { core } = makeCore();
    const result = await core.signup({ email: uniqueEmail(), password: "password123" });
    if (!result.ok) throw new Error("signup failed");
    const token = await core.createSessionToken(result.user);
    expect(await core.resolveSession(token)).toEqual({
      id: result.user.id,
      email: result.user.email,
      role: "user",
    });
    expect(await core.resolveSession(undefined)).toBeNull();
    expect(await core.resolveSession(token + "x")).toBeNull();
  });

  it("password reset: emails a link, accepts the token once, signs out old sessions", async () => {
    const { core, email } = makeCore();
    const address = uniqueEmail();
    const result = await core.signup({ email: address, password: "password123" });
    if (!result.ok) throw new Error("signup failed");
    const oldToken = await core.createSessionToken(result.user);

    await core.requestPasswordReset(address);
    const message = email.sent.at(-1);
    expect(message?.to).toBe(address);
    const link = message?.text.match(/http\S+/)?.[0] ?? "";
    const token = new URL(link).searchParams.get("token") ?? "";
    expect(token.length).toBeGreaterThan(20);

    expect(await core.resetPassword({ token, password: "new-password-1" })).toBe(true);
    expect(await core.resetPassword({ token, password: "again-password" })).toBe(false);
    expect(await core.resolveSession(oldToken)).toBeNull();
    expect(await core.login({ email: address, password: "new-password-1" })).not.toBeNull();
  });

  it("password reset: unknown emails send nothing; expired tokens fail", async () => {
    let now = new Date("2026-01-01T00:00:00.000Z");
    const { core, email } = makeCore(() => now);
    await core.requestPasswordReset("ghost@example.com");
    expect(email.sent).toHaveLength(0);

    const address = uniqueEmail();
    await core.signup({ email: address, password: "password123" });
    await core.requestPasswordReset(address);
    const token =
      new URL(email.sent.at(-1)?.text.match(/http\S+/)?.[0] ?? "").searchParams.get("token") ?? "";
    now = new Date("2026-01-01T00:31:00.000Z");
    expect(await core.resetPassword({ token, password: "new-password-1" })).toBe(false);
  });

  it("changePassword checks the current password and bumps the session version", async () => {
    const { core } = makeCore();
    const result = await core.signup({ email: uniqueEmail(), password: "password123" });
    if (!result.ok) throw new Error("signup failed");
    expect((await core.changePassword(result.user.id, "nope", "new-password-1")).result).toBe(
      "WRONG_PASSWORD",
    );
    const changed = await core.changePassword(result.user.id, "password123", "new-password-1");
    expect(changed.result).toBe("OK");
    expect(changed.user?.sessionVersion).toBe(1);
  });
});

describe("session tokens", () => {
  it("expire after 30 days", async () => {
    const issued = new Date("2026-01-01T00:00:00Z");
    const token = await signSessionToken(
      { sub: "55555555-5555-4555-8555-555555555555", role: "user", sv: 0 },
      SECRET,
      issued,
    );
    expect(
      await verifySessionToken(token, SECRET, new Date("2026-01-29T00:00:00Z")),
    ).not.toBeNull();
    expect(await verifySessionToken(token, SECRET, new Date("2026-02-01T00:00:01Z"))).toBeNull();
    expect(await verifySessionToken(token, "y".repeat(40), issued)).toBeNull();
  });
});

describe("input validation", () => {
  it("validates signup, login and reset inputs", () => {
    expect(SignupInputSchema.safeParse({ email: "bad", password: "password123" }).success).toBe(
      false,
    );
    expect(SignupInputSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(false);
    expect(SignupInputSchema.parse({ email: " A@B.CO ", password: "password123" }).email).toBe(
      "a@b.co",
    );
    expect(LoginInputSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(
      ResetPasswordInputSchema.safeParse({
        token: "t".repeat(30),
        password: "password123",
        confirm: "different1",
      }).success,
    ).toBe(false);
  });

  it("only allows same-site redirect targets", () => {
    expect(safeNextPath("/roadmap")).toBe("/roadmap");
    expect(safeNextPath("//evil.com")).toBe("/today");
    expect(safeNextPath("https://evil.com")).toBe("/today");
    expect(safeNextPath(undefined)).toBe("/today");
  });
});

describe("rateLimit", () => {
  beforeEach(() => resetRateLimitsForTests());
  const t0 = 1_700_000_000_000;

  it("blocks after the limit until the window resets", async () => {
    const options = { limit: 2, windowMs: 1000 };
    expect((await rateLimit("k", options, t0)).ok).toBe(true);
    expect((await rateLimit("k", options, t0 + 10)).ok).toBe(true);
    const blocked = await rateLimit("k", options, t0 + 20);
    expect(blocked).toEqual({ ok: false, retryAfterSeconds: 1 });
    expect((await rateLimit("k", options, t0 + 1001)).ok).toBe(true);
    expect((await rateLimit("other", options, t0 + 20)).ok).toBe(true);
  });

  it("prunes expired windows without resetting live ones", async () => {
    const options = { limit: 1, windowMs: 1000 };
    await rateLimit("old", options, t0);
    await rateLimit("live", options, t0 + 900);
    await pruneRateLimits(t0 + 1500);
    expect((await rateLimit("live", options, t0 + 1500)).ok).toBe(false);
    expect((await rateLimit("old", options, t0 + 1500)).ok).toBe(true);
  });
});
