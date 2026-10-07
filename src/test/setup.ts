import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/*
 * Runs before each test file (and before its imports are evaluated), so modules
 * that read env at import time see these values. Every test file gets its own
 * empty data folder.
 */
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "prepstack-test-"));
process.env.SESSION_SECRET ??= "test-session-secret-that-is-at-least-32-chars";
// 32 zero bytes, base64. Test-only key.
process.env.ENCRYPTION_KEY ??= "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
process.env.CRON_SECRET ??= "test-cron-secret-0123456789abcdef";
process.env.ADMIN_EMAILS ??= "admin@test.local";

/*
 * `TEST_DATABASE_URL=postgres://… npm test` runs the whole suite on the
 * Postgres storage driver. Each test file gets its own schema, created from
 * the committed migrations, so files never see each other's rows.
 */
if (process.env.TEST_DATABASE_URL) {
  const { readFileSync, readdirSync } = await import("node:fs");
  const { Client } = await import("pg");
  const schemaName = `test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const admin = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await admin.connect();
  await admin.query(`create schema ${schemaName}`);
  await admin.query(`set search_path to ${schemaName}`);
  const folder = path.join(process.cwd(), "drizzle");
  for (const file of readdirSync(folder)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(path.join(folder, file), "utf8").replaceAll('"public".', "");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await admin.query(statement);
    }
  }
  await admin.end();
  const url = new URL(process.env.TEST_DATABASE_URL);
  url.searchParams.set("options", `-c search_path=${schemaName}`);
  process.env.STORAGE_DRIVER = "postgres";
  process.env.DATABASE_URL = url.toString();

  const { afterAll } = await import("vitest");
  afterAll(async () => {
    const { closePool } = await import("@/lib/db/client");
    await closePool();
    const cleanup = new Client({ connectionString: process.env.TEST_DATABASE_URL });
    await cleanup.connect();
    await cleanup.query(`drop schema if exists ${schemaName} cascade`);
    await cleanup.end();
  });
}
