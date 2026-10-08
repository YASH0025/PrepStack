import "server-only";

import { randomUUID } from "node:crypto";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";

import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { getEmailService } from "@/lib/services/email";

import { type AccountInfo, type AuthBackend, type SocialProvider } from "./backend";
import { hashPassword, verifyPassword } from "./crypto";
import { RoleSchema, type SessionUser } from "./schemas";

const RESET_TOKEN_TTL_SECONDS = 30 * 60;

function createAuth() {
  return betterAuth({
    appName: "PrepStack",
    baseURL: env.APP_URL,
    secret: env.SESSION_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    advanced: {
      // UUIDs, because a user's id names their private storage folder.
      database: { generateId: () => randomUUID() },
      cookiePrefix: "ps",
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "user", input: false },
      },
    },
    account: {
      // OAuth access/refresh tokens are encrypted at rest.
      encryptOAuthTokens: true,
    },
    session: { expiresIn: 60 * 60 * 24 * 30 },
    rateLimit: {
      // Direct calls to /api/auth/* share the app's database-backed counters,
      // so limits hold across serverless instances (and keys are hashed).
      customStorage: {
        consume: async (key, rule) => {
          const result = await rateLimit(`auth:${key}`, {
            limit: rule.max,
            windowMs: rule.window * 1000,
          });
          return { allowed: result.ok, retryAfter: result.ok ? null : result.retryAfterSeconds };
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // bcrypt, so accounts imported from the JSON phase keep their passwords.
      password: {
        hash: hashPassword,
        verify: ({ hash, password }) => verifyPassword(password, hash),
      },
      resetPasswordTokenExpiresIn: RESET_TOKEN_TTL_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        const link = new URL("/reset-password", env.APP_URL);
        link.searchParams.set("token", token);
        await getEmailService().send({
          to: user.email,
          subject: "Reset your PrepStack password",
          text: [
            "Someone (hopefully you) asked to reset your PrepStack password.",
            "",
            `Open this link within ${RESET_TOKEN_TTL_SECONDS / 60} minutes to choose a new password:`,
            link.toString(),
            "",
            "If you did not ask for this, ignore this email. Your password will not change.",
          ].join("\n"),
        });
      },
    },
    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {}),
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
        : {}),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: {
              ...user,
              role: env.ADMIN_EMAILS.includes(user.email.toLowerCase()) ? "admin" : "user",
            },
          }),
        },
      },
    },
    // Must stay last: copies Better Auth's cookies into Next.js server actions.
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | null = null;

export function getBetterAuth() {
  instance ??= createAuth();
  return instance;
}

function toSessionUser(user: { id: string; email: string; role?: unknown }): SessionUser {
  const role = RoleSchema.safeParse(user.role);
  return { id: user.id, email: user.email, role: role.success ? role.data : "user" };
}

/** Requests without a Next.js request scope (scripts, tests) get empty headers. */
async function requestHeaders(): Promise<Headers> {
  try {
    return new Headers(await headers());
  } catch {
    return new Headers();
  }
}

export class BetterAuthBackend implements AuthBackend {
  readonly name = "better-auth" as const;
  private readonly auth = getBetterAuth();

  async currentUser(): Promise<SessionUser | null> {
    const result = await this.auth.api.getSession({ headers: await requestHeaders() });
    return result ? toSessionUser(result.user) : null;
  }

  async register(input: { email: string; password: string }) {
    const ctx = await this.auth.$context;
    if (await ctx.internalAdapter.findUserByEmail(input.email)) {
      return { ok: false as const, error: "EMAIL_TAKEN" as const };
    }
    const result = await this.auth.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.email.split("@")[0] ?? "" },
    });
    return { ok: true as const, userId: result.user.id };
  }

  async signIn(input: { email: string; password: string }): Promise<SessionUser | null> {
    try {
      const result = await this.auth.api.signInEmail({
        body: input,
        headers: await requestHeaders(),
      });
      return toSessionUser(result.user);
    } catch {
      return null;
    }
  }

  async signOut(): Promise<void> {
    await this.auth.api.signOut({ headers: await requestHeaders() }).catch(() => undefined);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.auth.api
      .requestPasswordReset({ body: { email, redirectTo: "/reset-password" } })
      .catch(() => undefined);
  }

  async resetPassword(input: { token: string; password: string }): Promise<boolean> {
    try {
      await this.auth.api.resetPassword({
        body: { token: input.token, newPassword: input.password },
      });
      return true;
    } catch {
      return false;
    }
  }

  async changePassword(_userId: string, current: string, next: string) {
    try {
      await this.auth.api.changePassword({
        body: { currentPassword: current, newPassword: next, revokeOtherSessions: true },
        headers: await requestHeaders(),
      });
      return "OK" as const;
    } catch {
      return "WRONG_PASSWORD" as const;
    }
  }

  private async passwordHash(userId: string): Promise<string | null> {
    const ctx = await this.auth.$context;
    const accounts = await ctx.internalAdapter.findAccounts(userId);
    return accounts.find((item) => item.providerId === "credential")?.password ?? null;
  }

  async verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
    const hash = await this.passwordHash(userId);
    return hash ? verifyPassword(password, hash) : false;
  }

  async getAccount(userId: string): Promise<AccountInfo | null> {
    const ctx = await this.auth.$context;
    const user = await ctx.internalAdapter.findUserById(userId);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      role: toSessionUser(user).role,
      createdAt: new Date(user.createdAt).toISOString(),
      lastLoginAt: null,
      disabled: false,
      hasPassword: Boolean(await this.passwordHash(userId)),
    };
  }

  async deleteUser(userId: string): Promise<void> {
    const ctx = await this.auth.$context;
    await ctx.internalAdapter.deleteUserSessions(userId);
    await ctx.internalAdapter.deleteUser(userId);
  }

  socialProviders(): SocialProvider[] {
    const providers: SocialProvider[] = [];
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.push("google");
    if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) providers.push("github");
    return providers;
  }

  async socialSignInUrl(provider: SocialProvider, callbackPath: string): Promise<string> {
    const result = await this.auth.api.signInSocial({
      body: { provider, callbackURL: callbackPath, newUserCallbackURL: "/onboarding" },
      headers: await requestHeaders(),
    });
    if (!result.url) throw new Error("Could not start social sign-in");
    return result.url;
  }
}
