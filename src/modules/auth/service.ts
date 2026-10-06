import "server-only";

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { env } from "@/lib/env";
import { getEmailService } from "@/lib/services/email";

import { AuthCore } from "./core";
import { SESSION_TTL_SECONDS } from "./crypto";
import { JsonUserRepository } from "./repository.json";
import { type SessionUser, type User } from "./schemas";

export const SESSION_COOKIE = "ps_session";

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

/** The signed-in user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  return getAuthCore().resolveSession(store.get(SESSION_COOKIE)?.value);
});

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

export async function startSession(user: User): Promise<void> {
  const token = await getAuthCore().createSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
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
