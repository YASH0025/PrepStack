import "server-only";

import { createHash } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Fixed-window rate limiter.
 * - JSON mode (one process): counters live in memory.
 * - Postgres mode (one or many instances, e.g. Vercel): counters live in the
 *   `rate_limits` table, updated with one atomic upsert per call. Keys are
 *   stored as sha256 hashes, so IPs and emails never reach the database.
 */
export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export async function rateLimit(
  key: string,
  rule: RateLimitRule,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  if (env.STORAGE_DRIVER === "postgres") return postgresRateLimit(key, rule, now);
  return memoryRateLimit(key, rule, now);
}

/* ----------------------------------------------------------------------------- memory */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
let lastSweep = 0;

export function memoryRateLimit(key: string, rule: RateLimitRule, now: number): RateLimitResult {
  sweep(now);
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (current.count >= rule.limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }
  current.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Drops expired windows at most once a minute so the map stays small. */
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/* ----------------------------------------------------------------------------- postgres */

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

async function postgresRateLimit(
  key: string,
  rule: RateLimitRule,
  now: number,
): Promise<RateLimitResult> {
  const { getPool } = await import("@/lib/db/client");
  const nowAt = new Date(now);
  const resetAt = new Date(now + rule.windowMs);
  // Starts a new window when the old one has expired, otherwise counts this call.
  const { rows } = await getPool().query<{ count: number; reset_at: Date }>(
    `insert into rate_limits (key, count, reset_at) values ($1, 1, $2)
     on conflict (key) do update set
       count = case when rate_limits.reset_at <= $3 then 1 else rate_limits.count + 1 end,
       reset_at = case when rate_limits.reset_at <= $3 then excluded.reset_at else rate_limits.reset_at end
     returning count, reset_at`,
    [hashKey(key), resetAt, nowAt],
  );
  const row = rows[0];
  if (!row || row.count <= rule.limit) return { ok: true, retryAfterSeconds: 0 };
  return {
    ok: false,
    retryAfterSeconds: Math.max(1, Math.ceil((row.reset_at.getTime() - now) / 1000)),
  };
}

/** Deletes expired counters (Postgres mode). Called by the scheduled jobs. */
export async function pruneRateLimits(now: number = Date.now()): Promise<number> {
  if (env.STORAGE_DRIVER !== "postgres") {
    sweep(now);
    return 0;
  }
  const { getPool } = await import("@/lib/db/client");
  const result = await getPool().query("delete from rate_limits where reset_at <= $1", [
    new Date(now),
  ]);
  return result.rowCount ?? 0;
}

export async function resetRateLimitsForTests(): Promise<void> {
  windows.clear();
  lastSweep = 0;
  if (env.STORAGE_DRIVER === "postgres") {
    const { getPool } = await import("@/lib/db/client");
    await getPool().query("delete from rate_limits");
  }
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  publish: { limit: 10, windowMs: 24 * 60 * 60_000 },
  vote: { limit: 120, windowMs: 60 * 60_000 },
  flag: { limit: 20, windowMs: 24 * 60 * 60_000 },
  upload: { limit: 30, windowMs: 60 * 60_000 },
  export: { limit: 20, windowMs: 60 * 60_000 },
  deleteAccount: { limit: 5, windowMs: 15 * 60_000 },
  mockPost: { limit: 20, windowMs: 24 * 60 * 60_000 },
  mockBook: { limit: 10, windowMs: 24 * 60 * 60_000 },
  mockReport: { limit: 10, windowMs: 24 * 60 * 60_000 },
  /** Session changes (meeting link, cancel, question swaps). */
  mockChange: { limit: 60, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;
