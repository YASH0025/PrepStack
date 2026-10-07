import "server-only";

import { fieldCipher } from "@/lib/storage/field-cipher";
import { JsonCollection } from "@/lib/storage/json-collection";
import { privatePath } from "@/lib/storage/paths";
import { JsonRepository } from "@/lib/storage/repository";

import { type StoryRepository } from "./repository";
import { type Story, StorySchema } from "./schemas";

export class JsonStoryRepository extends JsonRepository<Story> implements StoryRepository {
  constructor(userId: string) {
    super(
      new JsonCollection<Story>({
        filePath: privatePath(userId, "stories.json"),
        recordSchema: StorySchema,
        schemaVersion: 2,
        // v1 → v2: Story titles and STAR text are the user's private notes about real people and employers.
        // Identity migration; the write-back encrypts existing plain text.
        migrations: { 1: (envelope) => envelope },
        cipher: fieldCipher([
          "title",
          "situation",
          "task",
          "action",
          "result",
          "impact",
          "projectRef",
        ]),
      }),
    );
  }
}
