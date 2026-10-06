import { access } from "node:fs/promises";

import { writeJsonAtomic } from "./json-file";

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
  const written: string[] = [];
  for (const file of files) {
    if (await exists(file.target)) continue;
    await writeJsonAtomic(file.target, file.envelope);
    written.push(file.target);
  }
  return written;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
