/**
 * Applies the SQL migrations in ./drizzle to the database.
 *
 *   DATABASE_URL=postgres://… node scripts/migrate.mjs
 *
 * Used by `npm run vercel-build`: serverless functions cannot read the
 * ./drizzle folder at runtime, so on Vercel migrations run during the build.
 * Prefers DATABASE_URL_UNPOOLED (a direct connection, set by Vercel's Neon
 * integration) because migrations should not go through a connection pooler.
 * Safe to run any number of times.
 */
import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: path.resolve("drizzle") });
  console.info("[migrate] migrations applied");
} finally {
  await pool.end();
}
