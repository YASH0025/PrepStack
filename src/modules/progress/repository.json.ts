import "server-only";

import { randomUUID } from "node:crypto";

import { JsonCollection } from "@/lib/storage/json-collection";
import { privatePath } from "@/lib/storage/paths";
import { JsonRepository } from "@/lib/storage/repository";

import { type SavedQuestionRepository, type TopicProgressRepository } from "./repository";
import {
  type SavedQuestion,
  SavedQuestionSchema,
  type TopicProgress,
  TopicProgressSchema,
  type TopicStatus,
} from "./schemas";

export class JsonTopicProgressRepository
  extends JsonRepository<TopicProgress>
  implements TopicProgressRepository
{
  constructor(userId: string) {
    super(
      new JsonCollection<TopicProgress>({
        filePath: privatePath(userId, "progress.json"),
        recordSchema: TopicProgressSchema,
        schemaVersion: 1,
      }),
    );
  }

  upsertStatus(topicId: string, status: TopicStatus, at: Date): Promise<TopicProgress> {
    return this.collection.transaction((records) => {
      const stamp = at.toISOString();
      const existing = records.find((record) => record.topicId === topicId);
      const studied = status === "NOT_STARTED" ? (existing?.lastStudiedAt ?? null) : stamp;
      if (existing) {
        const updated = TopicProgressSchema.parse({
          ...existing,
          status,
          lastStudiedAt: studied,
          updatedAt: stamp,
        });
        return {
          records: records.map((record) => (record.id === existing.id ? updated : record)),
          result: updated,
        };
      }
      const created = TopicProgressSchema.parse({
        id: randomUUID(),
        topicId,
        status,
        lastStudiedAt: studied,
        createdAt: stamp,
        updatedAt: stamp,
      });
      return { records: [...records, created], result: created };
    });
  }
}

export class JsonSavedQuestionRepository
  extends JsonRepository<SavedQuestion>
  implements SavedQuestionRepository
{
  constructor(userId: string) {
    super(
      new JsonCollection<SavedQuestion>({
        filePath: privatePath(userId, "saved-questions.json"),
        recordSchema: SavedQuestionSchema,
        schemaVersion: 1,
      }),
    );
  }

  toggle(questionId: string): Promise<boolean> {
    return this.collection.transaction((records) => {
      if (records.some((record) => record.questionId === questionId)) {
        return {
          records: records.filter((record) => record.questionId !== questionId),
          result: false,
        };
      }
      const now = new Date().toISOString();
      const created = SavedQuestionSchema.parse({
        id: randomUUID(),
        questionId,
        note: "",
        createdAt: now,
        updatedAt: now,
      });
      return { records: [...records, created], result: true };
    });
  }

  async updateNote(questionId: string, note: string): Promise<SavedQuestion | null> {
    const existing = await this.collection.findOne((record) => record.questionId === questionId);
    if (!existing) return null;
    return this.collection.update(existing.id, { note });
  }
}
