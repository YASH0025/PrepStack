import "server-only";

import { cookies } from "next/headers";

import { env } from "@/lib/env";

import { type AccountInfo, type AuthBackend } from "./backend";
import { type AuthCore } from "./core";
import { SESSION_TTL_SECONDS } from "./crypto";
import { type JsonUserRepository } from "./repository.json";
import { type SessionUser, type User } from "./schemas";

export const SESSION_COOKIE = "ps_session";

/** Built-in auth: bcrypt passwords in users.json and a signed session cookie. */
export class BuiltinAuthBackend implements AuthBackend {
  readonly name = "builtin" as const;

  constructor(
    private readonly core: AuthCore,
    private readonly users: JsonUserRepository,
  ) {}

  private async startSession(user: User): Promise<void> {
    const token = await this.core.createSessionToken(user);
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
  }

  async currentUser(): Promise<SessionUser | null> {
    return this.core.resolveSession((await cookies()).get(SESSION_COOKIE)?.value);
  }

  async register(input: { email: string; password: string }) {
    const result = await this.core.signup(input);
    return result.ok
      ? { ok: true as const, userId: result.user.id }
      : { ok: false as const, error: "EMAIL_TAKEN" as const };
  }

  async signIn(input: { email: string; password: string }): Promise<SessionUser | null> {
    const user = await this.core.login(input);
    if (!user) return null;
    await this.startSession(user);
    return { id: user.id, email: user.email, role: user.role };
  }

  async signOut(): Promise<void> {
    (await cookies()).delete(SESSION_COOKIE);
  }

  requestPasswordReset(email: string): Promise<void> {
    return this.core.requestPasswordReset(email);
  }

  resetPassword(input: { token: string; password: string }): Promise<boolean> {
    return this.core.resetPassword(input);
  }

  async changePassword(userId: string, current: string, next: string) {
    const { result, user } = await this.core.changePassword(userId, current, next);
    // Other sessions are invalidated by the version bump; keep this one signed in.
    if (result === "OK" && user) await this.startSession(user);
    return result;
  }

  verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
    return this.core.verifyCurrentPassword(userId, password);
  }

  async getAccount(userId: string): Promise<AccountInfo | null> {
    const user = await this.users.getById(userId);
    return user
      ? {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          disabled: user.disabled,
          hasPassword: true,
        }
      : null;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.core.deleteUser(userId);
  }

  socialProviders() {
    return [];
  }

  socialSignInUrl(): Promise<string> {
    return Promise.reject(new Error("Social sign-in needs the Postgres storage driver"));
  }
}
