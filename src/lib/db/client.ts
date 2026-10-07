import "server-only";

import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { env } from "@/lib/env";

import * as schema from "./schema";

let pool: Pool | null = null;

/** Shared connection pool (Postgres mode only). */
export function getPool(): Pool {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  pool ??= new Pool({ connectionString: env.DATABASE_URL, max: 10 });
  return pool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export type Db = ReturnType<typeof getDb>;

/** Applies pending SQL migrations from ./drizzle. Safe to run on every start. */
export async function runMigrations(): Promise<void> {
  await migrate(getDb(), {
    migrationsFolder: path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle"),
  });
}

/** Tests and scripts: close the pool so the process can exit. */
export async function closePool(): Promise<void> {
  await pool?.end();
  pool = null;
}
