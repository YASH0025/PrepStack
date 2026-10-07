import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { env } from "@/lib/env";
import { getEmailService } from "@/lib/services/email";

import { type AuthBackend } from "./backend";
import { BuiltinAuthBackend } from "./builtin-backend";
import { AuthCore } from "./core";
import { JsonUserRepository } from "./repository.json";
import { type SessionUser } from "./schemas";

export { SESSION_COOKIE } from "./builtin-backend";

let core: AuthCore | null = null;
let userRepository: JsonUserRepository | null = null;

export function getUserRepository(): JsonUserRepository {
  userRepository ??= new JsonUserRepository();
  return userRepository;
}

export function getAuthCore(): AuthCore {
  core ??= new AuthCore({
    users: getUserRepository(),
    email: getEmailService(),
    sessionSecret: env.SESSION_SECRET,
    adminEmails: env.ADMIN_EMAILS,
    appUrl: env.APP_URL,
  });
  return core;
}

let backend: AuthBackend | null = null;

/** Built-in auth in JSON mode, Better Auth in Postgres mode. */
export async function getAuth(): Promise<AuthBackend> {
  if (backend) return backend;
  backend =
    env.STORAGE_DRIVER === "postgres"
      ? new (await import("./better-auth")).BetterAuthBackend()
      : new BuiltinAuthBackend(getAuthCore(), getUserRepository());
  return backend;
}

/** The signed-in user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> =>
  (await getAuth()).currentUser(),
);

/**
 * Requires a signed-in user. Use at the top of every private page, server
 * action and route handler. Redirects to login (actions and pages) otherwise.
 */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}

/** Requires an admin. Non-admins get a 404 so the admin area's existence is not advertised. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") notFound();
  return user;
}

/** Variant for route handlers: returns null instead of redirecting. */
export async function getUserForApi(): Promise<SessionUser | null> {
  return getCurrentUser();
}

/** Best-effort client IP for rate limiting. */
export async function clientIp(): Promise<string> {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "local";
}

/** Only allows same-site relative redirects ("/today", not "//evil.com" or "https://..."). */
export function safeNextPath(value: unknown, fallback = "/today"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
