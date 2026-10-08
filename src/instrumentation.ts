/**
 * Runs once when the Next.js server starts.
 * 1. Importing the env module validates configuration, so a bad value fails
 *    fast at boot instead of on the first request that reads it.
 * 2. In Postgres mode, pending SQL migrations (./drizzle) are applied, except
 *    on Vercel, where functions cannot read ./drizzle and migrations run
 *    during the build instead (scripts/vercel-build.mjs).
 * 3. Seed content is copied into storage on first run (never overwritten).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("./lib/env");
    if (env.STORAGE_DRIVER === "postgres" && !env.VERCEL) {
      const { runMigrations } = await import("./lib/db/client");
      await runMigrations();
      console.info("[db] migrations applied");
    }
    const { seedContentIfMissing } = await import("./seed");
    const written = await seedContentIfMissing();
    if (written.length > 0) {
      console.info(`[seed] wrote ${written.length} content file(s) to the data folder`);
    }
  }
}
