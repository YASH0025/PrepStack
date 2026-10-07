import { type EmailService } from "@/lib/services/email";

import {
  createResetToken,
  hashPassword,
  sha256,
  signSessionToken,
  verifyAgainstDummy,
  verifyPassword,
  verifySessionToken,
} from "./crypto";
import { type UserRepository } from "./repository";
import { EmailTakenError } from "./repository.json";
import { type SessionUser, type User } from "./schemas";

export const RESET_TOKEN_TTL_MINUTES = 30;

export interface AuthDeps {
  users: UserRepository;
  email: EmailService;
  sessionSecret: string;
  adminEmails: string[];
  appUrl: string;
  now?: () => Date;
}

export type SignupResult = { ok: true; user: User } | { ok: false; error: "EMAIL_TAKEN" };
export type ChangePasswordResult = "OK" | "WRONG_PASSWORD" | "NOT_FOUND";

/**
 * Framework-free authentication logic. The Next.js glue (cookies, redirects)
 * lives in service.ts; everything here is unit-tested directly.
 * Inputs are expected to be validated (Zod) by the caller.
 */
export class AuthCore {
  private readonly now: () => Date;

  constructor(private readonly deps: AuthDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  async signup(input: { email: string; password: string }): Promise<SignupResult> {
    const email = input.email.toLowerCase();
    if (await this.deps.users.findByEmail(email)) return { ok: false, error: "EMAIL_TAKEN" };
    try {
      const user = await this.deps.users.create({
        email,
        passwordHash: await hashPassword(input.password),
        role: this.deps.adminEmails.includes(email) ? "admin" : "user",
        sessionVersion: 0,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        disabled: false,
        lastLoginAt: this.now().toISOString(),
      });
      return { ok: true, user };
    } catch (error) {
      if (error instanceof EmailTakenError) return { ok: false, error: "EMAIL_TAKEN" };
      throw error;
    }
  }

  /** Returns the user on success, or null. The same null covers unknown email and wrong password. */
  async login(input: { email: string; password: string }): Promise<User | null> {
    const user = await this.deps.users.findByEmail(input.email);
    if (!user) return verifyAgainstDummy(input.password).then(() => null);
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid || user.disabled) return null;
    return (
      (await this.deps.users.update(user.id, { lastLoginAt: this.now().toISOString() })) ?? user
    );
  }

  createSessionToken(user: User): Promise<string> {
    return signSessionToken(
      { sub: user.id, role: user.role, sv: user.sessionVersion },
      this.deps.sessionSecret,
      this.now(),
    );
  }

  /**
   * Validates a session token against the CURRENT user record, so a password
   * change, a disabled account or a role change takes effect immediately.
   */
  async resolveSession(token: string | undefined): Promise<SessionUser | null> {
    if (!token) return null;
    const payload = await verifySessionToken(token, this.deps.sessionSecret, this.now());
    if (!payload) return null;
    const user = await this.deps.users.getById(payload.sub);
    if (!user || user.disabled || user.sessionVersion !== payload.sv) return null;
    return { id: user.id, email: user.email, role: user.role };
  }

  /**
   * Always resolves the same way whether or not the email exists, so the
   * endpoint cannot be used to discover registered emails.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.deps.users.findByEmail(email);
    if (!user || user.disabled) return;

    const token = createResetToken();
    const expiresAt = new Date(this.now().getTime() + RESET_TOKEN_TTL_MINUTES * 60_000);
    await this.deps.users.update(user.id, {
      resetTokenHash: sha256(token),
      resetTokenExpiresAt: expiresAt.toISOString(),
    });

    const link = new URL("/reset-password", this.deps.appUrl);
    link.searchParams.set("token", token);
    await this.deps.email.send({
      to: user.email,
      subject: "Reset your PrepStack password",
      text: [
        "Someone (hopefully you) asked to reset your PrepStack password.",
        "",
        `Open this link within ${RESET_TOKEN_TTL_MINUTES} minutes to choose a new password:`,
        link.toString(),
        "",
        "If you did not ask for this, ignore this email. Your password will not change.",
      ].join("\n"),
    });
  }

  /** Sets a new password if the token is valid and unexpired. Invalidates all sessions. */
  async resetPassword(input: { token: string; password: string }): Promise<boolean> {
    const user = await this.deps.users.findByResetTokenHash(sha256(input.token));
    if (!user || !user.resetTokenExpiresAt || user.disabled) return false;
    if (new Date(user.resetTokenExpiresAt).getTime() <= this.now().getTime()) return false;

    await this.deps.users.update(user.id, {
      passwordHash: await hashPassword(input.password),
      sessionVersion: user.sessionVersion + 1,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
    return true;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    nextPassword: string,
  ): Promise<{ result: ChangePasswordResult; user?: User }> {
    const user = await this.deps.users.getById(userId);
    if (!user) return { result: "NOT_FOUND" };
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return { result: "WRONG_PASSWORD" };
    }
    const updated = await this.deps.users.update(user.id, {
      passwordHash: await hashPassword(nextPassword),
      sessionVersion: user.sessionVersion + 1,
    });
    return { result: "OK", user: updated ?? undefined };
  }

  /** Re-checks the signed-in user's password before sensitive actions (account deletion). */
  async verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.deps.users.getById(userId);
    if (!user) return false;
    return verifyPassword(password, user.passwordHash);
  }

  /** Removes the account record. Private data is deleted by the account service. */
  deleteUser(userId: string): Promise<boolean> {
    return this.deps.users.delete(userId);
  }
}
