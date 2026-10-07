import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";

import { eq, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { type PoolClient } from "pg";

import { getDb, getPool } from "@/lib/db/client";
import { storageFiles } from "@/lib/db/schema";

import { type StorageDriver } from "../driver";
import { dataRoot } from "../paths";

interface Transaction {
  client: PoolClient;
  locked: Set<string>;
}

/**
 * Envelopes as JSONB rows. A lock is a transaction holding a Postgres
 * advisory lock on the key, so it also works across several app instances;
 * reads and writes inside the lock use that transaction.
 */
export class PostgresDriver implements StorageDriver {
  readonly name = "postgres" as const;
  private readonly tx = new AsyncLocalStorage<Transaction>();

  /** "…/data/private/<id>/rounds.json" → "private/<id>/rounds.json". */
  private key(location: string): string {
    const relative = path.relative(dataRoot(), location).split(path.sep).join("/");
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Storage location outside the data root");
    }
    return relative;
  }

  private db() {
    const current = this.tx.getStore();
    return current ? drizzle(current.client) : getDb();
  }

  async read(location: string): Promise<unknown> {
    const [row] = await this.db()
      .select({ data: storageFiles.data })
      .from(storageFiles)
      .where(eq(storageFiles.key, this.key(location)));
    return row?.data;
  }

  async write(location: string, data: unknown): Promise<void> {
    const key = this.key(location);
    await this.db()
      .insert(storageFiles)
      .values({ key, data })
      .onConflictDoUpdate({ target: storageFiles.key, set: { data, updatedAt: new Date() } });
  }

  async exists(location: string): Promise<boolean> {
    const [row] = await this.db()
      .select({ key: storageFiles.key })
      .from(storageFiles)
      .where(eq(storageFiles.key, this.key(location)));
    return Boolean(row);
  }

  async withLock<T>(location: string, fn: () => Promise<T>): Promise<T> {
    const key = this.key(location);
    const current = this.tx.getStore();
    if (current) {
      // Nested lock inside an open transaction: take the extra key on the same connection.
      if (!current.locked.has(key)) {
        await current.client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
        current.locked.add(key);
      }
      return fn();
    }
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
      const result = await this.tx.run({ client, locked: new Set([key]) }, fn);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteTree(folder: string): Promise<void> {
    const prefix = `${this.key(folder)}/`;
    await this.db()
      .delete(storageFiles)
      .where(like(storageFiles.key, `${escapeLike(prefix)}%`));
  }

  async listChildren(folder: string): Promise<string[]> {
    const prefix = `${this.key(folder)}/`;
    const rows = await this.db()
      .select({
        child: sql<string>`split_part(substr(${storageFiles.key}, ${prefix.length + 1}), '/', 1)`,
      })
      .from(storageFiles)
      .where(like(storageFiles.key, `${escapeLike(prefix)}%`))
      .groupBy(sql`1`);
    return rows.map((row) => row.child).filter(Boolean);
  }

  async health(): Promise<boolean> {
    try {
      await getPool().query("select 1");
      return true;
    } catch {
      return false;
    }
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
