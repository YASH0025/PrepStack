import "server-only";

import { randomUUID } from "node:crypto";

import { decryptOptional, encryptOptional } from "@/lib/services/crypto";

import { type DebriefRepository, JsonDebriefRepository } from "./debrief-repository";
import {
  type Debrief,
  type DebriefInput,
  type DebriefQuestion,
  type DebriefRecord,
} from "./debrief-schemas";
import { type TopicWeakness, weaknessByTopic } from "./domain/debriefs";
import { TrackerError, trackerFor } from "./service";

export interface SavedDebrief {
  debrief: Debrief;
  created: boolean;
  /** Questions the user asked to add to review (partial/missed). */
  reviewQuestions: DebriefQuestion[];
}

/** Private debriefs for ONE user. Note fields are encrypted at rest. */
export class DebriefService {
  constructor(
    private readonly userId: string,
    private readonly repo: DebriefRepository,
  ) {}

  private toDebrief(record: DebriefRecord): Debrief {
    return {
      ...record,
      interviewerFeedback: decryptOptional(record.interviewerFeedback),
      feeling: decryptOptional(record.feeling),
      nextSteps: decryptOptional(record.nextSteps),
      lessons: decryptOptional(record.lessons),
    };
  }

  async get(roundId: string): Promise<Debrief | null> {
    const record = await this.repo.getByRound(roundId);
    return record ? this.toDebrief(record) : null;
  }

  async list(): Promise<Debrief[]> {
    return (await this.repo.list()).map((record) => this.toDebrief(record));
  }

  /** Questions and ratings only (no decryption), for signals and aggregates. */
  async listQuestions(): Promise<Pick<DebriefRecord, "roundId" | "questions">[]> {
    return (await this.repo.list()).map(({ roundId, questions }) => ({ roundId, questions }));
  }

  async roundIdsWithDebrief(): Promise<Set<string>> {
    return new Set((await this.repo.list()).map((record) => record.roundId));
  }

  async weakness(): Promise<Record<string, TopicWeakness>> {
    return weaknessByTopic(await this.repo.list());
  }

  /**
   * Saves the debrief for one of the user's rounds. A round still marked
   * Scheduled is marked Completed (its result stays as it was).
   */
  async save(roundId: string, input: DebriefInput): Promise<SavedDebrief> {
    const tracker = trackerFor(this.userId);
    const round = await tracker.getRound(roundId);
    if (!round) throw new TrackerError("Round not found");
    if (round.status === "CANCELLED" || round.status === "RESCHEDULED") {
      throw new TrackerError("This round did not take place, so it cannot be debriefed");
    }

    const existing = await this.repo.getByRound(roundId);
    const knownIds = new Set(existing?.questions.map((question) => question.id) ?? []);
    const questions: DebriefQuestion[] = input.questions.map((question) => ({
      id: question.id && knownIds.has(question.id) ? question.id : randomUUID(),
      text: question.text,
      topicId: question.topicId,
      topicLabel: question.topicId ? null : question.topicLabel,
      type: question.type,
      selfRating: question.selfRating,
      answerNotes: question.answerNotes,
      linkedStoryId: question.linkedStoryId,
      needsStory: question.linkedStoryId ? false : question.needsStory,
    }));

    const { record, created } = await this.repo.upsert({
      roundId,
      questions,
      codingProblem: input.codingProblem,
      systemDesignPrompt: input.systemDesignPrompt,
      takeHome: input.takeHome,
      interviewerFeedback: encryptOptional(input.interviewerFeedback),
      feeling: encryptOptional(input.feeling),
      nextSteps: encryptOptional(input.nextSteps),
      lessons: encryptOptional(input.lessons),
      overallRating: input.overallRating,
      difficulty: input.difficulty,
      actualDurationMinutes: input.actualDurationMinutes,
      followUpActions: input.followUpActions,
    });

    if (round.status === "SCHEDULED") {
      await tracker.setRoundOutcome(round.id, "COMPLETED", round.result);
    }

    const reviewQuestions = questions.filter(
      (question, index) => input.questions[index]?.addToReview && question.selfRating !== "NAILED",
    );
    return { debrief: this.toDebrief(record), created, reviewQuestions };
  }

  markPublished(roundId: string, reportId: string): Promise<void> {
    return this.repo.addPublishedReport(roundId, reportId);
  }

  unmarkPublished(reportId: string): Promise<void> {
    return this.repo.removePublishedReport(reportId);
  }

  async deleteForRounds(roundIds: string[]): Promise<void> {
    await this.repo.deleteForRounds(roundIds);
  }
}

/** Always scoped to one user's private folder. Pass the authenticated user's id. */
export function debriefsFor(userId: string): DebriefService {
  return new DebriefService(userId, new JsonDebriefRepository(userId));
}
