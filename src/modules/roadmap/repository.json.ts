import "server-only";

import { JsonSingleton } from "@/lib/storage/json-singleton";
import { privatePath } from "@/lib/storage/paths";
import { type NewRecord } from "@/lib/storage/types";

import { type RoadmapRepository } from "./repository";
import { type Roadmap, RoadmapSchema } from "./schemas";

export class JsonRoadmapRepository implements RoadmapRepository {
  private readonly file: JsonSingleton<Roadmap>;

  constructor(userId: string) {
    this.file = new JsonSingleton<Roadmap>({
      filePath: privatePath(userId, "roadmap.json"),
      recordSchema: RoadmapSchema,
      schemaVersion: 1,
    });
  }

  get(): Promise<Roadmap | null> {
    return this.file.get();
  }

  set(input: NewRecord<Roadmap>): Promise<Roadmap> {
    return this.file.set(input);
  }

  mutate(fn: (current: Roadmap | null) => Roadmap | null): Promise<Roadmap | null> {
    return this.file.mutate((current) => {
      const next = fn(current);
      return next ? { ...next, updatedAt: new Date().toISOString() } : next;
    });
  }
}
