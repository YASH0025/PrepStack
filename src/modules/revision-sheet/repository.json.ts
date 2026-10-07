import "server-only";

import { randomUUID } from "node:crypto";

import { JsonCollection } from "@/lib/storage/json-collection";
import { privatePath } from "@/lib/storage/paths";

import { type RevisionSheetStateRepository } from "./repository";
import { type RevisionSheetState, RevisionSheetStateSchema } from "./schemas";

export class JsonRevisionSheetStateRepository implements RevisionSheetStateRepository {
  private readonly collection: JsonCollection<RevisionSheetState>;

  constructor(userId: string) {
    this.collection = new JsonCollection<RevisionSheetState>({
      filePath: privatePath(userId, "revision-sheet-state.json"),
      recordSchema: RevisionSheetStateSchema,
      schemaVersion: 1,
    });
  }

  list(): Promise<RevisionSheetState[]> {
    return this.collection.list();
  }

  async checkedKeys(roundId: string): Promise<string[]> {
    return (
      (await this.collection.findOne((record) => record.roundId === roundId))?.checkedKeys ?? []
    );
  }

  setChecked(roundId: string, key: string, checked: boolean): Promise<string[]> {
    return this.collection.transaction((records) => {
      const now = new Date().toISOString();
      const index = records.findIndex((record) => record.roundId === roundId);
      const current = index >= 0 ? (records[index] as RevisionSheetState) : null;
      const keys = new Set(current?.checkedKeys ?? []);
      if (checked) keys.add(key);
      else keys.delete(key);
      const next = RevisionSheetStateSchema.parse({
        id: current?.id ?? randomUUID(),
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
        roundId,
        checkedKeys: [...keys].slice(-300),
      });
      const updated = [...records];
      if (index >= 0) updated[index] = next;
      else updated.push(next);
      return { records: updated, result: next.checkedKeys };
    });
  }

  async deleteForRounds(roundIds: string[]): Promise<void> {
    const ids = new Set(roundIds);
    await this.collection.deleteWhere((record) => ids.has(record.roundId));
  }
}
