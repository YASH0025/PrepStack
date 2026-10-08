/**
 * Build command on Vercel (`npm run vercel-build`, picked up automatically).
 *
 * 1. Production deployments apply database migrations first. Preview
 *    deployments skip them, so a pull request can never change the production
 *    schema; give Preview its own DATABASE_URL (e.g. a Neon branch) and set
 *    MIGRATE_ON_PREVIEW=1 if previews need new tables.
 * 2. Copies the browser runtimes into public/vendor and runs `next build`.
 */
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const production = process.env.VERCEL_ENV === "production";
if (production || process.env.MIGRATE_ON_PREVIEW === "1") {
  run("node", ["scripts/migrate.mjs"]);
} else {
  console.info(`[vercel-build] skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV})`);
}
run("node", ["scripts/copy-vendor.mjs"]);
run("npx", ["next", "build"]);
