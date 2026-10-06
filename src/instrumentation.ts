/**
 * Runs once when the Next.js server starts. Importing the env module here
 * validates configuration up front, so a bad value fails fast at boot
 * instead of on the first request that happens to read it.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env");
  }
}
