import "server-only";

import { PEOPLE_ROUND_TYPES } from "@/lib/domain";
import { todayIn } from "@/lib/local-date";
import { getProfile } from "@/modules/profile/service";
import { trackerFor } from "@/modules/tracker/service";

import {
  type QueuePriority,
  type ReviewStats,
  applyRating,
  buildQueue,
  reviewStats,
} from "./domain/scheduler";
import { type ReviewCardRepository } from "./repository";
import { JsonReviewCardRepository } from "./repository.json";
import { type CardSource, type ManualCardInput, type Rating, type ReviewCard } from "./schemas";

export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

export interface NewCardFromSource {
  sourceType: Exclude<CardSource, "MANUAL">;
  sourceId: string;
  topicId: string | null;
  prompt: string;
  answer: string;
}

const PRIORITY_WINDOW_MS = 3 * 24 * 60 * 60_000;

export class ReviewService {
  constructor(
    private readonly userId: string,
    private readonly repo: ReviewCardRepository,
  ) {}

  private async timezone(): Promise<string> {
    return (await getProfile(this.userId))?.timezone ?? "UTC";
  }

  async list(): Promise<ReviewCard[]> {
    const cards = await this.repo.list();
    return cards.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
  }

  /** Adds a card for a source; does nothing if one already exists. New cards are due today. */
  async addFromSource(
    input: NewCardFromSource,
    now: Date = new Date(),
  ): Promise<{ card: ReviewCard; created: boolean }> {
    return this.repo.createUnique({
      ...input,
      prompt: input.prompt.slice(0, 2000),
      answer: input.answer.slice(0, 10_000),
      box: 1,
      dueDate: todayIn(await this.timezone(), now),
      mastered: false,
      lastReviewedAt: null,
      history: [],
    });
  }

  async addManual(input: ManualCardInput, now: Date = new Date()): Promise<ReviewCard> {
    const { card } = await this.repo.createUnique({
      sourceType: "MANUAL",
      sourceId: null,
      topicId: null,
      prompt: input.prompt,
      answer: input.answer,
      box: 1,
      dueDate: todayIn(await this.timezone(), now),
      mastered: false,
      lastReviewedAt: null,
      history: [],
    });
    return card;
  }

  /** Source ids that already have a card, for "Added to review" states. */
  async sourceIds(sourceType: CardSource): Promise<Set<string>> {
    const cards = await this.repo.list();
    return new Set(
      cards
        .filter((card) => card.sourceType === sourceType && card.sourceId)
        .map((card) => card.sourceId as string),
    );
  }

  async review(id: string, rating: Rating, now: Date = new Date()): Promise<ReviewCard> {
    const card = await this.repo.getById(id);
    if (!card) throw new ReviewError("Card not found");
    const today = todayIn(await this.timezone(), now);
    const next = applyRating(card, rating, today);
    const updated = await this.repo.update(id, {
      ...next,
      lastReviewedAt: now.toISOString(),
      history: [
        ...card.history,
        { at: now.toISOString(), day: today, rating, fromBox: card.box, toBox: next.box },
      ].slice(-200),
    });
    return updated as ReviewCard;
  }

  /** Makes a card due today again (e.g. "review this now"). */
  async resetDue(id: string, now: Date = new Date()): Promise<void> {
    await this.repo.update(id, { dueDate: todayIn(await this.timezone(), now) });
  }

  delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  /** What to prioritise when an interview is within three days. */
  async priority(
    now: Date = new Date(),
  ): Promise<{ priority: QueuePriority; reason: string | null }> {
    const tracker = trackerFor(this.userId);
    const [rounds, applications] = await Promise.all([
      tracker.listRounds(),
      tracker.listApplications(),
    ]);
    const next = rounds
      .filter(
        (round) =>
          round.status === "SCHEDULED" &&
          new Date(round.startUtc).getTime() > now.getTime() &&
          new Date(round.startUtc).getTime() - now.getTime() <= PRIORITY_WINDOW_MS,
      )
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc))[0];
    if (!next) return { priority: null, reason: null };
    const company = applications.find((app) => app.id === next.applicationId)?.companyName;
    const people = PEOPLE_ROUND_TYPES.includes(next.type);
    return {
      priority: people ? "STORIES" : "TECHNICAL",
      reason: `${company ?? "An interview"} is within 3 days, so ${
        people ? "story cards" : "technical cards"
      } come first.`,
    };
  }

  async queue(now: Date = new Date()): Promise<{ cards: ReviewCard[]; reason: string | null }> {
    const [cards, profile, { priority, reason }] = await Promise.all([
      this.repo.list(),
      getProfile(this.userId),
      this.priority(now),
    ]);
    const today = todayIn(profile?.timezone ?? "UTC", now);
    return {
      cards: buildQueue(cards, today, { cap: profile?.reviewDailyCap ?? 20, priority }),
      reason,
    };
  }

  async stats(now: Date = new Date()): Promise<ReviewStats> {
    const [cards, timezone] = await Promise.all([this.repo.list(), this.timezone()]);
    return reviewStats(cards, todayIn(timezone, now));
  }
}

/** Always scoped to one user's private folder. Pass the authenticated user's id. */
export function reviewServiceFor(userId: string): ReviewService {
  return new ReviewService(userId, new JsonReviewCardRepository(userId));
}
