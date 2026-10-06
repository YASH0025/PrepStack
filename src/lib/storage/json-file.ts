import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { type z } from "zod";

import { type MigrationMap, StorageValidationError, formatZodIssues } from "./types";

/** Writes JSON atomically: write to a temp file in the same folder, then rename over the target. */
export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, JSON.stringify(data, null, 2) + "\n", "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

/** Reads and parses a JSON file. Returns `undefined` if the file does not exist. */
export async function readJsonRaw(filePath: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new StorageValidationError(filePath, "  - (root): file is not valid JSON");
  }
}

export interface EnvelopeSpec<S extends z.ZodType> {
  filePath: string;
  schema: S;
  schemaVersion: number;
  migrations?: MigrationMap;
  /** Envelope used when the file does not exist yet. */
  empty: () => z.infer<S>;
}

/**
 * Applies migrations from the stored version up to the current one.
 * Returns the upgraded raw envelope and whether anything changed.
 */
export function migrateEnvelope(
  filePath: string,
  raw: unknown,
  currentVersion: number,
  migrations: MigrationMap = {},
): { envelope: unknown; migrated: boolean } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new StorageValidationError(filePath, "  - (root): expected an object envelope");
  }
  let envelope = raw as Record<string, unknown>;
  const stored = envelope.schemaVersion;
  if (typeof stored !== "number" || !Number.isInteger(stored) || stored < 1) {
    throw new StorageValidationError(filePath, "  - schemaVersion: missing or invalid");
  }
  if (stored > currentVersion) {
    throw new StorageValidationError(
      filePath,
      `  - schemaVersion: file is version ${stored}, code supports up to ${currentVersion}`,
    );
  }
  let version = stored;
  while (version < currentVersion) {
    const migrate = migrations[version];
    if (!migrate) {
      throw new StorageValidationError(
        filePath,
        `  - schemaVersion: no migration from version ${version} to ${version + 1}`,
      );
    }
    envelope = { ...migrate(envelope), schemaVersion: version + 1 };
    version += 1;
  }
  return { envelope, migrated: version !== stored };
}

/**
 * Reads, migrates and validates an envelope file. Missing files yield `spec.empty()`.
 * Files upgraded by a migration are written back so the upgrade happens once.
 * Callers that will write afterwards must hold the file lock.
 */
export async function readEnvelope<S extends z.ZodType>(
  spec: EnvelopeSpec<S>,
): Promise<z.infer<S>> {
  const raw = await readJsonRaw(spec.filePath);
  if (raw === undefined) return spec.empty();

  const { envelope, migrated } = migrateEnvelope(
    spec.filePath,
    raw,
    spec.schemaVersion,
    spec.migrations,
  );
  const parsed = spec.schema.safeParse(envelope);
  if (!parsed.success) {
    throw new StorageValidationError(spec.filePath, formatZodIssues(parsed.error));
  }
  if (migrated) {
    await writeJsonAtomic(spec.filePath, parsed.data);
  }
  return parsed.data;
}

/** Validates then atomically writes an envelope. Invalid data is rejected, never written. */
export async function writeEnvelope<S extends z.ZodType>(
  spec: EnvelopeSpec<S>,
  envelope: z.infer<S>,
): Promise<void> {
  const parsed = spec.schema.safeParse(envelope);
  if (!parsed.success) {
    throw new StorageValidationError(spec.filePath, formatZodIssues(parsed.error));
  }
  await writeJsonAtomic(spec.filePath, parsed.data);
}
