import { describe, expect, it } from "vitest";

import { getPool } from "@/lib/db/client";
import { usingPostgres } from "@/test/stored";

import { getAuth } from "./service";

describe.skipIf(!usingPostgres)("Better Auth backend (Postgres mode)", () => {
  it("registers with bcrypt, assigns roles, rejects duplicates and deletes cleanly", async () => {
    const auth = await getAuth();
    expect(auth.name).toBe("better-auth");

    const created = await auth.register({ email: "dev@example.com", password: "password123" });
    if (!created.ok) throw new Error("register failed");
    expect(created.userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await auth.register({ email: "dev@example.com", password: "x".repeat(10) })).toEqual({
      ok: false,
      error: "EMAIL_TAKEN",
    });

    const account = await auth.getAccount(created.userId);
    expect(account).toMatchObject({ email: "dev@example.com", role: "user", hasPassword: true });
    expect(await auth.verifyCurrentPassword(created.userId, "password123")).toBe(true);
    expect(await auth.verifyCurrentPassword(created.userId, "wrong-password")).toBe(false);

    const { rows } = await getPool().query(
      "select password from account where user_id = $1 and provider_id = 'credential'",
      [created.userId],
    );
    expect(rows[0]?.password).toMatch(/^\$2[aby]\$/);

    expect(await auth.resetPassword({ token: "not-a-token", password: "password456" })).toBe(false);

    // ADMIN_EMAILS (set in the test setup) become admins at sign-up.
    const boss = await auth.register({ email: "admin@test.local", password: "password123" });
    if (!boss.ok) throw new Error("register failed");
    expect((await auth.getAccount(boss.userId))?.role).toBe("admin");

    await auth.deleteUser(created.userId);
    expect(await auth.getAccount(created.userId)).toBeNull();
  });
});
