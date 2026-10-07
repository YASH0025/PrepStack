import "server-only";

import { randomUUID } from "node:crypto";

import { fieldCipher } from "@/lib/storage/field-cipher";
import { JsonCollection } from "@/lib/storage/json-collection";
import { privatePath } from "@/lib/storage/paths";
import { type NewRecord } from "@/lib/storage/types";

import { type DebriefRecord, DebriefRecordSchema } from "./debrief-schemas";

/** One debrief per round, in the user's private folder. */
export interface DebriefRepository {
  list(): Promise<DebriefRecord[]>;
  getByRound(roundId: string): Promise<DebriefRecord | null>;
  /** Creates or replaces the debrief for a round, keeping id, createdAt and published ids. */
  upsert(
    input: Omit<NewRecord<DebriefRecord>, "publishedReportIds">,
  ): Promise<{ record: DebriefRecord; created: boolean }>;
  addPublishedReport(roundId: string, reportId: string): Promise<void>;
  removePublishedReport(reportId: string): Promise<void>;
  deleteForRounds(roundIds: string[]): Promise<number>;
}

export class JsonDebriefRepository implements DebriefRepository {
  private readonly collection: JsonCollection<DebriefRecord>;

  constructor(userId: string) {
    this.collection = new JsonCollection<DebriefRecord>({
      filePath: privatePath(userId, "debriefs.json"),
      recordSchema: DebriefRecordSchema,
      schemaVersion: 2,
      // v1 → v2: Answer notes and problem details (feedback etc. are encrypted by the service).
      // Identity migration; the write-back encrypts existing plain text.
      migrations: { 1: (envelope) => envelope },
      cipher: fieldCipher([
        "questions[].answerNotes",
        "codingProblem",
        "systemDesignPrompt",
        "takeHome",
      ]),
    });
  }

  list(): Promise<DebriefRecord[]> {
    return this.collection.list();
  }

  getByRound(roundId: string): Promise<DebriefRecord | null> {
    return this.collection.findOne((record) => record.roundId === roundId);
  }

  upsert(input: Omit<NewRecord<DebriefRecord>, "publishedReportIds">) {
    return this.collection.transaction((records) => {
      const now = new Date().toISOString();
      const index = records.findIndex((record) => record.roundId === input.roundId);
      const current = index >= 0 ? (records[index] as DebriefRecord) : null;
      const record = DebriefRecordSchema.parse({
        ...input,
        id: current?.id ?? randomUUID(),
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
        publishedReportIds: current?.publishedReportIds ?? [],
      });
      const next = [...records];
      if (current) next[index] = record;
      else next.push(record);
      return { records: next, result: { record, created: !current } };
    });
  }

  async addPublishedReport(roundId: string, reportId: string): Promise<void> {
    await this.collection.transaction((records) => {
      const next = records.map((record) =>
        record.roundId === roundId && !record.publishedReportIds.includes(reportId)
          ? {
              ...record,
              publishedReportIds: [...record.publishedReportIds, reportId].slice(-10),
              updatedAt: new Date().toISOString(),
            }
          : record,
      );
      return { records: next, result: undefined };
    });
  }

  async removePublishedReport(reportId: string): Promise<void> {
    await this.collection.transaction((records) => {
      let changed = false;
      const next = records.map((record) => {
        if (!record.publishedReportIds.includes(reportId)) return record;
        changed = true;
        return {
          ...record,
          publishedReportIds: record.publishedReportIds.filter((id) => id !== reportId),
        };
      });
      return { records: changed ? next : records, result: undefined };
    });
  }

  deleteForRounds(roundIds: string[]): Promise<number> {
    const ids = new Set(roundIds);
    return this.collection.deleteWhere((record) => ids.has(record.roundId));
  }
}
