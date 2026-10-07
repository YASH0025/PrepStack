import "server-only";

import { env } from "@/lib/env";

/**
 * Where envelopes live. Every storage helper (collections, singletons, seed,
 * account deletion, system job listing) goes through this interface, so the
 * repositories above it are identical for JSON files and PostgreSQL.
 *
 * Locations are the absolute paths produced by paths.ts; the Postgres driver
 * turns them into keys relative to DATA_DIR ("private/<userId>/rounds.json").
 */
export interface StorageDriver {
  readonly name: "json" | "postgres";
  /** Parsed envelope, or undefined if nothing is stored there yet. */
  read(location: string): Promise<unknown>;
  write(location: string, data: unknown): Promise<void>;
  exists(location: string): Promise<boolean>;
  /** Serializes read-modify-write cycles on one location (reads/writes inside share it). */
  withLock<T>(location: string, fn: () => Promise<T>): Promise<T>;
  /** Deletes everything stored under a folder (account deletion). */
  deleteTree(folder: string): Promise<void>;
  /** Names of the direct children of a folder (system job listing). */
  listChildren(folder: string): Promise<string[]>;
  /** True when storage is reachable and writable. */
  health(): Promise<boolean>;
}

let driver: StorageDriver | null = null;

export async function getStorageDriver(): Promise<StorageDriver> {
  if (driver) return driver;
  driver =
    env.STORAGE_DRIVER === "postgres"
      ? new (await import("./drivers/postgres")).PostgresDriver()
      : new (await import("./drivers/json")).JsonFileDriver();
  return driver;
}

/** Tests only: swap the driver. */
export function setStorageDriverForTests(next: StorageDriver | null): void {
  driver = next;
}
