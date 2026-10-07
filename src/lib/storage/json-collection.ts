import { randomUUID } from "node:crypto";
import { type z } from "zod";

import { type FieldCipher } from "./field-cipher";
import { withFileLock } from "./file-lock";
import { type EnvelopeSpec, readEnvelope, writeEnvelope } from "./json-file";
import {
  type BaseRecord,
  type MigrationMap,
  type NewRecord,
  type RecordPatch,
  StorageValidationError,
  collectionFileSchema,
  formatZodIssues,
} from "./types";

export interface CollectionOptions<T extends BaseRecord> {
  filePath: string;
  recordSchema: z.ZodType<T>;
  schemaVersion: number;
  migrations?: MigrationMap;
  /** Encrypts the named string fields at rest (see field-cipher.ts). */
  cipher?: FieldCipher;
}

/**
 * A validated list of records stored in one JSON file.
 * Every read and write goes through Zod; every write is atomic and serialized per file.
 */
export class JsonCollection<T extends BaseRecord> {
  private readonly spec: EnvelopeSpec<z.ZodType<{ schemaVersion: number; records: T[] }>>;

  constructor(private readonly options: CollectionOptions<T>) {
    const schema = collectionFileSchema(options.recordSchema) as unknown as z.ZodType<{
      schemaVersion: number;
      records: T[];
    }>;
    this.spec = {
      filePath: options.filePath,
      schema,
      schemaVersion: options.schemaVersion,
      migrations: options.migrations,
      empty: () => ({ schemaVersion: options.schemaVersion, records: [] }),
      ...(options.cipher ? cipherHooks(options.cipher) : {}),
    };
  }

  get filePath(): string {
    return this.options.filePath;
  }

  async list(): Promise<T[]> {
    const envelope = await readEnvelope(this.spec);
    return envelope.records;
  }

  async getById(id: string): Promise<T | null> {
    const records = await this.list();
    return records.find((record) => record.id === id) ?? null;
  }

  async find(predicate: (record: T) => boolean): Promise<T[]> {
    const records = await this.list();
    return records.filter(predicate);
  }

  async findOne(predicate: (record: T) => boolean): Promise<T | null> {
    const records = await this.list();
    return records.find(predicate) ?? null;
  }

  async create(input: NewRecord<T>): Promise<T> {
    const [created] = await this.createMany([input]);
    return created as T;
  }

  async createMany(inputs: NewRecord<T>[]): Promise<T[]> {
    return this.transaction((records) => {
      const now = new Date().toISOString();
      const created = inputs.map((input) =>
        this.validate({ ...input, id: input.id ?? randomUUID(), createdAt: now, updatedAt: now }),
      );
      for (const record of created) {
        if (records.some((existing) => existing.id === record.id)) {
          throw new StorageValidationError(this.filePath, `  - id: duplicate id ${record.id}`);
        }
      }
      return { records: [...records, ...created], result: created };
    });
  }

  /** Merges `patch` into the record. Returns null if the id does not exist. */
  async update(id: string, patch: RecordPatch<T>): Promise<T | null> {
    return this.transaction((records) => {
      const index = records.findIndex((record) => record.id === id);
      const current = records[index];
      if (index === -1 || !current) return { records, result: null };
      const updated = this.validate({
        ...current,
        ...stripBaseFields(patch),
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      });
      const next = [...records];
      next[index] = updated;
      return { records: next, result: updated };
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.transaction((records) => {
      const next = records.filter((record) => record.id !== id);
      return { records: next, result: next.length !== records.length };
    });
  }

  async deleteWhere(predicate: (record: T) => boolean): Promise<number> {
    return this.transaction((records) => {
      const next = records.filter((record) => !predicate(record));
      return { records: next, result: records.length - next.length };
    });
  }

  /**
   * Runs a read-modify-write under the file lock. `fn` receives the current
   * records and returns the new list plus a result. The new list is validated
   * as a whole before anything is written.
   */
  async transaction<R>(
    fn: (records: T[]) => { records: T[]; result: R } | Promise<{ records: T[]; result: R }>,
  ): Promise<R> {
    return withFileLock(this.filePath, async () => {
      const envelope = await readEnvelope(this.spec);
      const { records, result } = await fn(envelope.records);
      if (records !== envelope.records) {
        await writeEnvelope(this.spec, { schemaVersion: this.options.schemaVersion, records });
      }
      return result;
    });
  }

  private validate(candidate: unknown): T {
    const parsed = this.options.recordSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new StorageValidationError(this.filePath, formatZodIssues(parsed.error));
    }
    return parsed.data;
  }
}

function stripBaseFields<P extends object>(patch: P): P {
  const copy = { ...patch } as Record<string, unknown>;
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy as P;
}

function cipherHooks(cipher: FieldCipher) {
  const withRecords = (envelope: unknown, fn: (records: unknown[]) => unknown[]) => {
    const value = envelope as { records?: unknown };
    return Array.isArray(value.records) ? { ...value, records: fn(value.records) } : envelope;
  };
  return {
    decode: (envelope: unknown) => withRecords(envelope, cipher.decodeRecords),
    encode: (envelope: unknown) => withRecords(envelope, cipher.encodeRecords),
  };
}
