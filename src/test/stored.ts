import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { getStorageDriver } from "@/lib/storage/driver";

/** True when the suite runs on the Postgres driver (TEST_DATABASE_URL set). */
export const usingPostgres = process.env.STORAGE_DRIVER === "postgres";

/**
 * What is actually stored at a location, as text: the file contents for JSON
 * storage, or the stored JSONB row for Postgres. Tests use it to prove that
 * secrets are never at rest in plain text, whatever the driver.
 */
export async function readStored(location: string): Promise<string> {
  if (!usingPostgres) return readFile(location, "utf8");
  const data = await (await getStorageDriver()).read(location);
  return data === undefined ? "" : JSON.stringify(data, null, 2);
}

/** Puts raw data at a location, bypassing repositories (legacy/corrupt fixtures). */
export async function writeStored(location: string, data: string): Promise<void> {
  if (!usingPostgres) {
    await mkdir(path.dirname(location), { recursive: true });
    await writeFile(location, data);
    return;
  }
  await (await getStorageDriver()).write(location, JSON.parse(data));
}

/** Whether anything is stored under a folder. */
export async function folderHasData(folder: string): Promise<boolean> {
  const driver = await getStorageDriver();
  if (driver.name === "json") {
    return (await driver.listChildren(path.dirname(folder))).includes(path.basename(folder));
  }
  return (await driver.listChildren(folder)).length > 0;
}
