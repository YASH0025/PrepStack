import { type CrudRepository } from "@/lib/storage/repository";

import { type SavedQuestion, type TopicProgress, type TopicStatus } from "./schemas";

export interface TopicProgressRepository extends CrudRepository<TopicProgress> {
  /** Creates or updates the progress record for a topic. */
  upsertStatus(topicId: string, status: TopicStatus, at: Date): Promise<TopicProgress>;
}

export interface SavedQuestionRepository extends CrudRepository<SavedQuestion> {
  /** Adds the question if absent, removes it if present. Returns the new saved state. */
  toggle(questionId: string): Promise<boolean>;
  updateNote(questionId: string, note: string): Promise<SavedQuestion | null>;
}
