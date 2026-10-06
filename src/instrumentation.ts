/**
 * Runs once when the Next.js server starts.
 * 1. Importing the env module validates configuration, so a bad value fails
 *    fast at boot instead of on the first request that reads it.
 * 2. Seed content is copied into DATA_DIR on first run (never overwritten).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env");
    const { seedContentIfMissing } = await import("./seed");
    const written = await seedContentIfMissing();
    if (written.length > 0) {
      console.info(`[seed] wrote ${written.length} content file(s) to the data folder`);
    }
  }
}
