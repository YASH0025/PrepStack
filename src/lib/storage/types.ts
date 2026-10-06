import { z } from "zod";

/** ISO-8601 UTC timestamp, e.g. "2026-10-06T17:30:00.000Z". */
export const IsoDateTimeSchema = z.iso.datetime({ offset: false });

/** Calendar date without time, interpreted in the user's timezone: "yyyy-MM-dd". */
export const LocalDateSchema = z.iso.date();
export type LocalDate = z.infer<typeof LocalDateSchema>;

export const IdSchema = z.uuid();

/** Fields every stored record carries. */
export const BaseRecordSchema = z.object({
  id: IdSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type BaseRecord = z.infer<typeof BaseRecordSchema>;

export type BaseKeys = keyof BaseRecord;

/** Input for creating a record: everything except the base fields (id is optional). */
export type NewRecord<T extends BaseRecord> = Omit<T, BaseKeys> & { id?: string };

/** Input for updating a record: any subset of non-base fields. */
export type RecordPatch<T extends BaseRecord> = Partial<Omit<T, BaseKeys>>;

/**
 * Builds a record schema by extending the base fields.
 * Usage: `const UserSchema = recordSchema({ email: z.email() })`.
 */
export function recordSchema<Shape extends z.ZodRawShape>(shape: Shape) {
  return BaseRecordSchema.extend(shape);
}

/** Envelope for files that hold a list of records. */
export function collectionFileSchema<T extends z.ZodType>(record: T) {
  return z.object({
    schemaVersion: z.number().int().positive(),
    records: z.array(record),
  });
}

/** Envelope for files that hold one record (or nothing yet). */
export function singletonFileSchema<T extends z.ZodType>(record: T) {
  return z.object({
    schemaVersion: z.number().int().positive(),
    record: record.nullable(),
  });
}

/**
 * Upgrades raw file JSON from version N to N+1. Keyed by the version it upgrades FROM.
 * Migrations receive and return the whole envelope.
 */
export type Migration = (envelope: Record<string, unknown>) => Record<string, unknown>;
export type MigrationMap = Readonly<Record<number, Migration>>;

/** Thrown when stored data fails validation; never silently ignored. */
export class StorageValidationError extends Error {
  constructor(
    readonly filePath: string,
    readonly issues: string,
  ) {
    super(`Invalid data in ${filePath}:\n${issues}`);
    this.name = "StorageValidationError";
  }
}

export function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}
