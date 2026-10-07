import { type NewRecord } from "@/lib/storage/types";

import { type NoticePlan } from "./schemas";

/** One notice plan per user (singleton in the user's private folder). */
export interface NoticePlanRepository {
  get(): Promise<NoticePlan | null>;
  set(input: NewRecord<NoticePlan>): Promise<NoticePlan>;
  clear(): Promise<void>;
}
