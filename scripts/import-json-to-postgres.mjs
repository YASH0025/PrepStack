/**
 * One-time move from JSON files to PostgreSQL.
 *
 *   DATA_DIR=./data DATABASE_URL=postgres://… node scripts/import-json-to-postgres.mjs [--overwrite]
 *
 * 1. Applies the SQL migrations in ./drizzle.
 * 2. Copies every JSON envelope under DATA_DIR into storage_files, keyed by its
 *    path relative to DATA_DIR (encrypted fields stay encrypted; ENCRYPTION_KEY
 *    must stay the same). Existing rows are kept unless --overwrite is given.
 * 3. Creates Better Auth users from system/users.json with their existing
 *    bcrypt password hashes, so everyone signs in with the same password.
 *
 * Safe to run more than once. Take a backup of DATA_DIR first.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const dataDir = path.resolve(process.env.DATA_DIR ?? "./data");
const url = process.env.DATABASE_URL;
const overwrite = process.argv.includes("--overwrite");
if (!url) {
  console.error("Set DATABASE_URL.");
  process.exit(1);
}

async function* jsonFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* jsonFiles(full);
    else if (entry.name.endsWith(".json") && !entry.name.startsWith(".")) yield full;
  }
}

const pool = new pg.Pool({ connectionString: url });
try {
  await migrate(drizzle(pool), { migrationsFolder: path.resolve("drizzle") });
  console.info("[import] migrations applied");

  let files = 0;
  let skipped = 0;
  for await (const file of jsonFiles(dataDir)) {
    const key = path.relative(dataDir, file).split(path.sep).join("/");
    const data = JSON.parse(await readFile(file, "utf8"));
    const result = await pool.query(
      overwrite
        ? `insert into storage_files (key, data) values ($1, $2)
           on conflict (key) do update set data = excluded.data, updated_at = now()`
        : `insert into storage_files (key, data) values ($1, $2) on conflict (key) do nothing`,
      [key, data],
    );
    if (result.rowCount) files += 1;
    else skipped += 1;
  }
  console.info(`[import] ${files} file(s) copied, ${skipped} already present`);

  let users = 0;
  let existing = 0;
  let disabled = 0;
  const usersFile = path.join(dataDir, "system", "users.json");
  const envelope = JSON.parse(await readFile(usersFile, "utf8").catch(() => '{"records":[]}'));
  for (const user of envelope.records ?? []) {
    if (user.disabled) {
      disabled += 1;
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      const inserted = await client.query(
        `insert into "user" (id, name, email, email_verified, role, created_at, updated_at)
         values ($1, $2, $3, false, $4, $5, $6) on conflict do nothing`,
        [user.id, user.email.split("@")[0], user.email, user.role, user.createdAt, user.updatedAt],
      );
      if (inserted.rowCount) {
        await client.query(
          `insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
           values ($1, $2, 'credential', $2, $3, $4, $5)`,
          [randomUUID(), user.id, user.passwordHash, user.createdAt, user.updatedAt],
        );
        users += 1;
      } else {
        existing += 1;
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
  console.info(
    `[import] ${users} account(s) created, ${existing} already present, ${disabled} disabled skipped`,
  );
} finally {
  await pool.end();
}
