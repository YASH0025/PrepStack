import { getStorageDriver } from "./driver";

export interface SeedFile {
  /** Absolute target path (from paths.ts). */
  target: string;
  /** Full envelope to write, e.g. `{ schemaVersion: 1, records: [...] }`. */
  envelope: unknown;
}

/**
 * Copies seed envelopes into the data folder, only for files that do not exist yet.
 * Existing data is never overwritten. Returns the targets that were written.
 */
export async function ensureSeeded(files: SeedFile[]): Promise<string[]> {
  const driver = await getStorageDriver();
  const written: string[] = [];
  for (const file of files) {
    if (await driver.exists(file.target)) continue;
    await driver.write(file.target, file.envelope);
    written.push(file.target);
  }
  return written;
}
