import "server-only";

import { z } from "zod";

import { JsonCollection } from "@/lib/storage/json-collection";
import { systemPath } from "@/lib/storage/paths";
import { IdSchema, recordSchema } from "@/lib/storage/types";

export const AuditEntrySchema = recordSchema({
  actorUserId: IdSchema,
  action: z.string().min(1).max(60),
  entityType: z.string().min(1).max(60),
  entityId: z.string().min(1).max(100),
  details: z.string().max(2000),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

const MAX_ENTRIES = 5000;

let auditCollection: JsonCollection<AuditEntry> | null = null;

function collection(): JsonCollection<AuditEntry> {
  auditCollection ??= new JsonCollection<AuditEntry>({
    filePath: systemPath("audit-log.json"),
    recordSchema: AuditEntrySchema,
    schemaVersion: 1,
  });
  return auditCollection;
}

/** Records an admin or moderation action. Keeps the newest MAX_ENTRIES entries. */
export async function audit(entry: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
}): Promise<void> {
  await collection().transaction((records) => {
    const now = new Date().toISOString();
    const created = AuditEntrySchema.parse({
      ...entry,
      details: entry.details ?? "",
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    const next = [...records, created];
    return { records: next.slice(Math.max(0, next.length - MAX_ENTRIES)), result: undefined };
  });
}

export async function listAuditEntries(limit = 100): Promise<AuditEntry[]> {
  const all = await collection().list();
  return all.slice(-limit).reverse();
}
