import "server-only";

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
        schemaVersion: 1,
      }),
    );
  }
}
