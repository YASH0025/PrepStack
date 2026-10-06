import "server-only";

import { randomUUID } from "node:crypto";

import { JsonCollection } from "@/lib/storage/json-collection";
import { privatePath } from "@/lib/storage/paths";
import { JsonRepository } from "@/lib/storage/repository";

import { type NotificationRepository } from "./repository";
import { type NewNotification, type Notification, NotificationSchema } from "./schemas";

export class JsonNotificationRepository
  extends JsonRepository<Notification>
  implements NotificationRepository
{
  constructor(userId: string) {
    super(
      new JsonCollection<Notification>({
        filePath: privatePath(userId, "notifications.json"),
        recordSchema: NotificationSchema,
        schemaVersion: 1,
      }),
    );
  }

  createIfNew(input: NewNotification): Promise<Notification | null> {
    return this.collection.transaction((records) => {
      if (records.some((record) => record.dedupeKey === input.dedupeKey)) {
        return { records, result: null };
      }
      const now = new Date().toISOString();
      const created = NotificationSchema.parse({
        ...input,
        id: randomUUID(),
        readAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return { records: [...records, created], result: created };
    });
  }

  markRead(id: string, at: Date): Promise<Notification | null> {
    return this.collection.update(id, { readAt: at.toISOString() });
  }

  markAllRead(at: Date): Promise<number> {
    return this.collection.transaction((records) => {
      let changed = 0;
      const stamp = at.toISOString();
      const next = records.map((record) => {
        if (record.readAt) return record;
        changed += 1;
        return { ...record, readAt: stamp, updatedAt: stamp };
      });
      return { records: changed ? next : records, result: changed };
    });
  }

  prune(keep: number): Promise<number> {
    return this.collection.transaction((records) => {
      if (records.length <= keep) return { records, result: 0 };
      const newestFirst = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const kept = new Set(newestFirst.slice(0, keep).map((record) => record.id));
      // Unread notifications are never pruned.
      const next = records.filter((record) => kept.has(record.id) || !record.readAt);
      return { records: next, result: records.length - next.length };
    });
  }
}
