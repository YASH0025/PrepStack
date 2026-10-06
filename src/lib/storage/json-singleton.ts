import { randomUUID } from "node:crypto";
import { type z } from "zod";

import { withFileLock } from "./file-lock";
import { type EnvelopeSpec, readEnvelope, writeEnvelope } from "./json-file";
import {
  type BaseRecord,
  type MigrationMap,
  type NewRecord,
  type RecordPatch,
  StorageValidationError,
  formatZodIssues,
  singletonFileSchema,
} from "./types";

export interface SingletonOptions<T extends BaseRecord> {
  filePath: string;
  recordSchema: z.ZodType<T>;
  schemaVersion: number;
  migrations?: MigrationMap;
}

type Envelope<T> = { schemaVersion: number; record: T | null };

/** A file holding at most one validated record (e.g. a profile or a roadmap). */
export class JsonSingleton<T extends BaseRecord> {
  private readonly spec: EnvelopeSpec<z.ZodType<Envelope<T>>>;

  constructor(private readonly options: SingletonOptions<T>) {
    this.spec = {
      filePath: options.filePath,
      schema: singletonFileSchema(options.recordSchema) as unknown as z.ZodType<Envelope<T>>,
      schemaVersion: options.schemaVersion,
      migrations: options.migrations,
      empty: () => ({ schemaVersion: options.schemaVersion, record: null }),
    };
  }

  get filePath(): string {
    return this.options.filePath;
  }

  async get(): Promise<T | null> {
    const envelope = await readEnvelope(this.spec);
    return envelope.record;
  }

  /** Replaces the record entirely, keeping id and createdAt if one exists. */
  async set(input: NewRecord<T>): Promise<T> {
    return this.mutate((current) => {
      const now = new Date().toISOString();
      return {
        ...input,
        id: current?.id ?? input.id ?? randomUUID(),
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      } as unknown as T;
    }) as Promise<T>;
  }

  /** Merges into the existing record. Returns null if there is no record yet. */
  async update(patch: RecordPatch<T>): Promise<T | null> {
    return this.mutate((current) => {
      if (!current) return null;
      const copy = { ...patch } as Record<string, unknown>;
      delete copy.id;
      delete copy.createdAt;
      delete copy.updatedAt;
      return { ...current, ...copy, updatedAt: new Date().toISOString() } as T;
    });
  }

  async clear(): Promise<void> {
    await this.mutate(() => null);
  }

  /** Read-modify-write under the file lock. Returning null clears the record. */
  async mutate(fn: (current: T | null) => T | null | Promise<T | null>): Promise<T | null> {
    return withFileLock(this.filePath, async () => {
      const envelope = await readEnvelope(this.spec);
      const next = await fn(envelope.record);
      let validated: T | null = null;
      if (next !== null) {
        const parsed = this.options.recordSchema.safeParse(next);
        if (!parsed.success) {
          throw new StorageValidationError(this.filePath, formatZodIssues(parsed.error));
        }
        validated = parsed.data;
      }
      await writeEnvelope(this.spec, {
        schemaVersion: this.options.schemaVersion,
        record: validated,
      });
      return validated;
    });
  }
}
