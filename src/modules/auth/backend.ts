import { type ChangePasswordResult } from "./core";
import { type Role, type SessionUser } from "./schemas";

export type SocialProvider = "google" | "github";

export interface AccountInfo {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
  /** Disabled accounts cannot sign in and get no emails. */
  disabled: boolean;
  /** False for accounts that only sign in with Google/GitHub. */
  hasPassword: boolean;
}

/**
 * Authentication behind one interface. JSON mode uses the built-in auth
 * (bcrypt + signed cookie); Postgres mode uses Better Auth (database sessions,
 * Google/GitHub sign-in). Methods that touch cookies must run in a request.
 */
export interface AuthBackend {
  readonly name: "builtin" | "better-auth";
  /** The signed-in user for the current request, or null. */
  currentUser(): Promise<SessionUser | null>;
  /** Creates an account (no session). */
  register(input: {
    email: string;
    password: string;
  }): Promise<{ ok: true; userId: string } | { ok: false; error: "EMAIL_TAKEN" }>;
  /** Checks the password and starts a session. Returns null on bad credentials. */
  signIn(input: { email: string; password: string }): Promise<SessionUser | null>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(input: { token: string; password: string }): Promise<boolean>;
  /** Changes the password, keeps this session and signs out other devices. */
  changePassword(userId: string, current: string, next: string): Promise<ChangePasswordResult>;
  verifyCurrentPassword(userId: string, password: string): Promise<boolean>;
  getAccount(userId: string): Promise<AccountInfo | null>;
  deleteUser(userId: string): Promise<void>;
  /** Providers with credentials configured (always empty in JSON mode). */
  socialProviders(): SocialProvider[];
  /** URL to send the browser to for social sign-in. */
  socialSignInUrl(provider: SocialProvider, callbackPath: string): Promise<string>;
}
