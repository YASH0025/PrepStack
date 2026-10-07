import "server-only";

import { randomUUID } from "node:crypto";

import { encrypt } from "@/lib/services/crypto";
import { JsonCollection } from "@/lib/storage/json-collection";
import { privatePath } from "@/lib/storage/paths";
import { JsonRepository } from "@/lib/storage/repository";
import { type Migration } from "@/lib/storage/types";

import {
  type ApplicationRepository,
  type CustomFieldRepository,
  type RoundRepository,
} from "./repository";
import {
  type ApplicationRecord,
  ApplicationRecordSchema,
  type CustomField,
  CustomFieldSchema,
  type RoundRecord,
  RoundRecordSchema,
} from "./schemas";

/**
 * v1 → v2: free-text note fields that were stored in plain text are encrypted
 * at rest (privacy rules: private notes are always encrypted).
 */
function encryptFields(fields: string[]): Migration {
  return (envelope) => {
    const records = (envelope.records as Record<string, unknown>[] | undefined) ?? [];
    return {
      ...envelope,
      records: records.map((record) => {
        const next = { ...record };
        for (const field of fields) {
          const value = next[field];
          if (typeof value === "string" && !value.startsWith("enc:v1:")) {
            next[field] = value === "" ? null : encrypt(value);
          }
        }
        return next;
      }),
    };
  };
}

/** v1 → v2 for rounds: note fields and attachment file names are encrypted. */
const encryptRoundNotes: Migration = (envelope) => {
  const migrated = encryptFields(["cancelReason", "followUpNote"])(envelope);
  const records = (migrated.records as Record<string, unknown>[] | undefined) ?? [];
  return {
    ...migrated,
    records: records.map((record) => ({
      ...record,
      attachments: ((record.attachments as Record<string, unknown>[] | undefined) ?? []).map(
        (attachment) =>
          typeof attachment.fileName === "string" && !attachment.fileName.startsWith("enc:v1:")
            ? { ...attachment, fileName: encrypt(attachment.fileName) }
            : attachment,
      ),
    })),
  };
};

export class JsonApplicationRepository
  extends JsonRepository<ApplicationRecord>
  implements ApplicationRepository
{
  constructor(userId: string) {
    super(
      new JsonCollection<ApplicationRecord>({
        filePath: privatePath(userId, "applications.json"),
        recordSchema: ApplicationRecordSchema,
        schemaVersion: 2,
        migrations: { 1: encryptFields(["outcome"]) },
      }),
    );
  }

  move(
    id: string,
    status: ApplicationRecord["status"],
    order: number,
  ): Promise<ApplicationRecord | null> {
    return this.collection.update(id, { status, kanbanOrder: order });
  }
}

export class JsonRoundRepository extends JsonRepository<RoundRecord> implements RoundRepository {
  constructor(userId: string) {
    super(
      new JsonCollection<RoundRecord>({
        filePath: privatePath(userId, "rounds.json"),
        recordSchema: RoundRecordSchema,
        schemaVersion: 2,
        migrations: { 1: encryptRoundNotes },
      }),
    );
  }

  listForApplication(applicationId: string): Promise<RoundRecord[]> {
    return this.collection.find((round) => round.applicationId === applicationId);
  }

  deleteForApplication(applicationId: string): Promise<number> {
    return this.collection.deleteWhere((round) => round.applicationId === applicationId);
  }

  reschedule(
    oldId: string,
    replacement: Omit<RoundRecord, "id" | "createdAt" | "updatedAt">,
    patchOld: Partial<RoundRecord>,
  ): Promise<{ oldRound: RoundRecord; newRound: RoundRecord } | null> {
    return this.collection.transaction((records) => {
      const old = records.find((round) => round.id === oldId);
      if (!old) return { records, result: null };
      const now = new Date().toISOString();
      const newRound = RoundRecordSchema.parse({
        ...replacement,
        id: randomUUID(),
        rescheduledFromId: oldId,
        createdAt: now,
        updatedAt: now,
      });
      const oldRound = RoundRecordSchema.parse({
        ...old,
        ...patchOld,
        status: "RESCHEDULED",
        result: "NOT_APPLICABLE",
        rescheduledToId: newRound.id,
        updatedAt: now,
      });
      return {
        records: [...records.map((round) => (round.id === oldId ? oldRound : round)), newRound],
        result: { oldRound, newRound },
      };
    });
  }
}

export class JsonCustomFieldRepository
  extends JsonRepository<CustomField>
  implements CustomFieldRepository
{
  constructor(userId: string) {
    super(
      new JsonCollection<CustomField>({
        filePath: privatePath(userId, "custom-fields.json"),
        recordSchema: CustomFieldSchema,
        schemaVersion: 1,
      }),
    );
  }
}
