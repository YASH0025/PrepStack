/**
 * In-memory fixed-window rate limiter. Good enough for the single-process JSON
 * phase; swap for Redis or a database-backed limiter when running more than
 * one instance.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
let lastSweep = 0;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
  now: number = Date.now(),
): RateLimitResult {
  sweep(now);
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (current.count >= options.limit) {
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

export function resetRateLimitsForTests(): void {
  windows.clear();
  lastSweep = 0;
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
} as const;
