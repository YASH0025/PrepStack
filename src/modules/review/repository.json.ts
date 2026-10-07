import "server-only";

import { randomUUID } from "node:crypto";

import { fieldCipher } from "@/lib/storage/field-cipher";
import { JsonCollection } from "@/lib/storage/json-collection";
import { privatePath } from "@/lib/storage/paths";
import { JsonRepository } from "@/lib/storage/repository";
import { type NewRecord } from "@/lib/storage/types";

import { type ReviewCardRepository } from "./repository";
import { type ReviewCard, ReviewCardSchema } from "./schemas";

export class JsonReviewCardRepository
  extends JsonRepository<ReviewCard>
  implements ReviewCardRepository
{
  constructor(userId: string) {
    super(
      new JsonCollection<ReviewCard>({
        filePath: privatePath(userId, "review-cards.json"),
        recordSchema: ReviewCardSchema,
        schemaVersion: 2,
        // v1 → v2: Cards copy answers from debriefs and stories, so they are encrypted too.
        // Identity migration; the write-back encrypts existing plain text.
        migrations: { 1: (envelope) => envelope },
        cipher: fieldCipher(["prompt", "answer"]),
      }),
    );
  }

  createUnique(input: NewRecord<ReviewCard>) {
    return this.collection.transaction((records) => {
      if (input.sourceId !== null) {
        const existing = records.find(
          (record) => record.sourceType === input.sourceType && record.sourceId === input.sourceId,
        );
        if (existing) return { records, result: { card: existing, created: false } };
      }
      const now = new Date().toISOString();
      const card = ReviewCardSchema.parse({
        ...input,
        id: input.id ?? randomUUID(),
        createdAt: now,
        updatedAt: now,
      });
      return { records: [...records, card], result: { card, created: true } };
    });
  }
}
