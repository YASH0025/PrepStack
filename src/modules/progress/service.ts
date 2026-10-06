import "server-only";

import { type SavedQuestionRepository, type TopicProgressRepository } from "./repository";
import { JsonSavedQuestionRepository, JsonTopicProgressRepository } from "./repository.json";
import { type SavedQuestion, type TopicProgress, type TopicStatus } from "./schemas";

export class ProgressService {
  constructor(
    private readonly progress: TopicProgressRepository,
    private readonly saved: SavedQuestionRepository,
  ) {}

  async all(): Promise<TopicProgress[]> {
    return this.progress.list();
  }

  /** Status per topic id; topics without a record are NOT_STARTED. */
  async statusMap(): Promise<Map<string, TopicStatus>> {
    const records = await this.progress.list();
    return new Map(records.map((record) => [record.topicId, record.status]));
  }

  async statusOf(topicId: string): Promise<TopicStatus> {
    return (await this.statusMap()).get(topicId) ?? "NOT_STARTED";
  }

  setStatus(topicId: string, status: TopicStatus, now = new Date()): Promise<TopicProgress> {
    return this.progress.upsertStatus(topicId, status, now);
  }

  async completedTopicIds(): Promise<string[]> {
    const records = await this.progress.list();
    return records
      .filter((record) => record.status === "COMPLETED")
      .map((record) => record.topicId);
  }

  /** Topics the user flagged as hard or needing revision: a weakness signal. */
  async flaggedTopicIds(): Promise<{ topicId: string; status: TopicStatus }[]> {
    const records = await this.progress.list();
    return records
      .filter((record) => record.status === "DIFFICULT" || record.status === "NEEDS_REVISION")
      .map((record) => ({ topicId: record.topicId, status: record.status }));
  }

  async savedQuestions(): Promise<SavedQuestion[]> {
    const records = await this.saved.list();
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async savedQuestionIds(): Promise<Set<string>> {
    return new Set((await this.saved.list()).map((record) => record.questionId));
  }

  toggleSaved(questionId: string): Promise<boolean> {
    return this.saved.toggle(questionId);
  }

  updateSavedNote(questionId: string, note: string): Promise<SavedQuestion | null> {
    return this.saved.updateNote(questionId, note);
  }
}

export function progressServiceFor(userId: string): ProgressService {
  return new ProgressService(
    new JsonTopicProgressRepository(userId),
    new JsonSavedQuestionRepository(userId),
  );
}
