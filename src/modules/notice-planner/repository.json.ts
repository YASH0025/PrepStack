import "server-only";

import { JsonSingleton } from "@/lib/storage/json-singleton";
import { privatePath } from "@/lib/storage/paths";
import { type NewRecord } from "@/lib/storage/types";

import { type NoticePlanRepository } from "./repository";
import { type NoticePlan, NoticePlanSchema } from "./schemas";

export class JsonNoticePlanRepository implements NoticePlanRepository {
  private readonly file: JsonSingleton<NoticePlan>;

  constructor(userId: string) {
    this.file = new JsonSingleton<NoticePlan>({
      filePath: privatePath(userId, "notice-plan.json"),
      recordSchema: NoticePlanSchema,
      schemaVersion: 1,
    });
  }

  get(): Promise<NoticePlan | null> {
    return this.file.get();
  }

  set(input: NewRecord<NoticePlan>): Promise<NoticePlan> {
    return this.file.set(input);
  }

  clear(): Promise<void> {
    return this.file.clear();
  }
}
